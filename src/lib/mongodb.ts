import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uri?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

let lastConnectionDiagnostic: { code: string; message: string } | null = null;

export function getLastMongoDiagnostic(): { code: string; message: string } | null {
  return lastConnectionDiagnostic;
}

export function sanitizeMongoUri(raw?: string): string | undefined {
  if (!raw) return undefined;
  return raw.trim().replace(/^["'\\]+|["'\\]+$/g, "").trim();
}

export interface MongoDiagnostic {
  isConfigured: boolean;
  isValid: boolean;
  code?: string;
  message: string;
}

export function diagnoseMongoUri(rawUri?: string): MongoDiagnostic {
  const sanitized = sanitizeMongoUri(rawUri);
  if (!sanitized) {
    return {
      isConfigured: false,
      isValid: false,
      code: "ERR_CONFIG_MISSING",
      message: "MONGODB_URI environment variable is not configured.",
    };
  }

  // Check for unreplaced template placeholders
  if (
    sanitized.includes("<cluster-host>") ||
    sanitized.includes("<username>") ||
    sanitized.includes("<password>") ||
    sanitized.includes("<") ||
    sanitized.includes(">")
  ) {
    return {
      isConfigured: true,
      isValid: false,
      code: "ERR_CONFIG_PLACEHOLDER",
      message:
        "MONGODB_URI contains unreplaced template placeholders (e.g. <cluster-host>). Update MONGODB_URI in Vercel with your actual Atlas cluster hostname (personal-bank.0ov7umc.mongodb.net) and credentials.",
    };
  }

  if (!sanitized.startsWith("mongodb://") && !sanitized.startsWith("mongodb+srv://")) {
    return {
      isConfigured: true,
      isValid: false,
      code: "ERR_CONFIG_INVALID_SCHEME",
      message:
        "MONGODB_URI must begin with 'mongodb+srv://' or 'mongodb://'. Please verify the connection string format.",
    };
  }

  return {
    isConfigured: true,
    isValid: true,
    message: "MONGODB_URI format is valid.",
  };
}

export function classifyMongoError(error: unknown): { code: string; message: string } {
  const errStr = String(error instanceof Error ? error.message : error || "");
  const errCode = (error as any)?.code;

  if (
    errStr.includes("EBADNAME") ||
    errStr.includes("querySrv EBADNAME") ||
    errStr.includes("ENOTFOUND")
  ) {
    return {
      code: "ERR_DNS_RESOLUTION",
      message:
        "DNS lookup failed for MongoDB Atlas cluster host. Ensure your Vercel MONGODB_URI has the correct cluster hostname (personal-bank.0ov7umc.mongodb.net) with no extra spaces, quotes, or angle brackets.",
    };
  }

  if (
    errStr.includes("Authentication failed") ||
    errStr.includes("bad auth") ||
    errCode === 8000
  ) {
    return {
      code: "ERR_AUTH_FAILED",
      message:
        "MongoDB Atlas authentication failed. Please check your database username and password in Vercel MONGODB_URI.",
    };
  }

  if (
    errStr.includes("MongoServerSelectionError") ||
    errStr.includes("MongooseServerSelectionError") ||
    errStr.includes("ECONNREFUSED") ||
    errStr.includes("connection closed")
  ) {
    return {
      code: "ERR_NETWORK_IP_BLOCKED",
      message:
        "Cannot reach MongoDB Atlas cluster. Please ensure 0.0.0.0/0 is added to MongoDB Atlas Network Access (IP Access List) so Vercel serverless functions can connect.",
    };
  }

  if (errStr.includes("timed out") || errStr.includes("ETIMEDOUT")) {
    return {
      code: "ERR_CONNECTION_TIMEOUT",
      message:
        "MongoDB Atlas connection timed out after 15 seconds. Please check cluster health and network connectivity.",
    };
  }

  return {
    code: "ERR_DATABASE_UNAVAILABLE",
    message: "Cloud database is currently unavailable. Please verify MONGODB_URI in Vercel settings.",
  };
}

/**
 * Returns the active MongoDB URI based on environment:
 * - Vercel Preview Deployments: Uses MONGODB_URI_TEST if defined (otherwise falls back to MONGODB_URI)
 * - Test Runs (NODE_ENV=test): Uses MONGODB_URI_TEST if defined
 * - Production Deployments: Strictly uses MONGODB_URI
 */
export function getMongoUri(): string | undefined {
  const isPreviewOrTest =
    process.env.NODE_ENV === "test" ||
    process.env.VERCEL_ENV === "preview";

  const raw = (isPreviewOrTest && process.env.MONGODB_URI_TEST)
    ? process.env.MONGODB_URI_TEST
    : process.env.MONGODB_URI;

  return sanitizeMongoUri(raw);
}

export async function connectToDatabase(customUri?: string): Promise<typeof mongoose | null> {
  const uri = sanitizeMongoUri(customUri) || getMongoUri();
  if (!uri) {
    lastConnectionDiagnostic = {
      code: "ERR_CONFIG_MISSING",
      message: "MONGODB_URI environment variable is not configured.",
    };
    return null;
  }

  // Preflight validation for placeholders or invalid scheme
  const preflight = diagnoseMongoUri(uri);
  if (!preflight.isValid) {
    lastConnectionDiagnostic = {
      code: preflight.code || "ERR_CONFIG_INVALID",
      message: preflight.message,
    };
    return null;
  }

  // If connection is cached, active and connected to the exact same URI, reuse it
  if (!customUri && cached.conn && cached.conn.connection.readyState === 1 && cached.uri === uri) {
    lastConnectionDiagnostic = null;
    return cached.conn;
  }

  // If cached connection was for a different URI or disconnected, reset cache
  if (cached.conn && (cached.uri !== uri || cached.conn.connection.readyState !== 1)) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise || customUri) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
    };

    const promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      cached.uri = uri;
      return mongooseInstance;
    });

    if (customUri) {
      return promise;
    }
    cached.promise = promise;
  }

  try {
    cached.conn = await cached.promise;
    cached.uri = uri;
    lastConnectionDiagnostic = null;
  } catch (e) {
    cached.promise = null;
    cached.uri = undefined;
    lastConnectionDiagnostic = classifyMongoError(e);
    console.error(
      "MongoDB Atlas Connection Error [" +
        lastConnectionDiagnostic.code +
        "]:",
      lastConnectionDiagnostic.message
    );
    return null;
  }

  return cached.conn;
}

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(customUri?: string): Promise<typeof mongoose | null> {
  // During tests, prefer MONGODB_URI_TEST if present; otherwise default strictly to production MONGODB_URI
  const testUri = process.env.NODE_ENV === "test" ? process.env.MONGODB_URI_TEST : undefined;
  const uri = customUri || testUri || process.env.MONGODB_URI;
  if (!uri) {
    // Graceful offline / local mode when MONGODB_URI is not set
    return null;
  }

  if (!customUri && cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise || customUri) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    };

    const promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });

    if (customUri) {
      return promise;
    }
    cached.promise = promise;
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("MongoDB Atlas Connection Error:", e);
    return null;
  }

  return cached.conn;
}

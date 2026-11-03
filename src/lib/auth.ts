import { RECOVERY_ALPHABET } from "./constants";

const PBKDF2_ITERATIONS = 150_000;

function getCrypto(): Crypto {
  if (typeof globalThis.crypto === "undefined") {
    throw new Error("Secure crypto is not available in this browser.");
  }
  return globalThis.crypto;
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function randomHex(bytes = 32): string {
  return Array.from(randomBytes(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function randomId(prefix = ""): string {
  const cryptoObject = getCrypto();
  const id =
    typeof cryptoObject.randomUUID === "function"
      ? cryptoObject.randomUUID()
      : `${Date.now().toString(36)}-${randomHex(8)}`;
  return prefix ? `${prefix}_${id}` : id;
}

export function createSalt(): string {
  return bytesToBase64(randomBytes(16));
}

export async function hashSecret(secret: string, saltBase64: string): Promise<string> {
  const cryptoObject = getCrypto();
  const keyMaterial = await cryptoObject.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await cryptoObject.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(saltBase64) as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

export function generateRecoveryCode(): string {
  const bytes = randomBytes(12);
  const characters = Array.from(bytes)
    .map((byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length])
    .join("");
  return characters.match(/.{1,4}/g)?.join("-") ?? characters;
}

export function normalizeRecoveryCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function isRecoveryCodeFormat(value: string): boolean {
  return normalizeRecoveryCode(value).length === 12;
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createPinRecord(pin: string): Promise<{
  pinSalt: string;
  pinHash: string;
  pinLength: number;
}> {
  const pinSalt = createSalt();
  return {
    pinSalt,
    pinHash: await hashSecret(pin, pinSalt),
    pinLength: pin.length,
  };
}

export async function createRecoveryRecord(code: string): Promise<{
  recoverySalt: string;
  recoveryHash: string;
}> {
  const recoverySalt = createSalt();
  return {
    recoverySalt,
    recoveryHash: await hashSecret(normalizeRecoveryCode(code), recoverySalt),
  };
}

export async function verifyPin(pin: string, salt: string, hash: string): Promise<boolean> {
  const candidate = await hashSecret(pin, salt);
  return safeEqual(candidate, hash);
}

export async function verifyRecoveryCode(
  code: string,
  salt: string,
  hash: string
): Promise<boolean> {
  const candidate = await hashSecret(normalizeRecoveryCode(code), salt);
  return safeEqual(candidate, hash);
}

export function generateSyncToken(): string {
  return randomHex(32);
}

export function formatRecoveryCode(value: string): string {
  return normalizeRecoveryCode(value).match(/.{1,4}/g)?.join("-") ?? "";
}

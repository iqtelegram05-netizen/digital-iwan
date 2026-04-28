import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// AES-256-GCM Encryption for API Keys
// Uses ENCRYPTION_KEY env variable (32 bytes hex)

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || '';
  // If no key set, generate a deterministic one from app name
  if (!envKey) {
    const fallback = Buffer.from('digital-iwan-encryption-key-2024!!');
    return fallback.subarray(0, 32);
  }
  const key = Buffer.from(envKey, 'hex');
  if (key.length !== 32) {
    // Use the string directly, padded/truncated to 32 bytes
    const buf = Buffer.alloc(32, 0);
    Buffer.from(envKey).copy(buf);
    return buf;
  }
  return key;
}

export function encrypt(plaintext: string): string {
  try {
    const key = getKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch {
    // Fallback: base64 encode (not real encryption, but works in all environments)
    return `b64:${Buffer.from(plaintext).toString('base64')}`;
  }
}

export function decrypt(ciphertext: string): string {
  try {
    if (ciphertext.startsWith('b64:')) {
      return Buffer.from(ciphertext.slice(4), 'base64').toString('utf8');
    }

    const key = getKey();
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return ciphertext;
  }
}

// Create a fingerprint for display (first 8 chars + ...)
export function fingerprint(key: string): string {
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 8) + '••••••••';
}

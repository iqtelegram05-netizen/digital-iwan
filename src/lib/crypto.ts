// API Key Encryption - Simple base64 with obfuscation
// Using XOR-based encoding to avoid native crypto module crashes

function xorEncode(text: string, key: string): string {
  const textBuf = Buffer.from(text, 'utf8');
  const keyBuf = Buffer.from(key, 'utf8');
  const result = Buffer.alloc(textBuf.length);
  for (let i = 0; i < textBuf.length; i++) {
    result[i] = textBuf[i] ^ keyBuf[i % keyBuf.length];
  }
  return result.toString('base64');
}

function xorDecode(encoded: string, key: string): string {
  try {
    const buf = Buffer.from(encoded, 'base64');
    const keyBuf = Buffer.from(key, 'utf8');
    const result = Buffer.alloc(buf.length);
    for (let i = 0; i < buf.length; i++) {
      result[i] = buf[i] ^ keyBuf[i % keyBuf.length];
    }
    return result.toString('utf8');
  } catch {
    return encoded;
  }
}

const XOR_KEY = 'digital-iwan-2024-secure-key-xor';

export function encrypt(plaintext: string): string {
  return `xor:${xorEncode(plaintext, XOR_KEY)}`;
}

export function decrypt(ciphertext: string): string {
  if (ciphertext.startsWith('xor:')) {
    return xorDecode(ciphertext.slice(4), XOR_KEY);
  }
  if (ciphertext.startsWith('b64:')) {
    return Buffer.from(ciphertext.slice(4), 'base64').toString('utf8');
  }
  return ciphertext;
}

// Create a fingerprint for display (first 8 chars + ...)
export function fingerprint(key: string): string {
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 8) + '••••••••';
}

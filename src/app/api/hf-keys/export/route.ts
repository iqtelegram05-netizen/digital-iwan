import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

// TEMPORARY: Export all HF keys decrypted — DELETE AFTER USE
export async function GET() {
  try {
    const keys = await db.huggingFaceKey.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      select: { accessToken: true, fingerprint: true, label: true, model: true, status: true },
    });

    const decrypted = keys.map((k) => ({
      token: decrypt(k.accessToken),
      fingerprint: k.fingerprint,
      label: k.tokenLabel,
      model: k.model,
      status: k.status,
    }));

    return NextResponse.json({ count: decrypted.length, keys: decrypted });
  } catch (error) {
    console.error('[HF-EXPORT] Error:', error);
    return NextResponse.json({ error: 'فشل' }, { status: 500 });
  }
}

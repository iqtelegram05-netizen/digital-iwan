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

    // Return as plain text for easy copy
    const tokensOnly = decrypted.map((k) => k.token).join('\n');
    return new Response(tokensOnly, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

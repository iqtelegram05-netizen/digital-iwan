import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${request.nextUrl.origin}/?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${request.nextUrl.origin}/?auth_error=no_code`);
  }

  try {
    // تبادل الكود بـ tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${request.nextUrl.origin}/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.id_token) {
      return NextResponse.redirect(`${request.nextUrl.origin}/?auth_error=no_token`);
    }

    // فك تشفير JWT
    const parts = tokenData.id_token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    const email = payload.email;
    const name = payload.name || null;
    const avatar = payload.picture || null;
    const googleId = payload.sub;

    if (!email) {
      return NextResponse.redirect(`${request.nextUrl.origin}/?auth_error=no_email`);
    }

    // حفظ/تحديث المستخدم في قاعدة البيانات
    let user;
    try {
      user = await db.user.findUnique({ where: { email } });
      if (!user) {
        user = await db.user.create({ data: { email, name, avatar, lastLogin: new Date() } });
      } else {
        user = await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date(), ...(name ? { name } : {}), ...(avatar ? { avatar } : {}) },
        });
      }
    } catch {
      // إذا فشلت قاعدة البيانات (مثل Vercel)، نتجاوز
    }

    const userId = user?.id || googleId;
    const userRole = user?.role || 'user';

    // إعادة التوجيه مع بيانات المستخدم
    const userData = JSON.stringify({
      id: userId,
      email,
      name,
      avatar,
      role: userRole,
      isBlocked: false,
      lastLogin: new Date().toISOString(),
    });

    // تشفير base64 للبيانات
    const encoded = Buffer.from(userData).toString('base64');
    return NextResponse.redirect(`${request.nextUrl.origin}/?auth_success=${encodeURIComponent(encoded)}`);
  } catch (err) {
    console.error('Google auth callback error:', err);
    return NextResponse.redirect(`${request.nextUrl.origin}/?auth_error=server_error`);
  }
}

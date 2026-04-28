import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const origin = request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=no_code`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = `${origin}/auth/google/callback`;

    // تبادل الكود بـ tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.id_token) {
      console.error('No id_token in response:', JSON.stringify(tokenData));
      return NextResponse.redirect(`${origin}/?auth_error=no_token`);
    }

    // فك تشفير JWT
    const parts = tokenData.id_token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    const email = payload.email;
    const name = payload.name || null;
    const avatar = payload.picture || null;
    const googleId = payload.sub;

    if (!email) {
      return NextResponse.redirect(`${origin}/?auth_error=no_email`);
    }

    // حفظ/تحديث المستخدم في قاعدة البيانات (مع تجاهل الأخطاء)
    let userId = googleId;
    let userRole = 'user';

    try {
      let user = await db.user.findUnique({ where: { email } });
      if (!user) {
        user = await db.user.create({ data: { email, name, avatar, lastLogin: new Date() } });
      } else {
        user = await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date(), ...(name ? { name } : {}), ...(avatar ? { avatar } : {}) },
        });
      }
      userId = user.id;
      userRole = user.role;
    } catch (dbError) {
      console.error('DB error (non-critical):', dbError);
      // نتجاوز خطأ قاعدة البيانات
    }

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

    const encoded = Buffer.from(userData).toString('base64');
    return NextResponse.redirect(`${origin}/?auth_success=${encodeURIComponent(encoded)}`);
  } catch (err) {
    console.error('Google auth callback error:', err);
    return NextResponse.redirect(`${origin}/?auth_error=server_error`);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const origin = request.nextUrl.origin;

  if (error) {
    // إذا كان الطلب من نافذة منبثقة، نرسل خطأ عبر postMessage
    const html = getPopupHtml(origin, null, error);
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  if (!code) {
    const html = getPopupHtml(origin, null, 'no_code');
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
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
      // توجيه عادي مع خطأ
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
    }

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

    // إذا كان الطلب من نافذة منبثقة، نرسل البيانات عبر postMessage
    const html = getPopupHtml(origin, encoded, null);
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (err) {
    console.error('Google auth callback error:', err);
    return NextResponse.redirect(`${origin}/?auth_error=server_error`);
  }
}

// HTML page that sends user data back to the opener via postMessage
function getPopupHtml(origin: string, encoded: string | null, error: string | null) {
  const userDataJson = encoded ? JSON.stringify(atob(encoded)) : 'null';
  const errorMsg = error ? JSON.stringify(error) : 'null';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Google Login</title></head>
<body>
<script>
  try {
    if (window.opener && !window.opener.closed) {
      var userData = ${userDataJson};
      var error = ${errorMsg};
      if (userData) {
        var userObj = JSON.parse(userData);
        window.opener.postMessage({ type: 'google_auth_success', user: userObj }, '${origin}');
      } else if (error) {
        window.opener.postMessage({ type: 'google_auth_error', error: error }, '${origin}');
      }
    }
    window.close();
  } catch(e) {
    // fallback: redirect to home
    var encoded = ${encoded ? `'${encoded}'` : 'null'};
    var error = ${errorMsg};
    if (encoded) {
      window.location.href = '${origin}/?auth_success=' + encodeURIComponent(encoded);
    } else {
      window.location.href = '${origin}/?auth_error=' + encodeURIComponent(error || 'unknown');
    }
  }
</script>
<p style="text-align:center;padding:40px;font-family:Arial,sans-serif;color:#666;">
  جارٍ إتمام تسجيل الدخول...
</p>
</body>
</html>`;
}

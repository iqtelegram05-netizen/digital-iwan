'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

interface LoginPageProps {
  clientId: string;
}

export default function LoginPage({ clientId }: LoginPageProps) {
  const saved = useRef(false);
  const errorDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (saved.current || !clientId) return;

    // تعريف دالة الـ callback عالمياً
    (window as any).googleLoginCallback = function (response: { credential: string }) {
      if (saved.current) return;
      saved.current = true;

      try {
        // فك تشفير JWT
        const parts = response.credential.split('.');
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        const data = JSON.parse(jsonPayload);

        if (!data.email) {
          if (errorDivRef.current) errorDivRef.current.textContent = 'لم يتم العثور على بريد إلكتروني';
          return;
        }

        const userData = JSON.stringify({
          id: data.sub,
          email: data.email,
          name: data.name || null,
          avatar: data.picture || null,
          role: 'user',
          isBlocked: false,
          lastLogin: new Date().toISOString(),
        });

        // حفظ في localStorage
        localStorage.setItem('iwan_user', userData);

        // إرسال للسيرفر في الخلفية
        fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, name: data.name, avatar: data.picture }),
        }).catch(() => {});

        // العودة للتطبيق الرئيسي
        window.location.href = '/';
      } catch (err) {
        if (errorDivRef.current) errorDivRef.current.textContent = 'حدث خطأ: ' + String(err);
      }
    };

    // انتظار تحميل سكربت Google ثم تهيئة الزر
    const initInterval = setInterval(() => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return;

      clearInterval(initInterval);

      if (!clientId) {
        if (errorDivRef.current) errorDivRef.current.textContent = 'Google Client ID غير مضبوط';
        return;
      }

      google.accounts.id.initialize({
        client_id: clientId,
        callback: (window as any).googleLoginCallback,
        auto_select: false,
      });

      // عرض زر تسجيل الدخول
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.error('Google prompt not displayed:', notification);
        }
      });

      // رسم زر مخصص لضمان ظهوره
      const btnContainer = document.getElementById('google-btn');
      if (btnContainer) {
        btnContainer.innerHTML = '';
        google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 300,
          locale: 'ar',
        });
      }
    }, 150);

    const timeout = setTimeout(() => clearInterval(initInterval), 15000);
    return () => { clearInterval(initInterval); clearTimeout(timeout); };
  }, [clientId]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
      fontFamily: 'sans-serif',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #0c1929 100%)',
    }}>
      {/* الشعار */}
      <div style={{
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: 'rgba(14, 165, 233, 0.1)',
        border: '2px solid rgba(14, 165, 233, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      <h1 style={{ color: '#e5e7eb', fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
        الإيوان الرقمي
      </h1>
      <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 40, textAlign: 'center', lineHeight: 1.8 }}>
        سجّل دخولك عبر حسابك في Google
      </p>

      {/* زر Google */}
      <div id="google-btn" style={{ marginBottom: 16, minHeight: 44 }} />

      {/* رسالة خطأ */}
      <div ref={errorDivRef} style={{
        color: '#ef4444',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 16,
        display: 'none',
      }} />

      {!clientId && (
        <p style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
          خطأ: Google Client ID غير مضبوط
        </p>
      )}
    </div>
  );
}

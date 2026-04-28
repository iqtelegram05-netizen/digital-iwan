import { Metadata } from "next";
import Script from "next/script";
import LoginPage from "./LoginPage";

export const metadata: Metadata = {
  title: "تسجيل الدخول - الإيوان الرقمي",
};

export default function Login() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  return (
    <html lang="ar" dir="rtl">
      <head>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoginPage clientId={clientId} />
      </body>
    </html>
  );
}

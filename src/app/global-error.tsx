'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ backgroundColor: '#111', color: '#fff', padding: '2rem', fontFamily: 'monospace', direction: 'rtl' }}>
        <h2 style={{ color: '#ef4444', fontSize: '1.5rem' }}>خطأ في التطبيق</h2>
        <pre style={{
          backgroundColor: '#1a1a2e',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '0.85rem',
          direction: 'ltr',
          textAlign: 'left',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {error?.message || 'No error message'}
          {'\n\n'}
          {error?.stack || 'No stack trace'}
        </pre>
        {error?.digest && <p style={{ color: '#9ca3af' }}>Error digest: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>إعادة المحاولة</button>
      </body>
    </html>
  );
}

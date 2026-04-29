export async function register() {
  process.on('uncaughtException', (err) => {
    console.error('[instrumentation] UNCAUGHT EXCEPTION:', err);
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[instrumentation] UNHANDLED REJECTION:', reason);
    // Prevent process exit
  });
  console.log('[instrumentation] Error handlers registered');
}

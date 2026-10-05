import { createApp } from './app.js';
import { env, loadedEnvFilePath } from './config/env.js';
import { sql } from './config/database.js';
import { OTPFactory } from './modules/auth/otp/otp.factory.js';

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  const activeOtpProvider = OTPFactory.getProvider().constructor.name;
  const hasTwilioSid = Boolean(env.TWILIO_ACCOUNT_SID?.trim());
  const hasTwilioToken = Boolean(env.TWILIO_AUTH_TOKEN?.trim());
  const hasTwilioService = Boolean(env.TWILIO_VERIFY_SERVICE_SID?.trim());

  console.log(`
  🚀 ===================================================
  ✨ بتنحل (btin7al / AL7BTIN) REST API Server Started!
  🌐 URL: http://${env.HOST}:${env.PORT}${env.API_PREFIX}
  🩺 Health: http://${env.HOST}:${env.PORT}${env.API_PREFIX}/health
  🌱 Environment: ${env.NODE_ENV}
  📁 Loaded .env: ${loadedEnvFilePath}
  🔐 Active OTP Provider: ${activeOtpProvider}
  🛠️ DEV_OTP_MODE Active: ${env.DEV_OTP_MODE || env.AUTH_OTP_MODE === 'development'}
  📱 Twilio Configured: ${hasTwilioSid && hasTwilioToken && hasTwilioService} (SID: ${hasTwilioSid}, Token: ${hasTwilioToken}, ServiceSID: ${hasTwilioService})
  🕒 Started At: ${new Date().toISOString()}
  ===================================================
  `);
});

// Graceful Shutdown Handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('🔒 HTTP server closed.');

    try {
      await sql.end({ timeout: 5 });
      console.log('🗄️ Database connection pool closed.');
    } catch (err) {
      console.error('❌ Error closing database pool:', err);
    }

    console.log('👋 Process exiting cleanly. Goodbye!');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if stuck
  setTimeout(() => {
    console.error('⚠️ Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { db } from '~/db';
import * as schema from '~/db/schema';
import { sendAuthEmail } from '~/lib/auth-email';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL || undefined,
  secret: env.BETTER_AUTH_SECRET || undefined,
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
      partitioned: true
    }
  },
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  emailAndPassword: {
    enabled: true
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      async sendVerificationOTP({ email, otp, type }) {
        try {
          await sendAuthEmail({
            email,
            otp,
            type: type === 'change-email' ? 'email-verification' : type
          });
        } catch (error) {
          throw new APIError('BAD_REQUEST', {
            message:
              error instanceof Error
                ? error.message
                : 'Authentication email could not be delivered.'
          });
        }
      }
    }),
    admin(),
    // Must be the last plugin so it can attach Set-Cookie to responses.
    tanstackStartCookies()
  ]
});

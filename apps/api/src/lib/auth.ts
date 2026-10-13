import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, users, sessions, accounts, verifications } from '@inveeta/db';

const IS_PROD = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  trustedOrigins: [
    'https://inveeta.com',
    'https://app.inveeta.com',
    ...(IS_PROD
      ? []
      : [
          'http://localhost:3000',
          'http://localhost:4000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:4000',
          'http://127.0.0.1:5173',
        ]),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 menit
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 hari
    updateAge: 60 * 60 * 24, // 24 jam
  },
  advanced: {
    cookiePrefix: 'inveeta',
    crossSubDomainCookies: {
      enabled: IS_PROD,
      domain: IS_PROD ? '.inveeta.com' : undefined,
    },
    defaultCookieAttributes: {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/',
    },
  },
});

import { createMiddleware } from 'hono/factory';
import { auth } from '../lib/auth.js';
import { UnauthorizedError } from '../utils/errors.js';

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};

export const requireAuth = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    throw new UnauthorizedError('Sesi login tidak valid atau telah berakhir');
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
});

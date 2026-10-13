import { secureHeaders } from 'hono/secure-headers';

export const securityHeadersMiddleware = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'https://cdn.inveeta.com', 'data:'],
    mediaSrc: ["'self'", 'https://cdn.inveeta.com'],
    connectSrc: [
      "'self'",
      'https://api.inveeta.com',
      'https://inveeta.com',
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:5173',
    ],
    frameAncestors: ["'none'"],
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
});

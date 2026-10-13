import { hc } from 'hono/client';
import type { AppType } from '@inveeta/api';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = hc<AppType>(apiUrl, {
  init: {
    credentials: 'include',
  },
});

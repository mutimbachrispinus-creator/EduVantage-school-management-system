import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema';

let url = process.env.TURSO_URL || 'https://placeholder.turso.io';

// Edge runtime and Next.js build phase do not support 'file:' protocol
if (url.startsWith('file:')) {
  url = 'https://placeholder-during-build.turso.io';
}

const client = createClient({
  url: url,
  authToken: process.env.TURSO_TOKEN || 'placeholder',
});

export const db = drizzle(client, { schema });

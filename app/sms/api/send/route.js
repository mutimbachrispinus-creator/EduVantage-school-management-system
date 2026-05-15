export const runtime = 'edge';
/**
 * app/sms/api/send/route.js — SMS send sub-route
 *
 * Proxies to /api/sms so the SMS page can POST to a relative URL
 * that feels scoped to its own section:
 *   POST /sms/api/send  →  same as POST /api/sms
 *
 * This keeps the routing tree consistent with the original file structure
 * while ensuring the API key stays server-side.
 */

export { POST, GET } from '@/app/api/sms/route';

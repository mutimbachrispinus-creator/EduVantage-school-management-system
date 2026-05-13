/**
 * lib/background-tasks.js
 * 
 * Implements a background execution pattern for Cloudflare Edge.
 * Allows the API to return a response to the user "instantly" while
 * continuing to process heavy tasks (like SMS or DB syncs) in the background.
 */

/**
 * Executes a function in the background.
 * @param {Request} request - The original Next.js request object
 * @param {Function} taskFn - The async function to execute
 */
export function backgroundTask(request, taskFn) {
  // Access the underlying Cloudflare Worker context if available
  const ctx = request.ctx;
  
  if (ctx && typeof ctx.waitUntil === 'function') {
    // Standard Cloudflare Worker / Next.js Edge backgrounding
    ctx.waitUntil(taskFn());
  } else {
    // Fallback for local development or non-edge environments
    // We still run it but we don't have the context to keep the worker alive
    taskFn().catch(err => console.error('[Background Task Error]:', err));
  }
}

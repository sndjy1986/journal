// Import handlers
import { handleLogin, handleRegister } from './handlers/auth.js';
import { handleGetEntries, handleSaveEntry, handleDeleteEntry } from './handlers/entries.js';
import { handleStatic } from './handlers/static.js';

// --- A Simple, Self-Contained Router ---
const router = {
  routes: [],
  add(method, path, handler) {
    this.routes.push({
      method,
      // Convert path strings like /entries/:timestamp into a regular expression
      path: new RegExp(`^${path.replace(/(\/?)\*/g, '($1.*)?').replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
      handler
    });
  },
  // Add helper methods for each HTTP verb
  get(path, handler) { this.add('GET', path, handler) },
  post(path, handler) { this.add('POST', path, handler) },
  delete(path, handler) { this.add('DELETE', path, handler) },
  options(path, handler) { this.add('OPTIONS', path, handler) },
  all(path, handler) { this.add('ALL', path, handler) },

  async handle(request, ...args) {
    const { method, url } = request;
    const { pathname } = new URL(url);

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Find a matching route
    for (const route of this.routes) {
      if (method === route.method || route.method === 'ALL') {
        const match = pathname.match(route.path);
        if (match) {
          request.params = match.groups || {}; // Attach URL params to the request
          return route.handler(request, ...args);
        }
      }
    }
    // No route found
    return new Response('Not Found', { status: 404 });
  }
};

// --- Define Routes ---
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/entries', handleSaveEntry);
router.get('/entries', handleGetEntries);
router.delete('/entries/:timestamp', handleDeleteEntry);
router.get('/', handleStatic);
router.all('*', () => new Response('Not Found', { status: 404 }));

// --- CORS Headers ---
const corsHeaders = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
    'Access-Control-Allow-Origin': '*',
};

// --- Main Fetch Handler ---
export default {
    fetch: (request, env, ctx) => 
        router
            .handle(request, env, ctx)
            .then(response => {
                // Ensure response is valid
                if (!response) {
                    return new Response('Not Found', { status: 404 });
                }
                // Apply CORS headers to every response
                const newHeaders = new Headers(response.headers);
                Object.entries(corsHeaders).forEach(([key, value]) => {
                    newHeaders.set(key, value);
                });
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            })
            .catch(err => {
                console.error(err);
                return new Response('Internal Server Error', { status: 500 });
            }),
};

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
      path: new RegExp(`^${path.replace(/(\/?)\*/g, '($1.*)?').replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
      handler
    });
  },
  get(path, handler) { this.add('GET', path, handler) },
  post(path, handler) { this.add('POST', path, handler) },
  delete(path, handler) { this.add('DELETE', path, handler) },

  async handle(request, ...args) {
    const { method, url } = request;
    const { pathname } = new URL(url);

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    for (const route of this.routes) {
      if (method === route.method) {
        const match = pathname.match(route.path);
        if (match) {
          request.params = match.groups || {};
          return route.handler(request, ...args);
        }
      }
    }
    
    // If no API route matches, serve the static HTML page
    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      return handleStatic(request, ...args);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

// --- Define API Routes ---
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/entries', handleSaveEntry);
router.get('/entries', handleGetEntries);
router.delete('/entries/:timestamp', handleDeleteEntry);

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
                if (!response) {
                    return new Response('Not Found', { status: 404 });
                }
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

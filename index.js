import { Router } from 'itty-router';
// CORRECTED: Added .js extension to all handler imports
import { handleLogin, handleRegister } from './handlers/auth.js';
import { handleGetEntries, handleSaveEntry, handleDeleteEntry } from './handlers/entries.js';
import { handleStatic } from './handlers/static.js';

// Create a new router
const router = Router();

// Define CORS headers
const corsHeaders = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
    'Access-Control-Allow-Origin': '*',
};

// Handle CORS preflight requests
router.options('*', () => {
    return new Response(null, {
        headers: corsHeaders,
    });
});

// --- API Routes ---
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/entries', handleSaveEntry);
router.get('/entries', handleGetEntries);
router.delete('/entries/:timestamp', handleDeleteEntry);

// --- Static Asset Route ---
// This route serves the main HTML page
router.get('/', handleStatic);

// --- 404 Handler ---
router.all('*', () => new Response('Not Found', { status: 404 }));

// The main fetch handler, which uses the router
export default {
    fetch: (request, env, ctx) => 
        router
            .handle(request, env, ctx)
            .then(response => {
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
                // Basic error handling
                console.error(err);
                return new Response('Internal Server Error', { status: 500 });
            }),
};

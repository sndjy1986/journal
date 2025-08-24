// src/index.js

import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

// Define CORS headers that will be added to every response
const corsHeaders = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Origin': '*', // In production, you should restrict this to your actual domain
};

// Main fetch handler
export default {
    async fetch(request, env) {
        // Handle preflight requests for CORS
        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }

        const url = new URL(request.url);
        
        // Route for the main page
        if (url.pathname === '/' && request.method === 'GET') {
            return handleRequest(request, env);
        }
        // API routes
        if (url.pathname === '/register' && request.method === 'POST') {
            return handleRegister(request, env);
        }
        if (url.pathname === '/login' && request.method === 'POST') {
            return handleLogin(request, env);
        }
        if (url.pathname === '/entries' && request.method === 'POST') {
            return handleSaveEntry(request, env);
        }
        if (url.pathname === '/entries' && request.method === 'GET') {
            return handleGetEntries(request, env);
        }

        // Fallback for any other request
        return new Response('Not Found', { status: 404 });
    },
};

// --- NEW FUNCTION TO HANDLE PREFLIGHT REQUESTS ---
async function handleOptions(request) {
    if (
        request.headers.get('Origin') !== null &&
        request.headers.get('Access-Control-Request-Method') !== null &&
        request.headers.get('Access-Control-Request-Headers') !== null
    ) {
        // Handle CORS preflight requests.
        return new Response(null, {
            headers: corsHeaders,
        });
    } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
            headers: {
                Allow: 'GET, POST, OPTIONS',
            },
        });
    }
}


// This function serves your HTML page
async function handleRequest(request, env) {
    // I am assuming you have already pasted your HTML here from the previous step.
    // If not, please paste your full index.html content inside the backticks.
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    </html>
    `;
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html;charset=UTF-8',
        },
    });
}

async function handleRegister(request, env) {
    try {
        const { username, password } = await request.json();
        if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const userKey = `user:${username}`;
        const existingUser = await env.JOURNAL_KV.get(userKey);
        if (existingUser) {
            return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        await env.JOURNAL_KV.put(userKey, password);
        return new Response(JSON.stringify({ success: true }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
}

async function handleLogin(request, env) {
    try {
        const { username, password } = await request.json();
        const userKey = `user:${username}`;
        const storedPassword = await env.JOURNAL_KV.get(userKey);
        if (!storedPassword || storedPassword !== password) {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const secret = env.JWT_SECRET;
        if (!secret) {
            return new Response(JSON.stringify({ error: 'JWT_SECRET not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const token = await sign({ username, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) }, secret);
        return new Response(JSON.stringify({ token }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
}
// ... (The rest of your handleSaveEntry and handleGetEntries functions should also have the corsHeaders added to their responses)
// Example for handleSaveEntry:
async function handleSaveEntry(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.substring(7);
    const secret = env.JWT_SECRET;
    try {
        const { payload } = await verify(token, secret);
        const { title, content } = await request.json();
        const entryKey = `entry:${payload.username}:${Date.now()}`;
        await env.JOURNAL_KV.put(entryKey, JSON.stringify({ title, content }));
        return new Response(JSON.stringify({ success: true }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
}
async function handleGetEntries(request, env) {
     const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.substring(7);
    const secret = env.JWT_SECRET;
    try {
        const { payload } = await verify(token, secret);
        const list = await env.JOURNAL_KV.list({ prefix: `entry:${payload.username}:` });
        const promises = list.keys.map(key => env.JOURNAL_KV.get(key.name).then(value => JSON.parse(value)));
        const entries = await Promise.all(promises);
        return new Response(JSON.stringify(entries.reverse()), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
}

// src/index.js

import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

// Main fetch handler
export default {
    async fetch(request, env) {
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

// This function serves your HTML page
async function handleRequest(request, env) {
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

// --- All other functions (handleRegister, handleLogin, etc.) remain the same ---

async function handleRegister(request, env) {
    const { username, password } = await request.json();
    if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const userKey = `user:${username}`;
    const existingUser = await env.JOURNAL_KV.get(userKey);
    if (existingUser) {
        return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    await env.JOURNAL_KV.put(userKey, password);
    return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}

async function handleLogin(request, env) {
    const { username, password } = await request.json();
    const userKey = `user:${username}`;
    const storedPassword = await env.JOURNAL_KV.get(userKey);
    if (!storedPassword || storedPassword !== password) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const secret = env.JWT_SECRET;
    const token = await sign({ username, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) }, secret);
    return new Response(JSON.stringify({ token }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function handleSaveEntry(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const token = authHeader.substring(7);
    const secret = env.JWT_SECRET;
    try {
        const { payload } = await verify(token, secret);
        const { title, content } = await request.json();
        const entryKey = `entry:${payload.username}:${Date.now()}`;
        await env.JOURNAL_KV.put(entryKey, JSON.stringify({ title, content }));
        return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
}

async function handleGetEntries(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const token = authHeader.substring(7);
    const secret = env.JWT_SECRET;
    try {
        const { payload } = await verify(token, secret);
        const list = await env.JOURNAL_KV.list({ prefix: `entry:${payload.username}:` });
        const promises = list.keys.map(key => env.JOURNAL_KV.get(key.name).then(value => JSON.parse(value)));
        const entries = await Promise.all(promises);
        return new Response(JSON.stringify(entries.reverse()), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
}

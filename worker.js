// A library for handling JWTs. You'll need to add this as a dependency.
import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
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
        return new Response('Not Found', { status: 404 });
    },
};

async function handleRegister(request, env) {
    const { username, password } = await request.json();
    if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400 });
    }

    const userKey = `user:${username}`;
    const existingUser = await env.JOURNAL_KV.get(userKey);
    if (existingUser) {
        return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 400 });
    }

    await env.JOURNAL_KV.put(userKey, password); // In a real app, hash this password with a library like bcrypt
    return new Response(JSON.stringify({ success: true }), { status: 201 });
}

async function handleLogin(request, env) {
    const { username, password } = await request.json();
    const userKey = `user:${username}`;
    const storedPassword = await env.JOURNAL_KV.get(userKey);

    if (!storedPassword || storedPassword !== password) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    const secret = env.JWT_SECRET;
    const token = await sign({ username, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) }, secret);

    return new Response(JSON.stringify({ token }), { status: 200 });
}

async function handleSaveEntry(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.substring(7);
    const secret = env.JWT_SECRET;
    try {
        const { payload } = await verify(token, secret);
        const { title, content } = await request.json();
        const entryKey = `entry:${payload.username}:${Date.now()}`;
        await env.JOURNAL_KV.put(entryKey, JSON.stringify({ title, content }));
        return new Response(JSON.stringify({ success: true }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }
}
async function handleGetEntries(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.substring(7);
    const secret = env.JWT_SECRET;
    try {
        const { payload } = await verify(token, secret);
        const entries = await env.JOURNAL_KV.list({ prefix: `entry:${payload.username}:` });
        const entryPromises = entries.keys.map(key => env.JOURNAL_KV.get(key.name));
        const entryValues = await Promise.all(entryPromises);
        const parsedEntries = entryValues.map(value => JSON.parse(value));
        return new Response(JSON.stringify(parsedEntries), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }
}

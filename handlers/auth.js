// sndjy1986/journal/journal-main/handlers/auth.js

// --- Helper Functions for JWT ---

// Base64 URL-safe encoding
function base64UrlEncode(str) {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Simple JWT sign function
async function sign(payload, secret) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };
    
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    
    const data = `${encodedHeader}.${encodedPayload}`;
    
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(data)
    );
    
    const encodedSignature = base64UrlEncode(
        String.fromCharCode(...new Uint8Array(signature))
    );
    
    return `${data}.${encodedSignature}`;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

// --- Route Handlers ---

/**
 * Handles new user registration.
 */
export async function handleRegister(request, env) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400, headers: jsonHeaders });
        }
        if (username.length < 3) {
            return new Response(JSON.stringify({ error: 'Username must be at least 3 characters long' }), { status: 400, headers: jsonHeaders });
        }
        if (password.length < 64) { // SHA-256 hash is 64 hex characters
             return new Response(JSON.stringify({ error: 'Invalid password hash format' }), { status: 400, headers: jsonHeaders });
        }

        const userKey = `user:${username}`;
        const existingUser = await env.JOURNAL_KV.get(userKey);

        if (existingUser) {
            return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 409, headers: jsonHeaders });
        }

        const userData = {
            username,
            password, // Password is saved pre-hashed from the client
            registeredAt: new Date().toISOString()
        };

        await env.JOURNAL_KV.put(userKey, JSON.stringify(userData));

        return new Response(JSON.stringify({ success: true }), { status: 201, headers: jsonHeaders });

    } catch (e) {
        console.error('Registration error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: jsonHeaders });
    }
}

/**
 * Handles user login.
 */
export async function handleLogin(request, env) {
    const secret = env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET not configured in Cloudflare Worker secrets.');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: jsonHeaders });
    }
    
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400, headers: jsonHeaders });
        }

        const userKey = `user:${username}`;
        const userDataJson = await env.JOURNAL_KV.get(userKey);

        if (!userDataJson) {
            return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401, headers: jsonHeaders });
        }

        const userData = JSON.parse(userDataJson);

        if (userData.password !== password) {
            return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401, headers: jsonHeaders });
        }

        // Passwords match, generate a JWT
        const payload = {
            username: userData.username,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
        };

        const token = await sign(payload, secret);

        return new Response(JSON.stringify({ token }), { status: 200, headers: jsonHeaders });

    } catch (e) {
        console.error('Login error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: jsonHeaders });
    }
}

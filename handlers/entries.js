// Simple JWT implementation for Cloudflare Workers
// This avoids external dependencies that can cause import issues

// Base64 URL-safe encoding
function base64UrlEncode(str) {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Base64 URL-safe decoding
function base64UrlDecode(str) {
    str += '='.repeat((4 - str.length % 4) % 4);
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

// Simple JWT sign function
async function sign(payload, secret) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };
    
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    
    const data = encodedHeader + '.' + encodedPayload;
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
    
    return data + '.' + encodedSignature;
}

// Simple JWT verify function
async function verify(token, secret) {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const [header, payload, signature] = parts;
    const data = header + '.' + payload;
    
    try {
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        
        const signatureBytes = new Uint8Array(
            Array.from(base64UrlDecode(signature)).map(c => c.charCodeAt(0))
        );
        
        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes,
            new TextEncoder().encode(data)
        );
        
        if (!isValid) return false;
        
        // Check expiration
        const decodedPayload = JSON.parse(base64UrlDecode(payload));
        if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
            return false;
        }
        
        return true;
    } catch (e) {
        return false;
    }
}

// Common headers for JSON responses
const jsonHeaders = { 'Content-Type': 'application/json' };

/**
 * Handles user registration.
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
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            return new Response(JSON.stringify({ error: 'Username can only contain letters, numbers, underscores, and hyphens' }), { status: 400, headers: jsonHeaders });
        }
        if (typeof password !== 'string' || !/^[a-f0-9]{64}$/.test(password)) {
            return new Response(JSON.stringify({ error: 'Invalid password format' }), { status: 400, headers: jsonHeaders });
        }

        const userKey = `user:${username}`;
        const existingUser = await env.JOURNAL_KV.get(userKey);
        
        if (existingUser) {
            return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 400, headers: jsonHeaders });
        }

        await env.JOURNAL_KV.put(userKey, password);
        
        return new Response(JSON.stringify({ success: true }), { status: 201, headers: jsonHeaders });
    } catch (e) {
        console.error('Registration error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: jsonHeaders });
    }
}

/**
 * Handles user login and issues a JWT.
 */
export async function handleLogin(request, env) {
    try {
        const { username, password } = await request.json();
        
        if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400, headers: jsonHeaders });
        }

        const storedPassword = await env.JOURNAL_KV.get(`user:${username}`);
        
        if (!storedPassword || storedPassword !== password) {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: jsonHeaders });
        }

        const secret = env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET not configured');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: jsonHeaders });
        }

        const token = await sign({ 
            username, 
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
        }, secret);
        
        return new Response(JSON.stringify({ token }), { status: 200, headers: jsonHeaders });
        
    } catch (e) {
        console.error('Login error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: jsonHeaders });
    }
}

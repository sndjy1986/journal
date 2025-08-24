// Base64 URL-safe decoding
function base64UrlDecode(str) {
    str += '='.repeat((4 - str.length % 4) % 4);
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
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
 * A helper function to verify the JWT from the Authorization header.
 * Returns the payload on success, or null on failure.
 */
async function verifyAuth(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    const secret = env.JWT_SECRET;

    if (!secret) {
        console.error('JWT_SECRET not configured');
        return null;
    }

    try {
        const isValid = await verify(token, secret);
        if (!isValid) return null;

        // Decode payload manually after verification
        const parts = token.split('.');
        const payloadJson = base64UrlDecode(parts[1]);
        const payload = JSON.parse(payloadJson);
        
        return payload.username ? payload : null;
    } catch (err) {
        console.error('JWT verification/decoding error:', err);
        return null;
    }
}

/**
 * Saves a new journal entry.
 */
export async function handleSaveEntry(request, env) {
    const payload = await verifyAuth(request, env);
    if (!payload) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    try {
        const { title, content, mood, tags } = await request.json();

        if (!content || content.trim() === '') {
            return new Response(JSON.stringify({ error: 'Content is required' }), { status: 400, headers: jsonHeaders });
        }

        const timestamp = Date.now();
        const entryKey = `entry:${payload.username}:${timestamp}`;
        const entryData = {
            title: title || '',
            content: content.trim(),
            mood: mood || '',
            tags: tags || [],
            timestamp,
        };

        await env.JOURNAL_KV.put(entryKey, JSON.stringify(entryData));
        
        return new Response(JSON.stringify({ success: true }), { status: 201, headers: jsonHeaders });
    } catch (e) {
        console.error('Save entry error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: jsonHeaders });
    }
}

/**
 * Retrieves all journal entries for a user.
 */
export async function handleGetEntries(request, env) {
    const payload = await verifyAuth(request, env);
    if (!payload) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    try {
        const list = await env.JOURNAL_KV.list({ prefix: `entry:${payload.username}:` });
        
        const promises = list.keys.map(async (key) => {
            const value = await env.JOURNAL_KV.get(key.name);
            return value ? JSON.parse(value) : null;
        });

        const entries = (await Promise.all(promises)).filter(entry => entry !== null);
        
        // Sort by timestamp, newest first
        entries.sort((a, b) => b.timestamp - a.timestamp);
        
        return new Response(JSON.stringify(entries), { status: 200, headers: jsonHeaders });
    } catch (e) {
        console.error('Get entries error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: jsonHeaders });
    }
}

/**
 * Deletes a specific journal entry.
 */
export async function handleDeleteEntry(request, env) {
    const payload = await verifyAuth(request, env);
    if (!payload) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    const { timestamp } = request.params;
    if (!timestamp) {
        return new Response(JSON.stringify({ error: 'Entry timestamp required' }), { status: 400, headers: jsonHeaders });
    }

    try {
        const entryKey = `entry:${payload.username}:${timestamp}`;
        await env.JOURNAL_KV.delete(entryKey);
        
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
    } catch (e) {
        console.error('Delete entry error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: jsonHeaders });
    }
}

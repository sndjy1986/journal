// src/index.js

import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

// Define CORS headers that will be added to every response
const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Origin': '*', // For production, you might want to restrict this to your actual domain
};

// Main fetch handler that routes requests
export default {
    async fetch(request, env) {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }

        const url = new URL(request.url);

        // Route to serve the main HTML page
        if (url.pathname === '/' && request.method === 'GET') {
            return handleRequest(request, env);
        }
        // Route for user registration
        if (url.pathname === '/register' && request.method === 'POST') {
            return handleRegister(request, env);
        }
        // Route for user login
        if (url.pathname === '/login' && request.method === 'POST') {
            return handleLogin(request, env);
        }
        // Route for saving a new journal entry
        if (url.pathname === '/entries' && request.method === 'POST') {
            return handleSaveEntry(request, env);
        }
        // Route for getting all journal entries for a user
        if (url.pathname === '/entries' && request.method === 'GET') {
            return handleGetEntries(request, env);
        }

        // Fallback for any other request
        return new Response('Not Found', { status: 404 });
    },
};

// --- HANDLER FUNCTIONS ---

// This function handles CORS preflight requests.
async function handleOptions(request) {
    return new Response(null, {
        headers: corsHeaders,
    });
}

// This function serves your complete HTML page.
async function handleRequest(request, env) {
    // Get the current domain from the request
    const url = new URL(request.url);
    const apiUrl = `${url.protocol}//${url.host}`;
    
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Private Journal</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Fira+Code&family=Roboto+Mono&family=Lora&display=swap');
            :root {
                --primary-background-color: #1C1C1C;
                --primary-font-color: #FFFFFC;
                --primary-link-color: rgba(255, 255, 252, 0.75);
                --orange-color: #F05E1C;
            }
            body {
                margin: 0;
                background-color: var(--primary-background-color);
                color: var(--primary-font-color);
                font-family: "Fira Code", monospace;
                font-size: 1rem;
                line-height: 1.5;
            }
            main {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 2rem 1rem;
            }
            .journal-container {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(10px);
                border-radius: 0.5rem;
                padding: 2rem;
                width: 100%;
                max-width: 45rem;
                border: 0.125rem solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            h1, h2 {
                text-align: center;
                color: var(--orange-color);
                margin-bottom: 2rem;
                font-weight: 400;
            }
            .input-group { margin-bottom: 1.5rem; }
            label {
                display: block;
                margin-bottom: 0.5rem;
                color: var(--primary-link-color);
                font-weight: 500;
            }
            input[type="password"], input[type="text"], textarea, select {
                width: 100%;
                padding: 1rem;
                border: 0.125rem solid rgba(255, 255, 255, 0.25);
                border-radius: 0.5rem;
                font-size: 1rem;
                background-color: rgba(255, 255, 255, 0.05);
                color: var(--primary-font-color);
                font-family: inherit;
                transition: all 0.125s ease-in-out;
                box-sizing: border-box;
            }
            textarea { min-height: 15rem; resize: vertical; }
            .btn {
                background-color: var(--orange-color);
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 0.5rem;
                font-size: 1rem;
                cursor: pointer;
                font-family: inherit;
                font-weight: 500;
                transition: all 0.125s ease-in-out;
                margin: 0.5rem;
            }
            .btn:hover { background-color: rgba(240, 94, 28, 0.8); }
            .btn-secondary { background-color: rgba(255, 255, 255, 0.1); }
            .btn-secondary:hover { background-color: rgba(255, 255, 255, 0.15); }
            .error-message, .success-message {
                padding: 1rem;
                border-radius: 0.5rem;
                margin: 1rem 0;
                text-align: center;
            }
            .error-message {
                color: #ff6b6b;
                background-color: rgba(255, 107, 107, 0.1);
                border: 0.125rem solid rgba(255, 107, 107, 0.3);
            }
            .success-message {
                color: #51cf66;
                background-color: rgba(81, 207, 102, 0.1);
                border: 0.125rem solid rgba(81, 207, 102, 0.3);
            }
            #journal-entries h4 { color: var(--orange-color); }
            #journal-entries p { white-space: pre-wrap; }
            a { color: var(--orange-color); text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <main>
            <div class="journal-container">
                <h1>Private Journal</h1>
                <div id="auth-section">
                    <div id="login-form">
                        <h2>Login</h2>
                        <div class="input-group"><label for="login-username">Username:</label><input type="text" id="login-username" placeholder="Your username"></div>
                        <div class="input-group"><label for="login-password">Password:</label><input type="password" id="login-password" placeholder="Your password"></div>
                        <button id="login-btn" class="btn">Login</button>
                        <p>Don't have an account? <a href="#" id="show-register">Register here</a>.</p>
                    </div>
                    <div id="register-form" style="display: none;">
                        <h2>Register</h2>
                        <div class="input-group"><label for="register-username">Username:</label><input type="text" id="register-username" placeholder="Choose a username"></div>
                        <div class="input-group"><label for="register-password">Password:</label><input type="password" id="register-password" placeholder="Choose a password"></div>
                        <button id="register-btn" class="btn">Register</button>
                        <p>Already have an account? <a href="#" id="show-login">Login here</a>.</p>
                    </div>
                    <div id="auth-error" class="error-message" style="display: none;"></div>
                </div>
                <div id="journal-section" style="display: none;">
                    <h2 id="welcome-message"></h2>
                    <div class="input-group"><label for="font-selector">Choose a font:</label><select id="font-selector"><option value="'Fira Code', monospace">Fira Code</option><option value="'Roboto Mono', monospace">Roboto Mono</option><option value="'Lora', serif">Lora</option></select></div>
                    <div class="input-group"><label for="entry-title">Entry Title (optional):</label><input type="text" id="entry-title" placeholder="Today's thoughts..."></div>
                    <div class="input-group"><label for="journal-entry">Journal Entry:</label><textarea id="journal-entry" placeholder="Write your thoughts here..."></textarea></div>
                    <div style="text-align: center;"><button id="save-btn" class="btn">Save to Cloud</button><button id="logout-btn" class="btn btn-secondary">Logout</button></div>
                    <div id="save-status" style="display: none;"></div>
                    <div id="journal-entries"></div>
                </div>
            </div>
        </main>
        <script>
            const apiUrl = '${apiUrl}';

            // DOM Element Variables
            const authSection = document.getElementById('auth-section');
            const journalSection = document.getElementById('journal-section');
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            const showRegister = document.getElementById('show-register');
            const showLogin = document.getElementById('show-login');
            const loginBtn = document.getElementById('login-btn');
            const registerBtn = document.getElementById('register-btn');
            const logoutBtn = document.getElementById('logout-btn');
            const saveBtn = document.getElementById('save-btn');
            const fontSelector = document.getElementById('font-selector');
            const journalEntryTextarea = document.getElementById('journal-entry');
            const welcomeMessage = document.getElementById('welcome-message');

            // Event Listeners
            showRegister.addEventListener('click', e => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; });
            showLogin.addEventListener('click', e => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; });
            fontSelector.addEventListener('change', e => { journalEntryTextarea.style.fontFamily = e.target.value; });

            // Add Enter key support for forms
            document.getElementById('login-password').addEventListener('keypress', e => { if (e.key === 'Enter') loginBtn.click(); });
            document.getElementById('register-password').addEventListener('keypress', e => { if (e.key === 'Enter') registerBtn.click(); });

            // Hashing function
            async function hashPassword(password) {
                const data = new TextEncoder().encode(password);
                const hash = await crypto.subtle.digest('SHA-256', data);
                return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
            }

            // Utility function to make API calls
            async function makeApiCall(endpoint, options = {}) {
                try {
                    const response = await fetch(\`\${apiUrl}\${endpoint}\`, {
                        headers: {
                            'Content-Type': 'application/json',
                            ...options.headers
                        },
                        ...options
                    });
                    
                    let data;
                    try {
                        data = await response.json();
                    } catch (e) {
                        data = { error: 'Invalid response from server' };
                    }
                    
                    return { response, data };
                } catch (error) {
                    console.error(\`API call error for \${endpoint}:\`, error);
                    return { 
                        response: { ok: false, status: 500 }, 
                        data: { error: 'Could not connect to the server. Please try again.' } 
                    };
                }
            }

            // Register Function
            registerBtn.addEventListener('click', async () => {
                const username = document.getElementById('register-username').value.trim();
                const password = document.getElementById('register-password').value;
                
                if (!username || !password) { 
                    showAuthError('Please enter a username and password.'); 
                    return; 
                }
                
                if (username.length < 3) {
                    showAuthError('Username must be at least 3 characters long.');
                    return;
                }
                
                if (password.length < 6) {
                    showAuthError('Password must be at least 6 characters long.');
                    return;
                }
                
                const hashedPassword = await hashPassword(password);
                const { response, data } = await makeApiCall('/register', {
                    method: 'POST',
                    body: JSON.stringify({ username, password: hashedPassword })
                });
                
                if (response.ok) { 
                    showAuthSuccess('Registration successful! Please log in.'); 
                    showLogin.click(); 
                } else { 
                    showAuthError(data.error || 'Registration failed.'); 
                }
            });

            // Login Function
            loginBtn.addEventListener('click', async () => {
                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value;
                
                if (!username || !password) { 
                    showAuthError('Please enter a username and password.'); 
                    return; 
                }
                
                const hashedPassword = await hashPassword(password);
                const { response, data } = await makeApiCall('/login', {
                    method: 'POST',
                    body: JSON.stringify({ username, password: hashedPassword })
                });
                
                if (response.ok) { 
                    localStorage.setItem('journal_token', data.token); 
                    localStorage.setItem('journal_user', username); 
                    showJournalView(); 
                } else { 
                    showAuthError(data.error || 'Login failed.'); 
                }
            });
            
            // Logout Function
            logoutBtn.addEventListener('click', () => { 
                localStorage.removeItem('journal_token'); 
                localStorage.removeItem('journal_user'); 
                authSection.style.display = 'block'; 
                journalSection.style.display = 'none'; 
                // Clear forms
                document.getElementById('login-username').value = '';
                document.getElementById('login-password').value = '';
                document.getElementById('register-username').value = '';
                document.getElementById('register-password').value = '';
            });
            
            // Save Entry Function
            saveBtn.addEventListener('click', async () => {
                const title = document.getElementById('entry-title').value.trim();
                const content = journalEntryTextarea.value.trim();
                const token = localStorage.getItem('journal_token');
                
                if (!content) {
                    showStatus('Please write something before saving.', 'error');
                    return;
                }
                
                const { response, data } = await makeApiCall('/entries', {
                    method: 'POST',
                    headers: { 'Authorization': \`Bearer \${token}\` },
                    body: JSON.stringify({ title, content })
                });
                
                if (response.ok) {
                    showStatus('Entry saved successfully!', 'success');
                    document.getElementById('entry-title').value = '';
                    journalEntryTextarea.value = '';
                    await loadEntries();
                } else {
                    if (response.status === 401) {
                        showStatus('Session expired. Please log in again.', 'error');
                        logoutBtn.click();
                    } else {
                        showStatus(data.error || 'Failed to save entry.', 'error');
                    }
                }
            });
            
            // Load Entries Function
            async function loadEntries() {
                const token = localStorage.getItem('journal_token');
                if (!token) return;
                
                const { response, data } = await makeApiCall('/entries', {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                });
                
                if (response.ok) {
                    const entries = data;
                    const entriesDiv = document.getElementById('journal-entries');
                    entriesDiv.innerHTML = '<h3>Your Entries:</h3>';
                    
                    if (entries.length > 0) {
                        entries.forEach(entry => {
                            const entryEl = document.createElement('div');
                            const safeTitle = (entry.title || 'Untitled').replace(/[<>&"']/g, c => ({
                                '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
                            }[c]));
                            const safeContent = entry.content.replace(/[<>&"']/g, c => ({
                                '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
                            }[c]));
                            entryEl.innerHTML = \`<h4>\${safeTitle}</h4><p>\${safeContent}</p><hr>\`;
                            entriesDiv.appendChild(entryEl);
                        });
                    } else { 
                        entriesDiv.innerHTML += '<p>No entries found. Start writing your first entry!</p>'; 
                    }
                } else if (response.status === 401) {
                    showStatus('Session expired. Please log in again.', 'error');
                    logoutBtn.click();
                }
            }
            
            // UI View Management
            function showJournalView() { 
                authSection.style.display = 'none'; 
                journalSection.style.display = 'block'; 
                welcomeMessage.textContent = \`Welcome, \${localStorage.getItem('journal_user')}!\`; 
                loadEntries(); 
            }
            
            function showAuthError(message) { 
                const el = document.getElementById('auth-error'); 
                el.textContent = message; 
                el.className = 'error-message';
                el.style.display = 'block'; 
                setTimeout(() => el.style.display = 'none', 5000); 
            }
            
            function showAuthSuccess(message) { 
                const el = document.getElementById('auth-error'); 
                el.textContent = message; 
                el.className = 'success-message';
                el.style.display = 'block'; 
                setTimeout(() => el.style.display = 'none', 5000); 
            }
            
            function showStatus(message, type) { 
                const el = document.getElementById('save-status'); 
                el.textContent = message; 
                el.className = type === 'success' ? 'success-message' : 'error-message'; 
                el.style.display = 'block'; 
                setTimeout(() => el.style.display = 'none', 5000); 
            }
            
            // Initial check on page load
            if (localStorage.getItem('journal_token')) { 
                showJournalView(); 
            }
        </script>
    </body>
    </html>
    `;
    return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
}

// API endpoint to handle user registration.
async function handleRegister(request, env) {
    try {
        const { username, password } = await request.json();
        
        if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Username and password are required' }), { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        // Validate input
        if (username.length < 3) {
            return new Response(JSON.stringify({ error: 'Username must be at least 3 characters long' }), { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        // Check for valid username characters
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            return new Response(JSON.stringify({ error: 'Username can only contain letters, numbers, underscores, and hyphens' }), { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        const userKey = `user:${username}`;
        const existingUser = await env.JOURNAL_KV.get(userKey);
        
        if (existingUser) {
            return new Response(JSON.stringify({ error: 'Username already taken' }), { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        await env.JOURNAL_KV.put(userKey, password);
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (e) {
        console.error('Registration error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}

// API endpoint to handle user login and issue a JWT.
async function handleLogin(request, env) {
    try {
        const { username, password } = await request.json();
        
        if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Username and password are required' }), { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        const storedPassword = await env.JOURNAL_KV.get(`user:${username}`);
        
        if (!storedPassword || storedPassword !== password) {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        const secret = env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET not configured in worker environment');
        }

        const token = await sign({ 
            username, 
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
        }, secret);
        
        return new Response(JSON.stringify({ token }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (e) {
        console.error('Login error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}

// API endpoint to save a new journal entry.
async function handleSaveEntry(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    try {
        const token = authHeader.substring(7);
        const { payload } = await verify(token, env.JWT_SECRET);
        const { title, content } = await request.json();

        if (!content || content.trim() === '') {
            return new Response(JSON.stringify({ error: 'Content is required' }), { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        const timestamp = Date.now();
        const entryKey = `entry:${payload.username}:${timestamp}`;
        const entryData = {
            title: title || '',
            content: content.trim(),
            timestamp,
            date: new Date(timestamp).toISOString()
        };

        await env.JOURNAL_KV.put(entryKey, JSON.stringify(entryData));
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (e) {
        console.error('Save entry error:', e);
        return new Response(JSON.stringify({ error: 'Invalid token or internal error' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}

// API endpoint to retrieve all journal entries for a user.
async function handleGetEntries(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    try {
        const token = authHeader.substring(7);
        const { payload } = await verify(token, env.JWT_SECRET);
        
        const list = await env.JOURNAL_KV.list({ prefix: `entry:${payload.username}:` });
        const promises = list.keys.map(async (key) => {
            const value = await env.JOURNAL_KV.get(key.name);
            try {
                return JSON.parse(value);
            } catch (e) {
                // Handle legacy entries that might not be JSON
                return {
                    title: '',
                    content: value,
                    timestamp: parseInt(key.name.split(':')[2]) || 0,
                    date: new Date(parseInt(key.name.split(':')[2]) || 0).toISOString()
                };
            }
        });
        
        const entries = await Promise.all(promises);
        
        // Sort by timestamp, newest first
        entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        return new Response(JSON.stringify(entries), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (e) {
        console.error('Get entries error:', e);
        return new Response(JSON.stringify({ error: 'Invalid token or internal error' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}

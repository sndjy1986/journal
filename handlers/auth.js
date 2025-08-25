// Copy this code into your script.js file to fix the authentication issues

// Fix 1: Update the hashPassword function to ensure it matches server expectations
async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Fix 2: Make selectTag function globally accessible
window.selectTag = function(tag) {
    const currentTags = entryTags.value.split(',').map(t => t.trim()).filter(t => t);
    const lastTag = currentTags[currentTags.length - 1];
    
    if (lastTag && !commonTags.includes(lastTag)) {
        currentTags[currentTags.length - 1] = tag;
    } else {
        currentTags.push(tag);
    }
    
    entryTags.value = currentTags.join(', ');
    tagSuggestions.style.display = 'none';
    entryTags.focus();
}

// Fix 3: Improved error handling in Login and Register functions
async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) { 
        showAuthError('Please enter a username and password.'); 
        return; 
    }
    
    // Show loading state
    loginBtn.innerHTML = '<span class="loading-spinner"></span>Signing In...';
    loginBtn.disabled = true;
    
    try {
        // Log for debugging
        console.log("Attempting login for user:", username);
        
        const hashedPassword = await hashPassword(password);
        console.log("Password hashed. Hash length:", hashedPassword.length);
        
        const { response, data } = await makeApiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password: hashedPassword })
        });
        
        console.log("Login response status:", response.status);
        
        if (response.ok) { 
            console.log("Login successful, storing token");
            localStorage.setItem('journal_token', data.token); 
            localStorage.setItem('journal_user', username);
            currentUser = username;
            showJournalView(); 
        } else { 
            console.error("Login failed:", data.error);
            showAuthError(data.error || 'Login failed.'); 
        }
    } catch (error) {
        console.error("Login error:", error);
        showAuthError('Login failed. Please try again. ' + error.message);
    } finally {
        loginBtn.innerHTML = 'Sign In';
        loginBtn.disabled = false;
    }
}

// Fix 4: Improved Register function with better error handling
async function handleRegister() {
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
    
    // Show loading state
    registerBtn.innerHTML = '<span class="loading-spinner"></span>Creating Account...';
    registerBtn.disabled = true;
    
    try {
        console.log("Attempting to register user:", username);
        
        const hashedPassword = await hashPassword(password);
        console.log("Password hashed. Hash length:", hashedPassword.length);
        
        const { response, data } = await makeApiCall('/register', {
            method: 'POST',
            body: JSON.stringify({ username, password: hashedPassword })
        });
        
        console.log("Registration response status:", response.status);
        
        if (response.ok) { 
            console.log("Registration successful");
            showAuthSuccess('🎉 Registration successful! Please log in.'); 
            showLogin.click(); 
        } else { 
            console.error("Registration failed:", data.error);
            showAuthError(data.error || 'Registration failed.'); 
        }
    } catch (error) {
        console.error("Registration error:", error);
        showAuthError('Registration failed. Please try again. ' + error.message);
    } finally {
        registerBtn.innerHTML = 'Create Account';
        registerBtn.disabled = false;
    }
}

// Fix 5: Improved API call function with better error handling
async function makeApiCall(endpoint, options = {}) {
    try {
        const url = `${apiUrl}${endpoint}`;
        console.log(`Making API call to: ${url}`, options.method || 'GET');
        
        const requestOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        const response = await fetch(url, requestOptions);
        console.log(`API response status: ${response.status}`);
        
        let data;
        try {
            const responseText = await response.text();
            console.log("Response text:", responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            data = { error: 'Invalid response from server' };
        }
        
        return { response, data };
    } catch (error) {
        console.error(`API call error for ${endpoint}:`, error);
        return { 
            response: { ok: false, status: 500 }, 
            data: { error: 'Could not connect to the server. Please try again.' } 
        };
    }
}

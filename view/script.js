// sndjy1986/journal/journal-main/view/script.js

// API Configuration
const apiUrl = ''; // The worker will be on the same domain, so this can be empty

// Global variables
let currentEntries = [];
let activeEntryId = null;
let selectedMood = '';
let currentUser = '';

// Writing prompts
const writingPrompts = [
    "What made you smile today?",
    "Describe a challenge you overcame recently",
    "What are you grateful for right now?",
    "If you could tell your past self one thing, what would it be?",
    "What's something new you learned this week?",
    "Describe a moment when you felt truly at peace",
    "What's a goal you're working towards?",
    "Write about someone who inspires you",
    "What would your perfect day look like?",
    "Describe a memory that always makes you happy",
    "What's something you're looking forward to?",
    "Write about a place that feels like home",
    "What's a skill you'd like to develop?",
    "Describe a random act of kindness you witnessed or performed",
    "What's something you're proud of accomplishing?"
];

// Tag suggestions
const commonTags = [
    'personal', 'work', 'family', 'friends', 'goals', 'gratitude',
    'memories', 'travel', 'health', 'creativity', 'learning',
    'relationships', 'achievements', 'challenges', 'ideas'
];

// DOM Elements
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
const exportBtn = document.getElementById('export-btn');
const fontSelector = document.getElementById('font-selector');
const journalEntryTextarea = document.getElementById('journal-entry');
const welcomeMessage = document.getElementById('welcome-message');
const themeToggle = document.getElementById('theme-toggle');

// Sidebar Elements
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const toggleIcon = document.getElementById('toggle-icon');
const entryList = document.getElementById('entry-list');
const searchBox = document.getElementById('search-box');
const filterSelect = document.getElementById('filter-select');

// Entry Viewer Elements
const entryViewer = document.getElementById('entry-viewer');
const viewerTitle = document.getElementById('viewer-title');
const viewerMeta = document.getElementById('viewer-meta');
const viewerContent = document.getElementById('viewer-content');
const viewerDate = document.getElementById('viewer-date');
const viewerMood = document.getElementById('viewer-mood');
const viewerTags = document.getElementById('viewer-tags');
const closeViewer = document.getElementById('close-viewer');

// Mood & Tools Elements
const moodBtns = document.querySelectorAll('.mood-btn');
const toolBtns = document.querySelectorAll('.tool-btn');
const newPromptBtn = document.getElementById('new-prompt-btn');
const promptText = document.getElementById('prompt-text');
const entryTags = document.getElementById('entry-tags');
const tagSuggestions = document.getElementById('tag-suggestions');

// Stats Elements
const wordCount = document.getElementById('word-count');
const charCount = document.getElementById('char-count');
const readTime = document.getElementById('read-time');

// Export Modal Elements
const exportModal = document.getElementById('export-modal');
const exportJsonBtn = document.getElementById('export-json');
const exportTxtBtn = document.getElementById('export-txt');
const cancelExportBtn = document.getElementById('cancel-export');

// Initialize App
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    setupEventListeners();
    loadTheme();
    showRandomPrompt();
    
    // Check if user is already logged in
    if (localStorage.getItem('journal_token')) {
        showJournalView();
    }
}

function setupEventListeners() {
    // Auth Event Listeners
    showRegister.addEventListener('click', e => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });
    
    showLogin.addEventListener('click', e => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });
    
    loginBtn.addEventListener('click', handleLogin);
    registerBtn.addEventListener('click', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    saveBtn.addEventListener('click', handleSaveEntry);
    exportBtn.addEventListener('click', () => exportModal.classList.add('active'));
    
    // Export Modal Listeners
    exportJsonBtn.addEventListener('click', () => exportEntries('json'));
    exportTxtBtn.addEventListener('click', () => exportEntries('txt'));
    cancelExportBtn.addEventListener('click', () => exportModal.classList.remove('active'));
    
    // Theme Toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Font Selector
    fontSelector.addEventListener('change', e => {
        journalEntryTextarea.style.fontFamily = e.target.value;
    });
    
    // Sidebar Event Listeners
    sidebarToggle.addEventListener('click', toggleSidebar);
    closeViewer.addEventListener('click', closeEntryViewer);
    searchBox.addEventListener('input', handleSearch);
    filterSelect.addEventListener('change', handleFilter);
    
    // Mood Selection
    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => selectMood(btn.dataset.mood));
    });
    
    // Editor Tools
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => applyFormat(btn.dataset.tool));
    });
    
    // Writing Prompt
    newPromptBtn.addEventListener('click', showRandomPrompt);
    
    // Tags Input
    entryTags.addEventListener('input', handleTagInput);
    entryTags.addEventListener('focus', showTagSuggestions);
    entryTags.addEventListener('blur', () => {
        setTimeout(() => tagSuggestions.style.display = 'none', 200);
    });
    
    // Writing Stats
    journalEntryTextarea.addEventListener('input', updateWritingStats);
    
    // Enter key support
    document.getElementById('login-password').addEventListener('keypress', e => {
        if (e.key === 'Enter') loginBtn.click();
    });
    document.getElementById('register-password').addEventListener('keypress', e => {
        if (e.key === 'Enter') registerBtn.click();
    });
    
    // Close modal on outside click
    exportModal.addEventListener('click', e => {
        if (e.target === exportModal) {
            exportModal.classList.remove('active');
        }
    });
}

// Theme Functions
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '🌙' : '☀️';
}

// Writing Prompt Functions
function showRandomPrompt() {
    const randomPrompt = writingPrompts[Math.floor(Math.random() * writingPrompts.length)];
    promptText.textContent = randomPrompt;
}

// Mood Selection
function selectMood(mood) {
    selectedMood = mood;
    moodBtns.forEach(btn => btn.classList.remove('selected'));
    document.querySelector(`[data-mood="${mood}"]`).classList.add('selected');
}

// Editor Tools
function applyFormat(tool) {
    const textarea = journalEntryTextarea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let formattedText = '';
    
    switch(tool) {
        case 'bold':
            formattedText = `**${selectedText}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText}*`;
            break;
        case 'heading':
            formattedText = `# ${selectedText}`;
            break;
        case 'quote':
            formattedText = `> ${selectedText}`;
            break;
        case 'list':
            formattedText = `• ${selectedText}`;
            break;
        default:
            formattedText = selectedText;
    }
    
    textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    
    updateWritingStats();
}

// Tag Input Functions
function handleTagInput(e) {
    const input = e.target.value.toLowerCase();
    const lastTag = input.split(',').pop().trim();
    
    if (lastTag.length > 0) {
        const suggestions = commonTags.filter(tag => 
            tag.toLowerCase().includes(lastTag) && 
            !input.includes(tag)
        );
        showTagSuggestions(suggestions);
    } else {
        tagSuggestions.style.display = 'none';
    }
}

function showTagSuggestions(suggestions = commonTags.slice(0, 8)) {
    if (suggestions.length === 0) {
        tagSuggestions.style.display = 'none';
        return;
    }
    
    tagSuggestions.innerHTML = suggestions.map(tag => 
        `<div class="tag-suggestion" onclick="selectTag('${tag}')">${tag}</div>`
    ).join('');
    tagSuggestions.style.display = 'block';
}

// Make selectTag globally accessible for the onclick attribute
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

// Writing Stats
function updateWritingStats() {
    const content = journalEntryTextarea.value.trim();
    const words = content.split(/\s+/).filter(word => word.length > 0).length;
    const chars = content.length;
    const readMinutes = Math.ceil(words / 200); // Average reading speed
    
    wordCount.textContent = words;
    charCount.textContent = chars;
    readTime.textContent = readMinutes;
}

// Sidebar Functions
function toggleSidebar() {
    const token = localStorage.getItem('journal_token');
    if (!token) {
        showStatus('Please log in to access entries.', 'error');
        return;
    }
    
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        sidebar.classList.remove('open');
        sidebar.style.display = 'none';
        sidebarToggle.classList.remove('sidebar-open');
        toggleIcon.textContent = '📖';
    } else {
        sidebar.style.display = 'block';
        sidebar.classList.add('open');
        sidebarToggle.classList.add('sidebar-open');
        toggleIcon.textContent = '✖️';
        loadEntries();
    }
}

function handleSearch() {
    const query = searchBox.value.toLowerCase();
    filterAndRenderEntries(query);
}

function handleFilter() {
    const filter = filterSelect.value;
    const query = searchBox.value.toLowerCase();
    filterAndRenderEntries(query, filter);
}

function filterAndRenderEntries(query = '', filter = 'all') {
    let filteredEntries = [...currentEntries];
    
    // Apply text search
    if (query) {
        filteredEntries = filteredEntries.filter(entry =>
            entry.title.toLowerCase().includes(query) ||
            entry.content.toLowerCase().includes(query) ||
            (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(query)))
        );
    }
    
    // Apply date/mood filters
    const now = new Date();
    switch (filter) {
        case 'recent':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredEntries = filteredEntries.filter(entry => 
                new Date(entry.timestamp) >= weekAgo
            );
            break;
        case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
            filteredEntries = filteredEntries.filter(entry => 
                new Date(entry.timestamp) >= monthAgo
            );
            break;
        case 'mood':
            filteredEntries = filteredEntries.filter(entry => entry.mood);
            break;
    }
    
    renderEntryList(filteredEntries);
}

// Entry Management
function showEntryInViewer(entry) {
    activeEntryId = entry.timestamp;
    viewerTitle.textContent = entry.title || 'Untitled Entry';
    viewerDate.textContent = new Date(entry.timestamp).toLocaleString();
    viewerMood.textContent = entry.mood || '📝';
    viewerContent.textContent = entry.content;
    
    // Display tags
    if (entry.tags && entry.tags.length > 0) {
        viewerTags.innerHTML = entry.tags.map(tag => 
            `<span class="tag">${escapeHtml(tag)}</span>`
        ).join('');
    } else {
        viewerTags.innerHTML = '';
    }
    
    entryViewer.classList.add('active');
    
    // Update active state in sidebar
    document.querySelectorAll('.entry-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-entry-id="${entry.timestamp}"]`)?.classList.add('active');
}

function closeEntryViewer() {
    entryViewer.classList.remove('active');
    activeEntryId = null;
    document.querySelectorAll('.entry-item').forEach(item => {
        item.classList.remove('active');
    });
}

async function deleteEntry(timestamp) {
    const token = localStorage.getItem('journal_token');
    if (!token) {
        showStatus('Please log in to delete entries.', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
        return;
    }
    
    const { response, data } = await makeApiCall(`/entries/${timestamp}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
        showStatus('Entry deleted successfully!', 'success');
        if (activeEntryId === timestamp) {
            closeEntryViewer();
        }
        await loadEntries();
    } else {
        if (response.status === 401) {
            showStatus('Session expired. Please log in again.', 'error');
            handleLogout();
        } else {
            showStatus(data.error || 'Failed to delete entry.', 'error');
        }
    }
}

// Export Functions
function exportEntries(format) {
    if (currentEntries.length === 0) {
        showStatus('No entries to export.', 'error');
        exportModal.classList.remove('active');
        return;
    }
    
    const exportData = {
        exportDate: new Date().toISOString(),
        user: currentUser,
        totalEntries: currentEntries.length,
        entries: currentEntries
    };
    
    let content, filename, mimeType;
    
    if (format === 'json') {
        content = JSON.stringify(exportData, null, 2);
        filename = `journal-export-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
    } else {
        content = generateTextExport(exportData);
        filename = `journal-export-${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain';
    }
    
    downloadFile(content, filename, mimeType);
    exportModal.classList.remove('active');
    showStatus('Journal exported successfully!', 'success');
}

function generateTextExport(exportData) {
    let text = `PRIVATE JOURNAL EXPORT\n`;
    text += `User: ${exportData.user}\n`;
    text += `Export Date: ${new Date(exportData.exportDate).toLocaleString()}\n`;
    text += `Total Entries: ${exportData.totalEntries}\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    exportData.entries.forEach((entry, index) => {
        text += `ENTRY ${index + 1}\n`;
        text += `Title: ${entry.title || 'Untitled'}\n`;
        text += `Date: ${new Date(entry.timestamp).toLocaleString()}\n`;
        if (entry.mood) text += `Mood: ${entry.mood}\n`;
        if (entry.tags && entry.tags.length > 0) text += `Tags: ${entry.tags.join(', ')}\n`;
        text += `\n${entry.content}\n`;
        text += `${'-'.repeat(30)}\n\n`;
    });
    
    return text;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Authentication Functions
async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Improved API call function
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

// Improved Register function
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

// Improved Login function
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


// Logout Function
function handleLogout() { 
    localStorage.removeItem('journal_token'); 
    localStorage.removeItem('journal_user'); 
    authSection.style.display = 'block'; 
    journalSection.style.display = 'none'; 
    
    // Hide sidebar completely when logged out
    sidebarToggle.style.display = 'none';
    sidebar.style.display = 'none';
    sidebar.classList.remove('open');
    sidebarToggle.classList.remove('sidebar-open');
    
    // Clear sensitive data
    currentEntries = [];
    entryList.innerHTML = '';
    closeEntryViewer();
    currentUser = '';
    
    // Clear forms
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
    
    // Clear entry form
    document.getElementById('entry-title').value = '';
    journalEntryTextarea.value = '';
    entryTags.value = '';
    selectedMood = '';
    moodBtns.forEach(btn => btn.classList.remove('selected'));
    updateWritingStats();
    
    showStatus('👋 Successfully logged out!', 'success');
}

// Save Entry Function
async function handleSaveEntry() {
    const title = document.getElementById('entry-title').value.trim();
    const content = journalEntryTextarea.value.trim();
    const tags = entryTags.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const token = localStorage.getItem('journal_token');
    
    if (!content) {
        showStatus('Please write something before saving.', 'error');
        journalEntryTextarea.focus();
        return;
    }
    
    // Show loading state
    saveBtn.innerHTML = '<span class="loading-spinner"></span>Saving...';
    saveBtn.disabled = true;
    
    try {
        const entryData = {
            title: title || '',
            content,
            mood: selectedMood,
            tags: tags
        };
        
        const { response, data } = await makeApiCall('/entries', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(entryData)
        });
        
        if (response.ok) {
            showStatus('✨ Entry saved successfully!', 'success');
            
            // Clear the form
            document.getElementById('entry-title').value = '';
            journalEntryTextarea.value = '';
            entryTags.value = '';
            selectedMood = '';
            moodBtns.forEach(btn => btn.classList.remove('selected'));
            updateWritingStats();
            
            // Close entry viewer and reload entries
            closeEntryViewer();
            await loadEntries();
            
            // Show new random prompt
            showRandomPrompt();
            
        } else {
            if (response.status === 401) {
                showStatus('Session expired. Please log in again.', 'error');
                handleLogout();
            } else {
                showStatus(data.error || 'Failed to save entry.', 'error');
            }
        }
    } catch (error) {
        showStatus('Failed to save entry. Please try again.', 'error');
    } finally {
        saveBtn.innerHTML = '💾 Save Entry';
        saveBtn.disabled = false;
    }
}

// Load Entries Function
async function loadEntries() {
    const token = localStorage.getItem('journal_token');
    if (!token) {
        currentEntries = [];
        entryList.innerHTML = '<p style="text-align: center; color: var(--primary-link-color); font-size: 0.9rem;">Please log in to view entries.</p>';
        return;
    }
    
    try {
        const { response, data } = await makeApiCall('/entries', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentEntries = data;
            renderEntryList();
        } else if (response.status === 401) {
            showStatus('Session expired. Please log in again.', 'error');
            handleLogout();
        } else {
            currentEntries = [];
            entryList.innerHTML = '<p style="text-align: center; color: var(--primary-link-color); font-size: 0.9rem;">Failed to load entries.</p>';
        }
    } catch (error) {
        currentEntries = [];
        entryList.innerHTML = '<p style="text-align: center; color: var(--primary-link-color); font-size: 0.9rem;">Failed to load entries.</p>';
    }
}

function renderEntryList(entries = currentEntries) {
    if (entries.length === 0) {
        entryList.innerHTML = '<p style="text-align: center; color: var(--primary-link-color); font-size: 0.9rem;">📝 No entries found. Start writing your first entry!</p>';
        return;
    }
    
    const entriesHtml = entries.map(entry => {
        const date = new Date(entry.timestamp).toLocaleDateString();
        const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const title = entry.title || 'Untitled Entry';
        const preview = entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : '');
        const mood = entry.mood || '📝';
        const tags = entry.tags && entry.tags.length > 0 ? 
            entry.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : '';
        
        return `
            <div class="entry-item fade-in-up" data-entry-id="${entry.timestamp}">
                <div class="entry-mood">${mood}</div>
                <button class="entry-delete" onclick="deleteEntry(${entry.timestamp})" title="Delete entry">×</button>
                <div class="entry-title">${escapeHtml(title)}</div>
                <div class="entry-date">${date} at ${time}</div>
                <div class="entry-content-preview">${escapeHtml(preview)}</div>
                ${tags ? `<div class="entry-tags">${tags}</div>` : ''}
            </div>
        `;
    }).join('');
    
    entryList.innerHTML = entriesHtml;
    
    // Add click listeners to entry items
    document.querySelectorAll('.entry-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('entry-delete')) return;
            
            const entryId = parseInt(item.dataset.entryId);
            const entry = currentEntries.find(e => e.timestamp === entryId);
            if (entry) {
                showEntryInViewer(entry);
            }
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// UI View Management
function showJournalView() { 
    authSection.style.display = 'none'; 
    journalSection.style.display = 'block'; 
    sidebarToggle.style.display = 'block';
    toggleIcon.textContent = '📖';
    
    const username = localStorage.getItem('journal_user');
    currentUser = username;
    welcomeMessage.innerHTML = `
        <span style="background: linear-gradient(135deg, var(--orange-color), #ff6b6b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            Welcome back, ${username}! ✨
        </span>
    `;
    
    loadEntries(); 
    updateWritingStats();
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

// Add some visual feedback and animations on page load
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    
    // Animate only the visible form elements
    const animateVisibleForm = (container) => {
        const formElements = container.querySelectorAll('.input-group, .btn, p');
        formElements.forEach((el, index) => {
            el.style.animationDelay = `${index * 0.1}s`;
            el.classList.add('fade-in-up');
        });
    };

    // Animate the initially visible auth section
    if (loginForm.style.display !== 'none') {
        animateVisibleForm(authSection);
    }
});

// Add some Easter eggs and fun interactions
let clickCount = 0;
document.querySelector('h1').addEventListener('click', () => {
    clickCount++;
    if (clickCount === 5) {
        document.querySelector('h1').style.transform = 'scale(1.1) rotate(5deg)';
        setTimeout(() => {
            document.querySelector('h1').style.transform = '';
        }, 500);
        showStatus('🎉 You found an Easter egg! Keep writing!', 'success');
        clickCount = 0;
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (journalSection.style.display !== 'none') {
            handleSaveEntry();
        }
    }
    
    // Ctrl/Cmd + E to export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (journalSection.style.display !== 'none') {
            exportModal.classList.add('active');
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        exportModal.classList.remove('active');
        if (entryViewer.classList.contains('active')) {
            closeEntryViewer();
        }
    }
});

// Add typing sound effect simulation (visual feedback)
let typingTimer;
journalEntryTextarea.addEventListener('input', () => {
    journalEntryTextarea.style.borderColor = 'var(--orange-color)';
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        journalEntryTextarea.style.borderColor = '';
    }, 1000);
});

// Initial setup completion
console.log('🎉 Enhanced Private Journal App loaded successfully!');

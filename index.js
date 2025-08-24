// src/index.js

import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

// Define CORS headers that will be added to every response
const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
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
        // Route for deleting a journal entry
        if (url.pathname.startsWith('/entries/') && request.method === 'DELETE') {
            return handleDeleteEntry(request, env);
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
    
    const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Private Journal</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code&family=Roboto+Mono&family=Lora:wght@400;500;700&family=Inter:wght@300;400;500;600;700&display=swap');
        
        :root {
            --primary-background-color: #1C1C1C;
            --primary-font-color: #FFFFFC;
            --primary-link-color: rgba(255, 255, 252, 0.75);
            --orange-color: #F05E1C;
            --sidebar-width: 420px;
            --gradient-1: #1a1a2e;
            --gradient-2: #16213e;
            --glass-bg: rgba(255, 255, 255, 0.1);
            --glass-border: rgba(255, 255, 255, 0.2);
        }
        
        [data-theme="light"] {
            --primary-background-color: #f8f9fa;
            --primary-font-color: #2d3748;
            --primary-link-color: rgba(45, 55, 72, 0.75);
            --gradient-1: #e2e8f0;
            --gradient-2: #cbd5e0;
            --glass-bg: rgba(255, 255, 255, 0.8);
            --glass-border: rgba(0, 0, 0, 0.1);
        }
        
        * { box-sizing: border-box; }
        
        body {
            margin: 0;
            background-color: var(--primary-background-color);
            color: var(--primary-font-color);
            font-family: "Inter", sans-serif;
            font-size: 1rem;
            line-height: 1.6;
            overflow-x: hidden;
            position: relative;
        }
        
        /* Animated gradient background */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, 
                var(--primary-background-color), 
                var(--gradient-1), 
                var(--gradient-2));
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
            z-index: -1;
        }
        
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
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
            background: linear-gradient(135deg, 
                var(--glass-bg) 0%,
                rgba(255, 255, 255, 0.05) 100%);
            backdrop-filter: blur(20px) saturate(180%);
            border-radius: 1rem;
            padding: 2.5rem;
            width: 100%;
            max-width: 50rem;
            border: 1px solid var(--glass-border);
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
        }
        
        .journal-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--orange-color), #ff6b6b, var(--orange-color));
            background-size: 200% 100%;
            animation: shimmer 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        
        /* Theme Toggle */
        .theme-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            color: var(--primary-font-color);
            padding: 0.75rem;
            border-radius: 50%;
            cursor: pointer;
            z-index: 1001;
            font-size: 1.2rem;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        
        .theme-toggle:hover {
            background: var(--orange-color);
            transform: rotate(180deg);
        }
        
        /* Sidebar Styles */
        .sidebar {
            position: fixed;
            top: 0;
            right: -var(--sidebar-width);
            width: var(--sidebar-width);
            height: 100vh;
            background: linear-gradient(135deg, 
                rgba(28, 28, 28, 0.95) 0%,
                rgba(45, 45, 45, 0.9) 100%);
            backdrop-filter: blur(20px);
            border-left: 1px solid var(--glass-border);
            transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1000;
            overflow-y: auto;
            padding: 2rem 1.5rem;
            display: none;
        }
        
        [data-theme="light"] .sidebar {
            background: linear-gradient(135deg, 
                rgba(248, 249, 250, 0.95) 0%,
                rgba(237, 242, 247, 0.9) 100%);
        }
        
        .sidebar.open {
            right: 0;
            display: block;
        }
        
        .sidebar-toggle {
            position: fixed;
            top: 50%;
            right: 15px;
            transform: translateY(-50%);
            background: linear-gradient(135deg, var(--orange-color), #ff6b6b);
            border: none;
            color: white;
            padding: 1rem 0.7rem;
            border-radius: 1rem 0 0 1rem;
            cursor: pointer;
            z-index: 999;
            font-size: 1.2rem;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: none;
            box-shadow: 0 4px 15px rgba(240, 94, 28, 0.3);
        }
        
        .sidebar-toggle:hover {
            background: linear-gradient(135deg, rgba(240, 94, 28, 0.8), rgba(255, 107, 107, 0.8));
            padding-left: 1rem;
            box-shadow: 0 6px 20px rgba(240, 94, 28, 0.4);
        }
        
        .sidebar-toggle.sidebar-open {
            right: calc(var(--sidebar-width) + 15px);
        }
        
        /* Sidebar Controls */
        .sidebar-controls {
            margin-bottom: 2rem;
        }
        
        .search-box, .filter-select {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid var(--glass-border);
            border-radius: 0.5rem;
            background: var(--glass-bg);
            color: var(--primary-font-color);
            font-size: 0.9rem;
            margin-bottom: 1rem;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        
        .search-box:focus, .filter-select:focus {
            outline: none;
            border-color: var(--orange-color);
            box-shadow: 0 0 0 3px rgba(240, 94, 28, 0.1);
        }
        
        .sidebar h3 {
            color: var(--orange-color);
            margin-bottom: 1.5rem;
            text-align: center;
            font-size: 1.3rem;
            font-weight: 600;
        }
        
        .entry-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .entry-item {
            background: linear-gradient(135deg, 
                rgba(240, 94, 28, 0.1) 0%,
                var(--glass-bg) 100%);
            border: 1px solid var(--glass-border);
            border-left: 4px solid var(--orange-color);
            border-radius: 0.75rem;
            padding: 1.2rem;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            transform: translateX(0);
            backdrop-filter: blur(10px);
        }
        
        .entry-item:hover {
            background: linear-gradient(135deg, 
                rgba(240, 94, 28, 0.15) 0%,
                rgba(255, 255, 255, 0.1) 100%);
            border-color: var(--orange-color);
            transform: translateX(8px);
            box-shadow: 0 8px 25px rgba(240, 94, 28, 0.2);
        }
        
        .entry-item.active {
            background: linear-gradient(135deg, 
                rgba(240, 94, 28, 0.2) 0%,
                rgba(255, 107, 107, 0.1) 100%);
            border-color: var(--orange-color);
            transform: translateX(5px);
        }
        
        .entry-title {
            font-weight: 600;
            color: var(--orange-color);
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
            overflow: hidden;
            white-space: nowrap;
            animation: typewriter 0.5s steps(20) forwards;
        }
        
        @keyframes typewriter {
            from { width: 0; }
            to { width: 100%; }
        }
        
        .entry-date {
            font-size: 0.85rem;
            color: var(--primary-link-color);
            margin-bottom: 0.7rem;
            font-weight: 500;
        }
        
        .entry-content-preview {
            font-size: 0.9rem;
            opacity: 0.8;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            line-height: 1.4;
        }
        
        .entry-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.3rem;
            margin-top: 0.5rem;
        }
        
        .tag {
            background: rgba(240, 94, 28, 0.2);
            color: var(--orange-color);
            padding: 0.2rem 0.5rem;
            border-radius: 1rem;
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        .entry-mood {
            position: absolute;
            top: 1rem;
            right: 3rem;
            font-size: 1.2rem;
        }
        
        .entry-delete {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            color: white;
            border: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
        }
        
        .entry-item:hover .entry-delete {
            opacity: 1;
        }
        
        .entry-delete:hover {
            background: linear-gradient(135deg, #ee5a52, #e53e3e);
            transform: scale(1.1);
        }
        
        /* Entry Viewer */
        .entry-viewer {
            display: none;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border-radius: 1rem;
            padding: 2.5rem;
            margin-top: 2rem;
            border: 1px solid var(--glass-border);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        
        .entry-viewer.active {
            display: block;
            animation: fadeInUp 0.4s ease;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .entry-viewer h3 {
            color: var(--orange-color);
            margin-bottom: 1rem;
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .entry-viewer .entry-meta {
            color: var(--primary-link-color);
            font-size: 0.95rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .entry-viewer .entry-content {
            white-space: pre-wrap;
            line-height: 1.8;
            font-size: 1.1rem;
        }
        
        .close-viewer {
            background: linear-gradient(135deg, var(--orange-color), #ff6b6b);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            margin-bottom: 1.5rem;
            font-size: 0.95rem;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(240, 94, 28, 0.3);
        }
        
        .close-viewer:hover {
            background: linear-gradient(135deg, rgba(240, 94, 28, 0.8), rgba(255, 107, 107, 0.8));
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(240, 94, 28, 0.4);
        }
        
        h1, h2 {
            text-align: center;
            color: var(--orange-color);
            margin-bottom: 2rem;
            font-weight: 600;
            background: linear-gradient(135deg, var(--orange-color), #ff6b6b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 3rem;
        }
        
        /* Input Styles */
        .input-group {
            margin-bottom: 2rem;
            position: relative;
        }
        
        .input-group.floating {
            margin-top: 1.5rem;
        }
        
        label {
            display: block;
            margin-bottom: 0.7rem;
            color: var(--primary-link-color);
            font-weight: 500;
            font-size: 0.95rem;
            transition: all 0.3s ease;
        }
        
        .floating-label {
            position: absolute;
            top: 1rem;
            left: 1rem;
            transition: all 0.3s ease;
            pointer-events: none;
            color: var(--primary-link-color);
            background: var(--primary-background-color);
            padding: 0 0.5rem;
            border-radius: 0.25rem;
        }
        
        input[type="password"], 
        input[type="text"], 
        textarea, 
        select {
            width: 100%;
            padding: 1.2rem 1rem;
            border: 2px solid var(--glass-border);
            border-radius: 0.75rem;
            font-size: 1rem;
            background: var(--glass-bg);
            color: var(--primary-font-color);
            font-family: inherit;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
        }
        
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: var(--orange-color);
            box-shadow: 0 0 0 4px rgba(240, 94, 28, 0.1);
            transform: translateY(-2px);
        }
        
        input:focus + .floating-label,
        input:not(:placeholder-shown) + .floating-label {
            top: -0.7rem;
            left: 0.7rem;
            font-size: 0.8rem;
            color: var(--orange-color);
            font-weight: 600;
        }
        
        textarea {
            min-height: 18rem;
            resize: vertical;
            font-family: "Lora", serif;
            line-height: 1.8;
        }
        
        /* Editor Container */
        .editor-container {
            position: relative;
        }
        
        .editor-toolbar {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
            padding: 1rem;
            background: var(--glass-bg);
            border-radius: 0.5rem;
            backdrop-filter: blur(10px);
        }
        
        .tool-btn {
            background: rgba(240, 94, 28, 0.1);
            border: 1px solid rgba(240, 94, 28, 0.3);
            color: var(--orange-color);
            padding: 0.5rem 0.8rem;
            border-radius: 0.4rem;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .tool-btn:hover, .tool-btn.active {
            background: rgba(240, 94, 28, 0.2);
            border-color: var(--orange-color);
            transform: translateY(-1px);
        }
        
        /* Mood Selector */
        .mood-selector {
            margin-bottom: 2rem;
        }
        
        .mood-options {
            display: flex;
            gap: 0.8rem;
            justify-content: center;
            margin-top: 0.7rem;
        }
        
        .mood-btn {
            background: var(--glass-bg);
            border: 2px solid var(--glass-border);
            border-radius: 50%;
            width: 3.5rem;
            height: 3.5rem;
            font-size: 1.5rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
        }
        
        .mood-btn:hover {
            transform: scale(1.1) rotate(5deg);
            border-color: var(--orange-color);
            box-shadow: 0 4px 15px rgba(240, 94, 28, 0.3);
        }
        
        .mood-btn.selected {
            border-color: var(--orange-color);
            background: rgba(240, 94, 28, 0.1);
            transform: scale(1.05);
        }
        
        /* Writing Stats */
        .writing-stats {
            display: flex;
            gap: 2rem;
            justify-content: center;
            margin: 1rem 0;
            padding: 1rem;
            background: var(--glass-bg);
            border-radius: 0.75rem;
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-value {
            display: block;
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--orange-color);
        }
        
        .stat-label {
            font-size: 0.8rem;
            color: var(--primary-link-color);
            margin-top: 0.2rem;
        }
        
        /* Writing Prompt */
        .writing-prompt {
            background: linear-gradient(135deg, rgba(240, 94, 28, 0.1), rgba(255, 107, 107, 0.05));
            border: 1px solid rgba(240, 94, 28, 0.3);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 2rem;
            text-align: center;
            position: relative;
        }
        
        .prompt-text {
            font-style: italic;
            font-size: 1.1rem;
            color: var(--orange-color);
            margin-bottom: 1rem;
        }
        
        .new-prompt-btn {
            background: rgba(240, 94, 28, 0.2);
            border: 1px solid var(--orange-color);
            color: var(--orange-color);
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        
        .new-prompt-btn:hover {
            background: rgba(240, 94, 28, 0.3);
        }
        
        /* Tags Input */
        .tags-input-container {
            position: relative;
        }
        
        .tag-suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 0.5rem;
            backdrop-filter: blur(20px);
            max-height: 200px;
            overflow-y: auto;
            z-index: 100;
            display: none;
        }
        
        .tag-suggestion {
            padding: 0.7rem 1rem;
            cursor: pointer;
            transition: background 0.2s ease;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .tag-suggestion:hover {
            background: rgba(240, 94, 28, 0.1);
        }
        
        .tag-suggestion:last-child {
            border-bottom: none;
        }
        
        /* Button Styles */
        .btn {
            background: linear-gradient(135deg, var(--orange-color), #ff6b6b);
            color: white;
            border: none;
            padding: 1.2rem 2.5rem;
            border-radius: 0.75rem;
            font-size: 1rem;
            cursor: pointer;
            font-family: inherit;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin: 0.7rem 0.5rem;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(240, 94, 28, 0.3);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .btn::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        
        .btn:active::after {
            width: 300px;
            height: 300px;
        }
        
        .btn:hover {
            background: linear-gradient(135deg, rgba(240, 94, 28, 0.8), rgba(255, 107, 107, 0.8));
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(240, 94, 28, 0.4);
        }
        
        .btn-secondary {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .btn-secondary:hover {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1));
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .export-btn {
            background: linear-gradient(135deg, #10b981, #059669);
        }
        
        .export-btn:hover {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.8));
        }
        
        /* Loading Spinner */
        .loading-spinner {
            width: 24px;
            height: 24px;
            border: 3px solid rgba(240, 94, 28, 0.3);
            border-top: 3px solid var(--orange-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: inline-block;
            margin-right: 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Messages */
        .error-message, .success-message {
            padding: 1.2rem 1.5rem;
            border-radius: 0.75rem;
            margin: 1.5rem 0;
            text-align: center;
            font-weight: 500;
            backdrop-filter: blur(20px);
            border: 1px solid;
            animation: slideIn 0.4s ease;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .error-message {
            color: #ff6b6b;
            background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(238, 90, 82, 0.05));
            border-color: rgba(255, 107, 107, 0.3);
        }
        
        .success-message {
            color: #10b981;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05));
            border-color: rgba(16, 185, 129, 0.3);
        }
        
        a {
            color: var(--orange-color);
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        a:hover {
            text-decoration: underline;
            color: #ff6b6b;
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
            :root {
                --sidebar-width: 100vw;
            }
            
            .sidebar-toggle.sidebar-open {
                right: 15px;
            }
            
            .journal-container {
                padding: 2rem 1.5rem;
                margin: 1rem;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .writing-stats {
                flex-direction: column;
                gap: 1rem;
            }
            
            .mood-options {
                flex-wrap: wrap;
                gap: 0.5rem;
            }
            
            .mood-btn {
                width: 3rem;
                height: 3rem;
                font-size: 1.3rem;
            }
            
            .btn {
                padding: 1rem 2rem;
                margin: 0.5rem 0.25rem;
            }
        }
        
        /* Export Modal */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s ease;
        }
        
        .modal-overlay.active {
            opacity: 1;
            pointer-events: all;
        }
        
        .modal {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 1rem;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            transform: scale(0.9);
            transition: all 0.3s ease;
        }
        
        .modal-overlay.active .modal {
            transform: scale(1);
        }
        
        .modal h3 {
            color: var(--orange-color);
            margin-bottom: 1.5rem;
            text-align: center;
        }
        
        .modal-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 2rem;
        }
        
        .modal-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .modal-btn.primary {
            background: var(--orange-color);
            color: white;
        }
        
        .modal-btn.secondary {
            background: rgba(255, 255, 255, 0.1);
            color: var(--primary-font-color);
        }
        
        /* Scroll Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .fade-in-up {
            animation: fadeInUp 0.6s ease forwards;
        }
    </style>
</head>
<body>
        <button class="theme-toggle" id="theme-toggle" title="Toggle theme">🌙</button>
    
    <main id="main-content">
        <div class="journal-container">
            <h1>✨ Private Journal ✨</h1>
            
            <div id="auth-section">
                <div id="login-form">
                    <h2>Welcome Back</h2>
                    <div class="input-group floating">
                        <input type="text" id="login-username" placeholder=" ">
                        <label class="floating-label">Username</label>
                    </div>
                    <div class="input-group floating">
                        <input type="password" id="login-password" placeholder=" ">
                        <label class="floating-label">Password</label>
                    </div>
                    <div style="text-align: center;">
                        <button id="login-btn" class="btn">Sign In</button>
                    </div>
                    <p style="text-align: center;">Don't have an account? <a href="#" id="show-register">Create one here</a>.</p>
                </div>
                
                <div id="register-form" style="display: none;">
                    <h2>Join Us</h2>
                    <div class="input-group floating">
                        <input type="text" id="register-username" placeholder=" ">
                        <label class="floating-label">Choose Username</label>
                    </div>
                    <div class="input-group floating">
                        <input type="password" id="register-password" placeholder=" ">
                        <label class="floating-label">Create Password</label>
                    </div>
                    <div style="text-align: center;">
                        <button id="register-btn" class="btn">Create Account</button>
                    </div>
                    <p style="text-align: center;">Already have an account? <a href="#" id="show-login">Sign in here</a>.</p>
                </div>
                
                <div id="auth-error" class="error-message" style="display: none;"></div>
            </div>
            
            <div id="journal-section" style="display: none;">
                <h2 id="welcome-message"></h2>
                
                                <div class="writing-prompt" id="writing-prompt-section">
                    <div class="prompt-text" id="prompt-text">What made you smile today?</div>
                    <button class="new-prompt-btn" id="new-prompt-btn">✨ New Prompt</button>
                </div>
                
                                <div class="input-group">
                    <label for="font-selector">Writing Font:</label>
                    <select id="font-selector">
                        <option value="'Lora', serif">Lora (Elegant)</option>
                        <option value="'Fira Code', monospace">Fira Code (Code)</option>
                        <option value="'Roboto Mono', monospace">Roboto Mono (Clean)</option>
                        <option value="'Inter', sans-serif">Inter (Modern)</option>
                    </select>
                </div>
                
                                <div class="mood-selector">
                    <label>How are you feeling?</label>
                    <div class="mood-options">
                        <button class="mood-btn" data-mood="😊" title="Happy">😊</button>
                        <button class="mood-btn" data-mood="😐" title="Neutral">😐</button>
                        <button class="mood-btn" data-mood="😔" title="Sad">😔</button>
                        <button class="mood-btn" data-mood="🤩" title="Excited">🤩</button>
                        <button class="mood-btn" data-mood="😰" title="Anxious">😰</button>
                        <button class="mood-btn" data-mood="🤔" title="Thoughtful">🤔</button>
                        <button class="mood-btn" data-mood="😴" title="Tired">😴</button>
                        <button class="mood-btn" data-mood="💪" title="Motivated">💪</button>
                    </div>
                </div>
                
                                <div class="input-group floating">
                    <input type="text" id="entry-title" placeholder=" ">
                    <label class="floating-label">Entry Title (optional)</label>
                </div>
                
                                <div class="input-group tags-input-container">
                    <label for="entry-tags">Tags (comma-separated):</label>
                    <input type="text" id="entry-tags" placeholder="work, personal, ideas, gratitude...">
                    <div class="tag-suggestions" id="tag-suggestions"></div>
                </div>
                
                                <div class="editor-container">
                    <div class="editor-toolbar">
                        <button class="tool-btn" data-tool="bold" title="Bold">**B**</button>
                        <button class="tool-btn" data-tool="italic" title="Italic">*I*</button>
                        <button class="tool-btn" data-tool="heading" title="Heading"># H</button>
                        <button class="tool-btn" data-tool="quote" title="Quote">" Quote</button>
                        <button class="tool-btn" data-tool="list" title="List">• List</button>
                    </div>
                    <div class="input-group">
                        <label for="journal-entry">Your thoughts:</label>
                        <textarea id="journal-entry" placeholder="Start writing your story..."></textarea>
                    </div>
                </div>
                
                                <div class="writing-stats" id="writing-stats">
                    <div class="stat-item">
                        <span class="stat-value" id="word-count">0</span>
                        <span class="stat-label">words</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="char-count">0</span>
                        <span class="stat-label">characters</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="read-time">0</span>
                        <span class="stat-label">min read</span>
                    </div>
                </div>
                
                                <div style="text-align: center;">
                    <button id="save-btn" class="btn">💾 Save Entry</button>
                    <button id="export-btn" class="btn export-btn">📄 Export All</button>
                    <button id="logout-btn" class="btn btn-secondary">👋 Logout</button>
                </div>
                
                <div id="save-status" style="display: none;"></div>
                
                                <div id="entry-viewer" class="entry-viewer">
                    <button class="close-viewer" id="close-viewer">← Back to Writing</button>
                    <h3 id="viewer-title">Entry Title</h3>
                    <div class="entry-meta" id="viewer-meta">
                        <span id="viewer-date">Date</span>
                        <span id="viewer-mood">😊</span>
                        <div id="viewer-tags" class="entry-tags"></div>
                    </div>
                    <div class="entry-content" id="viewer-content">Entry content will appear here...</div>
                </div>
            </div>
        </div>
    </main>
    
        <button class="sidebar-toggle" id="sidebar-toggle">
        <span id="toggle-icon">📖</span>
    </button>
    
        <div class="sidebar" id="sidebar">
        <h3>📚 Your Journal</h3>
        
                <div class="sidebar-controls">
            <input type="text" class="search-box" id="search-box" placeholder="🔍 Search entries...">
            <select class="filter-select" id="filter-select">
                <option value="all">All entries</option>
                <option value="recent">Last 7 days</option>
                <option value="month">This month</option>
                <option value="mood">By mood</option>
            </select>
        </div>
        
        <div class="entry-list" id="entry-list">
            <p style="text-align: center; color: var(--primary-link-color); font-size: 0.9rem;">Loading entries...</p>
        </div>
    </div>
    
        <div class="modal-overlay" id="export-modal">
        <div class="modal">
            <h3>📄 Export Your Journal</h3>
            <p>Choose your export format:</p>
            <div class="modal-buttons">
                <button class="modal-btn primary" id="export-json">JSON Format</button>
                <button class="modal-btn primary" id="export-txt">Text Format</button>
                <button class="modal-btn secondary" id="cancel-export">Cancel</button>
            </div>
        </div>
    </div>

    <script>
        // API Configuration
        const apiUrl = '${apiUrl}';
        
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
  _4000_           "What's a skill you'd like to develop?",
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
            document.querySelector(\`[data-mood="\${mood}"]\`).classList.add('selected');
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
                    formattedText = \`**\${selectedText}**\`;
                    break;
                case 'italic':
                    formattedText = \`*\${selectedText}*\`;
                    break;
                case 'heading':
                    formattedText = \`# \${selectedText}\`;
                    break;
                case 'quote':
                    formattedText = \`> \${selectedText}\`;
                    break;
                case 'list':
                    formattedText = \`• \${selectedText}\`;
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
                \`<div class="tag-suggestion" onclick="selectTag('\${tag}')">\${tag}</div>\`
            ).join('');
            tagSuggestions.style.display = 'block';
        }
        
        function selectTag(tag) {
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
            const words = content.split(/\\s+/).filter(word => word.length > 0).length;
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
                    \`<span class="tag">\${escapeHtml(tag)}</span>\`
                ).join('');
            } else {
                viewerTags.innerHTML = '';
            }
            
            entryViewer.classList.add('active');
            
            // Update active state in sidebar
            document.querySelectorAll('.entry-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(\`[data-entry-id="\${entry.timestamp}"]\`)?.classList.add('active');
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
            
            const { response, data } = await makeApiCall(\`/entries/\${timestamp}\`, {
                method: 'DELETE',
                headers: { 'Authorization': \`Bearer \${token}\` }
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
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        
        // Utility function to make API calls
        async function makeApiCall(endpoint, options = {}) {
            try {
                const url = `${apiUrl}${endpoint}`;
                console.log('Making API call to:', url);
                
                const requestOptions = {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                };
                
                console.log('Request options:', requestOptions);
                
                const response = await fetch(url, requestOptions);
                
                console.log('Response status:', response.status);
                console.log('Response headers:', Object.fromEntries(response.headers.entries()));
                
                let data;
                try {
                    const responseText = await response.text();
                    console.log('Response text:', responseText);
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
        
        // Register Function
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
                const hashedPassword = await hashPassword(password);
                const { response, data } = await makeApiCall('/register', {
                    method: 'POST',
                    body: JSON.stringify({ username, password: hashedPassword })
                });
                
                if (response.ok) { 
                    showAuthSuccess('🎉 Registration successful! Please log in.'); 
                    showLogin.click(); 
                } else { 
                    showAuthError(data.error || 'Registration failed.'); 
                }
            } catch (error) {
                showAuthError('Registration failed. Please try again.');
            } finally {
                registerBtn.innerHTML = 'Create Account';
                registerBtn.disabled = false;
            }
        }
        
        // Login Function
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
                const hashedPassword = await hashPassword(password);
                const { response, data } = await makeApiCall('/login', {
                    method: 'POST',
                    body: JSON.stringify({ username, password: hashedPassword })
                });
                
                if (response.ok) { 
                    console.log('Login successful, token received:', data.token ? 'Yes' : 'No');
                    localStorage.setItem('journal_token', data.token); 
                    localStorage.setItem('journal_user', username);
                    currentUser = username;
                    showJournalView(); 
                } else { 
                    showAuthError(data.error || 'Login failed.'); 
                }
            } catch (error) {
                showAuthError('Login failed. Please try again.');
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
            
            // CORRECTED: Animate only the visible form elements
            const animateVisibleForm = (container) => {
                const formElements = container.querySelectorAll('.input-group, .btn, p');
                formElements.forEach((el, index) => {
                    el.style.animationDelay = `${index * 0.1}s`;
                    el.classList.add('fade-in-up');
                });
            };

            // Animate the initially visible login form
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
        console.log('Features available:');
        console.log('- 🎨 Dark/Light theme toggle');
        console.log('- 😊 Mood tracking');
        console.log('- 🏷️ Tag system');
        console.log('- 📊 Writing statistics');
        console.log('- 💡 Writing prompts');
        console.log('- 📄 Export functionality');
        console.log('- 🔍 Search and filtering');
        console.log('- ⌨️ Keyboard shortcuts (Ctrl+S, Ctrl+E, Escape)');
        console.log('- 🎭 Rich text formatting tools');
        console.log('- 📱 Mobile responsive design');
        
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

        // ADDED: Server-side validation for the received password hash format (SHA-256)
        if (typeof password !== 'string' || !/^[a-f0-9]{64}$/.test(password)) {
            return new Response(JSON.stringify({ error: 'Invalid password format' }), { 
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
            console.error('JWT_SECRET not configured');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        try {
            const token = await sign({ 
                username, 
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
            }, secret);
            
            return new Response(JSON.stringify({ token }), { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        } catch (signError) {
            console.error('JWT signing error:', signError);
            return new Response(JSON.stringify({ error: 'Authentication error' }), { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
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
        return new Response(JSON.stringify({ error: 'Unauthorized - No token provided' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    try {
        const token = authHeader.substring(7);
        
        if (!env.JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        let payload;
        try {
            const isValid = await verify(token, env.JWT_SECRET);
            console.log('JWT verification result:', isValid);
            
            if (!isValid) {
                console.log('JWT verification failed');
                return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                    status: 401, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }
            
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.log('Invalid token format');
                return new Response(JSON.stringify({ error: 'Invalid token format' }), { 
                    status: 401, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }
            
            try {
                const payloadB64 = parts[1];
                const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
                payload = JSON.parse(payloadJson);
                console.log('Decoded JWT payload:', payload);
            } catch (decodeError) {
                console.error('Failed to decode JWT payload:', decodeError);
                return new Response(JSON.stringify({ error: 'Invalid token payload' }), { 
                    status: 401, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }
            
        } catch (verifyError) {
            console.error('JWT verify error:', verifyError);
            return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        if (!payload || !payload.username) {
            console.log('Invalid payload structure:', payload);
            return new Response(JSON.stringify({ error: 'Invalid token payload' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        // CORRECTED: Destructure all relevant fields from the request body
        const { title, content, mood, tags } = await request.json();

        if (!content || content.trim() === '') {
            return new Response(JSON.stringify({ error: 'Content is required' }), { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        const timestamp = Date.now();
        const entryKey = `entry:${payload.username}:${timestamp}`;
        
        // CORRECTED: Include mood and tags in the data to be stored
        const entryData = {
            title: title || '',
            content: content.trim(),
            mood: mood || '', // Use the provided mood or default to empty string
            tags: tags || [],   // Use the provided tags or default to an empty array
            timestamp
        };

        await env.JOURNAL_KV.put(entryKey, JSON.stringify(entryData));
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (e) {
        console.error('Save entry error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}

// API endpoint to retrieve all journal entries for a user.
async function handleGetEntries(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized - No token provided' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    try {
        const token = authHeader.substring(7);
        
        if (!env.JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        let payload;
        try {
            const isValid = await verify(token, env.JWT_SECRET);
            console.log('JWT verification result (get entries):', isValid);
            
            if (!isValid) {
                console.log('JWT verification failed (get entries)');
                return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                    status: 401, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }
            
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.log('Invalid token format (get entries)');
                return new Response(JSON.stringify({ error: 'Invalid token format' }), { 
                    status: 401, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }
            
            try {
                const payloadB64 = parts[1];
                const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
                payload = JSON.parse(payloadJson);
                console.log('Decoded JWT payload (get entries):', payload);
            } catch (decodeError) {
                console.error('Failed to decode JWT payload (get entries):', decodeError);
                return new Response(JSON.stringify({ error: 'Invalid token payload' }), { 
                    status: 401, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }
            
        } catch (verifyError) {
            console.error('JWT verify error (get entries):', verifyError);
            return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        if (!payload || !payload.username) {
            console.log('Invalid payload structure:', payload);
            return new Response(JSON.stringify({ error: 'Invalid token payload' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const list = await env.JOURNAL_KV.list({ prefix: `entry:${payload.username}:` });
        const promises = list.keys.map(async (key) => {
            const value = await env.JOURNAL_KV.get(key.name);
            if (!value) return null;
            
            try {
                return JSON.parse(value);
            } catch (e) {
                return {
                    title: '',
                    content: value,
                    timestamp: parseInt(key.name.split(':')[2]) || 0,
                };
            }
        });
        
        const entries = (await Promise.all(promises)).filter(entry => entry !== null);
        
        // Sort by timestamp, newest first
        entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        return new Response(JSON.stringify(entries), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (e) {
        console.error('Get entries error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}

// API endpoint to delete a journal entry.
async function handleDeleteEntry(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized - No token provided' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    try {
        const token = authHeader.substring(7);
        
        if (!env.JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        let payload;
        try {
            const isValid = await verify(token, env.JWT_SECRET);
            
            if (!isValid) {
                return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                    status: 401, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }
            
            const parts = token.split('.');
            if (parts.length !== 3) {
                return new Response(JSON.stringify({ error: 'Invalid token format' }), { 
                    status: 401, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }
            
            const payloadB64 = parts[1];
            const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
            payload = JSON.parse(payloadJson);
            
        } catch (verifyError) {
            console.error('JWT verify error (delete entry):', verifyError);
            return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        if (!payload || !payload.username) {
            return new Response(JSON.stringify({ error: 'Invalid token payload' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        // Extract timestamp from URL
        const url = new URL(request.url);
        const timestamp = url.pathname.split('/entries/')[1];
        
        if (!timestamp) {
            return new Response(JSON.stringify({ error: 'Entry timestamp required' }), { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        const entryKey = `entry:${payload.username}:${timestamp}`;
        
        // Check if entry exists
        const existingEntry = await env.JOURNAL_KV.get(entryKey);
        if (!existingEntry) {
            return new Response(JSON.stringify({ error: 'Entry not found' }), { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        // Delete the entry
        await env.JOURNAL_KV.delete(entryKey);
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (e) {
        console.error('Delete entry error:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}

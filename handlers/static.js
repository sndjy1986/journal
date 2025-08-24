// This handler is responsible for serving the main HTML page.
// In a real-world Cloudflare Worker project with a build step (using Wrangler),
// you would import the HTML file as a string.
import html from '../view/index.html';

export async function handleStatic(request, env) {
    // Note: The original code dynamically inserted the API URL.
    // In a multi-file setup, it's better to have the client-side JS
    // assume the API is on the same host, so we don't need to modify the HTML string.
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html;charset=UTF-8',
        },
    });
}

# 📓 Cloudflare Journal Worker

A secure, private, and serverless journaling application built entirely on the Cloudflare stack. This project uses Cloudflare Workers for compute, Cloudflare KV for storage, and serves a feature-rich, single-page application directly from the edge.

## 🧐 About

This project is a demonstration of a complete, full-stack application running without traditional servers. The front-end (HTML, CSS, and JavaScript) is bundled into and served by a single Cloudflare Worker, which also provides a secure backend API for user authentication and data persistence. Journal entries are stored securely in Cloudflare's key-value data store, KV.

It's designed to be fast, scalable, and cost-effective, leveraging the power of Cloudflare's global network.

## ✨ Features

* **Secure Authentication**: User registration and login system using JSON Web Tokens (JWT).
* **Persistent Storage**: Journal entries are securely saved in Cloudflare KV.
* **Rich Editor**: A clean writing interface with mood tracking, tagging, and basic markdown formatting tools.
* **Dynamic Prompts**: Get inspired with randomly generated writing prompts.
* **Entry Management**: A collapsible sidebar allows you to easily browse, search, and filter your past entries.
* **Data Portability**: Export all your journal entries to JSON or a plain text file at any time.
* **Customizable UI**:
    * Toggle between light and dark themes.
    * Choose from several writing fonts.
* **Serverless Architecture**: No servers to manage or maintain.
* **All-in-One Deployment**: The entire application is deployed with a single `wrangler deploy` command.

## 🛠️ Built With

* [**Cloudflare Workers**](https://workers.cloudflare.com/) - Serverless execution environment
* [**Cloudflare KV**](https://developers.cloudflare.com/workers/learning/how-kv-works/) - Global, low-latency key-value data store
* [**Wrangler CLI**](https://developers.cloudflare.com/workers/wrangler/) - CLI for building and managing Cloudflare developer projects
* **Vanilla JavaScript, HTML & CSS** - No frameworks, just the fundamentals.
* **JSON Web Tokens (JWT)** - For secure authentication.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You need to have Node.js, npm, and the Wrangler CLI installed.

* **npm**
    ```sh
    npm install npm@latest -g
    ```
* **Wrangler CLI**
    ```sh
    npm install -g wrangler
    ```

### Installation

1.  **Clone the repo**
    ```bash
    git clone {https://github.com/your-username/your-repository.git]](https://github.com/sndjy1986/journal.git)
    cd your-repository
    ```
2.  **Install NPM packages**
    ```bash
    npm install
    ```
3.  **Create a Cloudflare KV Namespace**
    Run the following command to create a KV namespace for your journal entries.
    ```bash
    wrangler kv:namespace create "JOURNAL_KV"
    ```
4.  **Update `wrangler.toml`**
    Copy the `id` and `preview_id` from the output of the previous command and paste them into your `wrangler.toml` file.
    ```toml
    [[kv_namespaces]]
    binding = "JOURNAL_KV"
    id = "paste-your-id-here"
    preview_id = "paste-your-preview-id-here"
    ```
5.  **Set the JWT Secret**
    You need to create a secret key for signing authentication tokens. Run this command in your terminal (replace `your-super-secret-key` with a strong, random string).
    ```bash
    wrangler secret put JWT_SECRET
    ```
    You will be prompted to enter the secret value.

6.  **Run Locally**
    ```bash
    wrangler dev
    ```
7.  **Deploy to Cloudflare**
    ```bash
    wrangler deploy
    ```

## 🎈 Usage

Once deployed, simply navigate to your worker's URL. You can create an account, log in, and start writing. All your data will be securely stored in your Cloudflare KV namespace.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/your-repository/issues).


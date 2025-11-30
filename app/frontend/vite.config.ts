import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend API server URL
const BACKEND_URL = "http://localhost:50505";

export default defineConfig({
    plugins: [react()],
    resolve: {
        preserveSymlinks: true,
        alias: {
            react: path.resolve(__dirname, "./node_modules/react"),
            "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
            "@fluentui/react-icons": path.resolve(__dirname, "./node_modules/@fluentui/react-icons")
        }
    },
    build: {
        outDir: "../backend/static",
        emptyOutDir: true,
        sourcemap: true,
        target: "esnext",
    },
    server: {
        // Bind to 127.0.0.1 for local development
        host: "127.0.0.1",
        port: 5173,
        // Enable strict port to fail if port is already in use
        strictPort: true,
        // HMR configuration for reliable hot module replacement
        hmr: {
            // Use the same host as the dev server
            host: "127.0.0.1",
            port: 5173,
            // Use WebSocket protocol for HMR
            protocol: "ws",
        },
        // Watch configuration for file changes
        watch: {
            // Use polling for better compatibility (especially in Docker/VM environments)
            usePolling: false,
            // Ignore node_modules to improve performance
            ignored: ["**/node_modules/**"],
        },
        proxy: {
            "/content/": BACKEND_URL,
            "/auth_setup": BACKEND_URL,
            "/.auth/me": BACKEND_URL,
            "/ask": BACKEND_URL,
            "/chat": BACKEND_URL,
            "/speech": BACKEND_URL,
            "/config": BACKEND_URL,
            "/upload": BACKEND_URL,
            "/delete_uploaded": BACKEND_URL,
            "/list_uploaded": BACKEND_URL,
            "/chat_history": BACKEND_URL,
            "/auth/status": BACKEND_URL,
            "/auth/login": BACKEND_URL,
            "/enhance_prompt": BACKEND_URL,
            "/api/user/": BACKEND_URL,
            "/api/ideas": BACKEND_URL,
            "/api/news": BACKEND_URL,
        },
    },
    // Enable SPA fallback for client-side routing
    appType: "spa",
});

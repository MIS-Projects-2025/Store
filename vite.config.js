// import { defineConfig } from 'vite';
// import laravel from 'laravel-vite-plugin';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//     plugins: [
//         laravel({
//             input: 'resources/js/app.jsx',
//             refresh: true,
//         }),
//         react(),
//     ],
// });
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import laravel from "laravel-vite-plugin";
import path from "path";
import { defineConfig } from "vite";
import fs from "fs";

function caseInsensitiveResolver() {
    return {
        name: "case-insensitive-resolver",
        resolveId(id) {
            const extensions = [".jsx", ".js", ".tsx", ".ts"];

            // Only handle absolute paths
            if (!path.isAbsolute(id)) return null;

            // If file exists as-is, skip
            if (fs.existsSync(id)) return null;

            const dir = path.dirname(id);
            const base = path.basename(id);

            try {
                const files = fs.readdirSync(dir);

                // Try exact match with extensions
                for (const ext of extensions) {
                    const match = files.find(
                        (f) => f.toLowerCase() === base.toLowerCase() + ext,
                    );
                    if (match) return path.join(dir, match);
                }

                // Try without extension
                const match = files.find(
                    (f) => f.toLowerCase() === base.toLowerCase(),
                );
                if (match) return path.join(dir, match);
            } catch (e) {
                return null;
            }
        },
    };
}

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./resources/js"),
            ziggy: path.resolve("vendor/tightenco/ziggy/dist"),
            "ziggy-js": path.resolve(
                "vendor/tightenco/ziggy/dist/index.esm.js",
            ),
        },
    },
    plugins: [
        caseInsensitiveResolver(),
        laravel({
            input: "resources/js/app.jsx",
            refresh: true,
        }),
        react(),
    ],
    server: {
        port: 5174,
    },
});

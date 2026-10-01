import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    base: "",
    server: {
        port: 3000,
    },
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
    build: {
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: vendorChunkName,
                            test: /[\\/]node_modules[\\/]/,
                        },
                    ],
                },
            },
        },
    },
});

function vendorChunkName(id: string): string | null {
    const pkg = npmPackageName(id);
    if (!pkg) {
        return null;
    }

    if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') {
        return 'react';
    }
    if (pkg === 'motion' || pkg === 'framer-motion') {
        return 'motion';
    }
    if (pkg === 'gsap' || pkg === '@gsap/react') {
        return 'gsap';
    }
    if (pkg === '@react-spring/web' || pkg.startsWith('@react-spring/')) {
        return 'react-spring';
    }

    return 'vendor';
}

/** Last `node_modules/<pkg>` segment. Works with pnpm's `.pnpm/<id>/node_modules/<pkg>` layout. */
function npmPackageName(id: string): string | undefined {
    const normalized = id.replaceAll('\\', '/');
    const idx = normalized.lastIndexOf(NODE_MODULES);
    if (idx === -1) {
        return undefined;
    }

    const rest = normalized.slice(idx + NODE_MODULES.length);
    const [scopeOrName, maybeName] = rest.split('/');
    if (!scopeOrName || scopeOrName.startsWith('.')) {
        return undefined;
    }

    return scopeOrName.startsWith('@') && maybeName
        ? `${scopeOrName}/${maybeName}`
        : scopeOrName;
}

const NODE_MODULES = '/node_modules/';

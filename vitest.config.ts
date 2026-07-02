import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        include: ['resources/js/**/*.{test,spec}.{ts,tsx}'],
        setupFiles: ['resources/js/__tests__/setup.ts'],
        globals: true,
        css: false,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
        },
    },
});

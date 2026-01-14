import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            reporter: ['text', 'json', 'html'],
            include: ['server/**/*.ts', 'shared/**/*.ts'],
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./client/src', import.meta.url)),
            '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
        },
    },
});

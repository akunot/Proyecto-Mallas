import { expect, test } from '@playwright/test';

test.describe('Public Catalog Views', () => {
    test('public sedes endpoint returns data', async ({ request }) => {
        const response = await request.get('/api/v1/public/sedes');
        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('public facultades endpoint returns data', async ({ request }) => {
        const response = await request.get('/api/v1/public/facultades');
        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('public electivas endpoint returns data', async ({ request }) => {
        const response = await request.get('/api/v1/public/electivas');
        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(Array.isArray(body.data)).toBeTruthy();
    });

    test('public test endpoint is accessible', async ({ request }) => {
        const response = await request.get('/api/v1/public/test');
        expect(response.ok()).toBeTruthy();
    });
});

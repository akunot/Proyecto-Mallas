import { expect, test } from '@playwright/test';

test('API health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/v1/public/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.services.database).toBe('connected');
});

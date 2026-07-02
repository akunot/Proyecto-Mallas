import { expect, test } from '@playwright/test';

test.describe('Login Flow', () => {
    test('shows login page with email form', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByText('Bienvenido')).toBeVisible();
        await expect(
            page.getByPlaceholder('usuario@unal.edu.co'),
        ).toBeVisible();
        await expect(page.getByText('Obtener Acceso')).toBeVisible();
    });

    test('shows error for invalid email', async ({ page }) => {
        await page.goto('/login');

        await page
            .getByPlaceholder('usuario@unal.edu.co')
            .fill('invalido@test.com');
        await page.getByText('Obtener Acceso').click();

        await expect(page.getByText(/no encontrada/i)).toBeVisible({
            timeout: 10000,
        });
    });

    test('public test endpoint returns API status', async ({ request }) => {
        const response = await request.get('/api/v1/public/test');
        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(body.status).toBe('ok');
    });
});

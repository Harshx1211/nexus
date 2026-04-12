import { test, expect } from '@playwright/test';

test.describe('Core E2E Workflow: Mobile User Navigation & Authentication State', () => {

    test('E2E: Should render landing page, expand mobile nav drawer, and navigate to secure login area', async ({ page }) => {
        // 1. Emulate Mobile DOM Viewport
        await page.setViewportSize({ width: 375, height: 812 });

        // 2. Initial Application Mount
        await page.goto('/');

        // 3. System Validation: Verify Landing Page Mounted successfully
        await expect(page.locator('text=Empower Your Future')).toBeVisible({ timeout: 15000 });

        // 4. User Interaction: Open the mobile drawer trigger
        const menuButton = page.locator('button[aria-label="Toggle menu"]');
        await expect(menuButton).toBeVisible();
        await menuButton.click();

        // 5. State Validation: Verify Drawer is Open and Login Route exists
        const loginLink = page.locator('a[href="/login"]').last();
        await expect(loginLink).toBeVisible();
        
        // 6. User Interaction: Click Login
        await loginLink.click();
        
        // 7. System Validation: Verify HTTP Push State successfully navigated the user
        await expect(page).toHaveURL(/.*login/);
        
        // 8. Regression Validation: Assert critical authentication DOM elements are loaded
        const emailField = page.locator('input[type="email"]').first();
        await expect(emailField).toBeVisible({ timeout: 10000 });

        const passwordField = page.locator('input[type="password"]').first();
        await expect(passwordField).toBeVisible({ timeout: 10000 });
    });
});

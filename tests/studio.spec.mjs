import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const screenshots = path.resolve('artifacts/studio-screenshots');
const publicPages = ['/', '/residents.html', '/collections.html', '/collection.html?world=winter-legends', '/process.html', '/create.html', '/chronicle.html?resident=azimondias', '/about.html', '/contact.html'];

test.beforeAll(async () => {
  await fs.mkdir(screenshots, { recursive: true });
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`public routes have no broken assets at ${viewport.width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of publicPages) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page.locator('#app main')).toBeVisible();
      await expect(page.locator('.site-header')).toBeVisible();
      const broken = await page.locator('img').evaluateAll((images) => images.filter((image) => image.naturalWidth === 0).map((image) => image.currentSrc));
      expect(broken, `broken photos on ${route}`).toEqual([]);
      const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(width.scroll, `horizontal overflow on ${route}`).toBeLessThanOrEqual(width.client + 1);
    }
    await page.goto('/create.html', { waitUntil: 'networkidle' });
    const forestChoice = page.locator('[data-choice="base"] .option').getByText('Лесной дракон');
    expect(await forestChoice.count()).toBe(1);
    const babyChoice = page.locator('[data-choice="base"] .option').getByText('Малыш-дракон');
    expect(await babyChoice.count()).toBe(1);
    await babyChoice.click();
    await expect(page.locator('[data-preview-title]')).toHaveText('Малыш-дракон');
    if (viewport.width === 390) {
      const menu = page.locator('[data-menu-toggle]');
      expect(await menu.count()).toBe(1);
      await menu.click();
      await expect(page.locator('#main-nav')).toHaveClass(/is-open/);
    }
    await page.screenshot({ path: path.join(screenshots, `home-${viewport.width}.png`), fullPage: true, animations: 'disabled' });
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('admin accepts the local developer login and exposes content tools', async ({ page }) => {
  await page.goto('/admin', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Вход в админку' })).toBeVisible();
  const password = page.getByLabel('Пароль');
  expect(await password.count()).toBe(1);
  await password.fill('vera-demo');
  const login = page.getByRole('button', { name: 'Войти' });
  expect(await login.count()).toBe(1);
  await login.click();
  await expect(page.getByRole('heading', { name: 'Добро пожаловать' })).toBeVisible();
  const residentsButton = page.locator('[data-nav="residents"]');
  expect(await residentsButton.count()).toBe(1);
  await residentsButton.click();
  await expect(page.getByRole('heading', { name: 'Жители' })).toBeVisible();
  await expect(page.getByText('Азимондиас')).toBeVisible();
});

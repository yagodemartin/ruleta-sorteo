const { test, expect } = require('@playwright/test');

const FAST_URL  = '/?spinDuration=800';
const MODAL_TIMEOUT = 4000;  // 800ms spin + 350ms delay + 2850ms buffer

// Read a pixel from the wheel canvas at polar coordinates
async function canvasPixelAt(page, angleDeg, radiusFraction) {
  return page.evaluate(({ angleDeg, rf }) => {
    const canvas = document.getElementById('wheel-canvas');
    const ctx    = canvas.getContext('2d');
    const r      = canvas.width / 2 - 12;
    const cx     = canvas.width  / 2;
    const cy     = canvas.height / 2;
    const rad    = (angleDeg * Math.PI) / 180;
    const px     = Math.round(cx + Math.cos(rad) * r * rf);
    const py     = Math.round(cy + Math.sin(rad) * r * rf);
    const d      = ctx.getImageData(px, py, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] };
  }, { angleDeg, rf: radiusFraction });
}

async function spinAndWaitForModal(page) {
  await page.locator('#spin-btn').click();
  await expect(page.locator('#winner-modal')).toHaveClass(/visible/, { timeout: MODAL_TIMEOUT });
}

// ─────────────────────────────────────────────────────
test('page loads — title, canvas and spin button visible', async ({ page }) => {
  await page.goto(FAST_URL);
  await page.waitForLoadState('domcontentloaded');

  await expect(page.locator('#app-title')).not.toBeEmpty();
  await expect(page.locator('#wheel-canvas')).toBeVisible();
  await expect(page.locator('#spin-btn')).toBeEnabled();
});

test('canvas is painted (not blank background)', async ({ page }) => {
  await page.goto(FAST_URL);
  // 1st segment midpoint with 5 participants: -90° + 36° = -54°
  const px = await canvasPixelAt(page, -54, 0.70);
  expect(px.a).toBe(255);
  // Not the dark page background (#0D0D1A = 13,13,26 → sum ≈ 52)
  expect(px.r + px.g + px.b).toBeGreaterThan(80);
});

test('photo zone renders — avatar area is opaque and bright', async ({ page }) => {
  await page.goto(FAST_URL);
  // Sample multiple points across the avatar zone (42% radius, different angles)
  const samples = await Promise.all([
    canvasPixelAt(page, -54, 0.38),
    canvasPixelAt(page, -54, 0.42),
    canvasPixelAt(page, -54, 0.46),
  ]);
  for (const px of samples) {
    // Must be fully opaque (canvas is painted, not transparent)
    expect(px.a).toBe(255);
    // Not fully transparent / not pitch-black page bg (#0D0D1A max channel ≈ 26)
    expect(Math.max(px.r, px.g, px.b)).toBeGreaterThan(10);
  }
  // At least one sample should have a bright channel (avatar silhouette is near-white)
  const maxBrightness = Math.max(...samples.map(px => Math.max(px.r, px.g, px.b)));
  expect(maxBrightness).toBeGreaterThan(150);
});

test('spin button disables immediately on click', async ({ page }) => {
  await page.goto(FAST_URL);
  await page.locator('#spin-btn').click();
  await expect(page.locator('#spin-btn')).toBeDisabled();
  await expect(page.locator('#spin-btn')).toHaveText('GIRANDO…');
});

test('winner modal appears with a valid participant name', async ({ page }) => {
  await page.goto(FAST_URL);
  await spinAndWaitForModal(page);

  const name  = (await page.locator('#winner-name').textContent()).trim();
  const valid = ['Alejandro', 'Yago', 'Parris', 'Daniel', 'Pablo'];
  expect(valid).toContain(name);
});

test('nueva ruleta resets — modal hides, button re-enables', async ({ page }) => {
  await page.goto(FAST_URL);
  await spinAndWaitForModal(page);

  await page.locator('#modal-close').click();

  await expect(page.locator('#winner-modal')).not.toHaveClass(/visible/);
  await expect(page.locator('#spin-btn')).toBeEnabled();
  await expect(page.locator('#spin-btn')).toHaveText('GIRAR');
});

test('canvas still painted after reset', async ({ page }) => {
  await page.goto(FAST_URL);
  await spinAndWaitForModal(page);
  await page.locator('#modal-close').click();
  await expect(page.locator('#spin-btn')).toBeEnabled();

  const px = await canvasPixelAt(page, -54, 0.70);
  expect(px.a).toBe(255);
  expect(px.r + px.g + px.b).toBeGreaterThan(80);
});

test('screenshot — initial state', async ({ page }) => {
  await page.goto(FAST_URL);
  await expect(page).toHaveScreenshot('initial.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.05,
  });
});

test('screenshot — winner modal', async ({ page }) => {
  await page.goto(FAST_URL);
  await spinAndWaitForModal(page);
  // Wait for confetti to spawn
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot('winner.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.08,
  });
});

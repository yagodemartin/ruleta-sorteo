const { test } = require('@playwright/test');

test.use({
  video: 'on',
  viewport: { width: 900, height: 750 },
});

test('demo — ruleta completa', async ({ page }) => {
  // spin de 3.5s para que la animación se vea bien en vídeo
  await page.goto('/?spinDuration=3500');

  // Pausa para ver estado inicial
  await page.waitForTimeout(1200);

  // Girar
  await page.locator('#spin-btn').click();

  // Esperar animación completa + modal
  await page.locator('#winner-modal').waitFor({ state: 'visible', timeout: 7000 });

  // Dejar ver el ganador con confetti
  await page.waitForTimeout(2500);
});

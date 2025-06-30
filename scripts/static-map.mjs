import { webkit, devices } from 'playwright';

const delay = async (time) => {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, time)
  })
}

(async () => {
  const browser = await webkit.launch();
  const context = await browser.newContext(devices['Desktop Safari']);
  const page = await context.newPage();

  await page.goto('http://localhost:4321/travel');
  await delay(5000);
  await page.getByTestId('map').screenshot({ path: 'screenshot.png' });
  // await page.screenshot({ path: 'screenshot.png' });

  await context.close();
  await browser.close();
})();

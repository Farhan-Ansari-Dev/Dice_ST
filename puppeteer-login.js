const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });

  await page.goto('https://admin.sanyogconformity.com/login', { waitUntil: 'networkidle2' });
  console.log('Navigated to login page.');

  // Type email
  await page.type('input[type="email"]', 'info@sanyogconformity.com');
  // Click Send OTP
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Send OTP'));
    if (btn) btn.click();
  });

  await page.waitForTimeout(2000); // wait for OTP screen

  // Type OTP
  const otpInputs = await page.$$('input[type="text"]');
  if (otpInputs.length === 6) {
    const chars = '123456'.split('');
    for (let i = 0; i < 6; i++) {
      await otpInputs[i].type(chars[i]);
    }
  }

  // Click Verify
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Verify'));
    if (btn) btn.click();
  });

  await page.waitForTimeout(5000); // wait for dashboard to load

  const url = page.url();
  console.log('Final URL:', url);
  
  const content = await page.content();
  console.log('Body length:', content.length);
  if (content.length < 500) {
    console.log('Body is too small, likely a blank screen.');
  } else {
    console.log('Content snippet:', content.substring(0, 500));
  }

  await browser.close();
})();

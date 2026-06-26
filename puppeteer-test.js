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

  // Check if we can see the login form
  const content = await page.content();
  if (content.includes('Email Address')) {
    console.log('Login page loaded successfully.');
    
    // We cannot easily login because of OTP, but wait...
    // Is there a way we can just navigate to dashboard?
    // It redirects to login. 
  } else {
    console.log('Login page content:', content.substring(0, 200));
  }
  
  await browser.close();
})();

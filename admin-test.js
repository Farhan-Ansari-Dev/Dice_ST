const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Navigating to login...');
  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'step1_login.png' });

  console.log('Typing email...');
  await page.type('input[type="email"]', 'cyberfarhanansari@gmail.com');
  await page.click('button[type="submit"]');
  await page.screenshot({ path: 'step2_email.png' });

  console.log('Waiting for OTP...');
  await page.waitForTimeout(2000);
  
  // Try to find OTP inputs, they might be 6 separate inputs or 1
  const otpInputs = await page.$$('input[type="text"]');
  if (otpInputs.length === 6) {
    const otp = '123456';
    for (let i = 0; i < 6; i++) {
      await otpInputs[i].type(otp[i]);
    }
  } else {
    // try clicking and typing
    await page.keyboard.type('123456');
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'step3_otp.png' });
  
  const submitBtns = await page.$$('button[type="submit"]');
  if (submitBtns.length > 0) {
    await submitBtns[submitBtns.length - 1].click();
  } else {
    await page.click('button');
  }

  console.log('Waiting for Dashboard...');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(e => console.log('Navigation timeout, proceeding anyway'));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'step4_dashboard.png' });

  console.log('Clicking Enquiries...');
  const links = await page.$$('a');
  for (const link of links) {
    const text = await page.evaluate(el => el.textContent, link);
    if (text.includes('Enquiries') || text.includes('Leads')) {
      await link.click();
      break;
    }
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'step5_enquiries.png' });

  // Update status
  console.log('Clicking the first enquiry...');
  // Usually there's a table row or card
  const rows = await page.$$('tbody tr');
  if (rows.length > 0) {
    await rows[0].click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'step6_detail.png' });
    
    // Find status dropdown or buttons
    console.log('Updating status...');
    const selects = await page.$$('select');
    if (selects.length > 0) {
      await selects[0].select('contacted');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'step7_updated.png' });
    } else {
        // Maybe it's a div dropdown
        const buttons = await page.$$('button');
        for(const btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if(text.includes('New') || text.toLowerCase() === 'new') {
                await btn.click();
                break;
            }
        }
        await page.waitForTimeout(1000);
        // Click 'contacted'
        const options = await page.$$('div, button, li');
        for(const opt of options) {
             const text = await page.evaluate(el => el.textContent, opt);
             if(text.toLowerCase().includes('contacted')) {
                 await opt.click();
                 break;
             }
        }
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'step7_updated.png' });
    }
  } else {
    console.log('No rows found');
  }

  await browser.close();
})();

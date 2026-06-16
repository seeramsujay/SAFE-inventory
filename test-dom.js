import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import http from 'http';

// Helper to wait for the preview server to be responsive
function waitForServer(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error('Server timed out waiting to start: ' + url));
        return;
      }
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve();
        }
      }).on('error', () => {
        // Server not up yet, keep waiting
      });
    }, 500);
  });
}

async function run() {
  console.log('Starting Vite preview server on 127.0.0.1:4173...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], {
    shell: true,
  });

  server.stdout.on('data', (data) => {
    console.log(`[Vite Server]: ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[Vite Server Error]: ${data.toString().trim()}`);
  });

  let browser;
  try {
    // Wait for the preview port to become active
    await waitForServer('http://127.0.0.1:4173/');
    console.log('Vite server ready. Launching headless Google Chrome...');

    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    console.log('Navigating to website...');
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });

    console.log('Page loaded. Checking DOM structure...');

    // 1. Validate the document title
    const title = await page.title();
    console.log(`- Page Title: "${title}"`);
    if (!title.includes('Industrial Nexus')) {
      throw new Error('Verification failed: HTML title tag mismatch.');
    }

    // 2. Validate the central header element
    const headerText = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent : null;
    });
    console.log(`- Header Brand: "${headerText}"`);
    if (!headerText || !headerText.includes('INDUSTRIAL NEXUS')) {
      throw new Error('Verification failed: INDUSTRIAL NEXUS brand header not found.');
    }

    // 3. Validate operator shift state load from local storage
    const activeOperator = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const opLabel = spans.find(s => s.textContent.includes('OPERATOR:'));
      return opLabel ? opLabel.nextElementSibling.textContent : null;
    });
    console.log(`- Shift Operator: "${activeOperator}"`);
    if (activeOperator !== 'EMP-045') {
      throw new Error(`Verification failed: Expected operator EMP-045, got "${activeOperator}".`);
    }

    // 4. Test client-side navigation click and state update
    console.log('Testing interactive Tab Navigation: Clicking "Recipes" tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const recipesBtn = buttons.find(b => b.textContent.includes('Recipes'));
      if (recipesBtn) {
        recipesBtn.click();
      } else {
        throw new Error('Recipes tab button not found in DOM.');
      }
    });

    // Wait for React to re-render the view
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify DOM contains the recipes catalog manager header
    const recipesViewLoaded = await page.evaluate(() => {
      const h2s = Array.from(document.querySelectorAll('h2'));
      return h2s.some(h => h.textContent.includes('FACTORY INDUSTRIAL REGISTER'));
    });
    console.log(`- Recipes view loaded: ${recipesViewLoaded ? 'SUCCESS' : 'FAIL'}`);
    if (!recipesViewLoaded) {
      throw new Error('Verification failed: Failed to switch to Recipes catalog view.');
    }

    console.log('\nResult: All browser DOM assertions passed successfully! ✅');
  } catch (error) {
    console.error('\nResult: Test failed! ❌');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
    console.log('Stopping Vite preview server...');
    server.kill();
  }
}

run();

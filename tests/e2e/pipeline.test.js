/* eslint-disable @typescript-eslint/no-require-imports */
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

(async function example() {
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage'))
    .build();

  try {
    console.log('Navigating to homepage...');
    await driver.get('http://localhost:3000');

    console.log('Waiting for title...');
    const title = await driver.getTitle();
    console.log('Page title is:', title);

    if (!title.includes('DeployLog')) { // Adjust expected title as needed based on layout.tsx/page.tsx
       console.error('Title check failed! Found:', title);
       process.exit(1);
    }
    
    // Check for a static element, e.g., the main heading
    // Assuming there is an <h1> element. If not, we might need to be more specific.
    // Based on standard Next.js templates or simple apps, looking for body is a safe base check, 
    // but looking for a specific text "Deployments" or similar is better.
    // Let's assume there is a header or some content. 
    // We will stick to title for now as the most robust "static" check requested.
    
    console.log('E2E Test Passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await driver.quit();
  }
})();

import { chromium } from 'playwright';

export async function scrapeXProfile(username: string, authToken: string | null) {
  if (!authToken) return null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  await context.addCookies([
    {
      name: 'auth_token',
      value: authToken,
      domain: '.x.com',
      path: '/'
    }
  ]);

  const page = await context.newPage();
  
  try {
    // Note: X scraping is brittle and would ideally use an API if available. 
    // This is a simplified representation of the Playwright logic.
    await page.goto(`https://x.com/${username}`);
    await page.waitForSelector('article', { timeout: 10000 });
    
    // Extract raw text of recent tweets for the AI parser
    const articles = await page.$$eval('article', els => els.map(el => el.textContent || '').slice(0, 5));
    
    return {
      rawArticles: articles
    };
  } catch (err) {
    console.error('Error scraping X:', err);
    return null;
  } finally {
    await browser.close();
  }
}

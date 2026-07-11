import { chromium } from 'playwright';

export async function scrapeLinkedInProfile(profileUrl: string, liAtCookie: string | null) {
  if (!liAtCookie) return null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  await context.addCookies([
    {
      name: 'li_at',
      value: liAtCookie,
      domain: '.www.linkedin.com',
      path: '/'
    }
  ]);

  const page = await context.newPage();
  
  try {
    await page.goto(`${profileUrl}/recent-activity/all/`);
    await page.waitForSelector('.profile-creator-shared-feed-update__container', { timeout: 10000 });
    
    const posts = await page.$$eval('.profile-creator-shared-feed-update__container', els => els.map(el => el.textContent || '').slice(0, 3));
    
    return {
      rawPosts: posts
    };
  } catch (err) {
    console.error('Error scraping LinkedIn:', err);
    return null;
  } finally {
    await browser.close();
  }
}

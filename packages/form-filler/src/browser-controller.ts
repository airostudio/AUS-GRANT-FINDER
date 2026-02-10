/**
 * Browser Controller - Manages Playwright browser sessions
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import type { FillOptions } from './types';

export class BrowserController {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private options: FillOptions;

  constructor(options: FillOptions) {
    this.options = options;
  }

  /**
   * Initialize browser and create new page
   */
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.options.headless ?? false,
      slowMo: this.options.mode === 'manual' ? 1000 : 0,
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    this.page = await this.context.newPage();
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Fill a text input field
   */
  async fillField(selector: string, value: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.waitForSelector(selector);
    await this.page.fill(selector, value);
  }

  /**
   * Click an element
   */
  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.waitForSelector(selector);
    await this.page.click(selector);
  }

  /**
   * Upload a file
   */
  async uploadFile(selector: string, filePath: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.setInputFiles(selector, filePath);
  }

  /**
   * Take a screenshot
   */
  async screenshot(path: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.screenshot({ path, fullPage: true });
  }

  /**
   * Wait for user confirmation
   */
  async waitForConfirmation(message: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`\n⏸️  CHECKPOINT: ${message}`);
    console.log('Press Enter to continue, or type "cancel" to abort...\n');

    // TODO: Implement proper user input handling
    // This is a placeholder - in production, use a proper prompt system
    return true;
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  /**
   * Get current page
   */
  getPage(): Page {
    if (!this.page) throw new Error('Browser not initialized');
    return this.page;
  }
}

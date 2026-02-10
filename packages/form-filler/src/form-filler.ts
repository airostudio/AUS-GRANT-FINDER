/**
 * Form Filler - The Closer
 *
 * Main class for automated form filling and submission
 */

import { BrowserController } from './browser-controller';
import { PortalMapper } from './portal-mapper';
import type {
  FillOptions,
  ApplicationData,
  SubmissionResult,
  NavigationStep,
} from './types';

export class FormFiller {
  private browser: BrowserController;
  private mapper: PortalMapper;
  private options: FillOptions;

  constructor(options: FillOptions) {
    this.options = options;
    this.browser = new BrowserController(options);
    this.mapper = new PortalMapper();
  }

  /**
   * Fill and submit a grant application
   */
  async fillApplication(
    data: ApplicationData
  ): Promise<SubmissionResult> {
    const screenshots: string[] = [];
    const errors: string[] = [];

    try {
      // Initialize browser
      await this.browser.initialize();

      // Get portal mapping
      const mapping = this.mapper.getMapping(this.options.portal);
      if (!mapping) {
        throw new Error(`No mapping found for portal: ${this.options.portal}`);
      }

      // Validate mappings
      const validation = this.mapper.validateMappings(
        this.options.portal,
        Array.from(data.responses.keys())
      );

      if (!validation.valid) {
        throw new Error(
          `Missing mappings for criteria: ${validation.missing.join(', ')}`
        );
      }

      // Navigate through application steps
      for (const step of mapping.navigation) {
        await this.executeNavigationStep(step);

        // Take screenshot if enabled
        if (this.options.screenshots) {
          const screenshotPath = `screenshot-step-${step.step}.png`;
          await this.browser.screenshot(screenshotPath);
          screenshots.push(screenshotPath);
        }

        // Wait for confirmation in semi-automatic mode
        if (this.options.mode === 'semi-automatic') {
          const confirmed = await this.browser.waitForConfirmation(
            step.description
          );
          if (!confirmed) {
            throw new Error('User cancelled submission');
          }
        }
      }

      // Fill form fields
      for (const [criteriaId, response] of data.responses) {
        const fieldMapping = this.mapper.getFieldMapping(
          this.options.portal,
          criteriaId
        );

        if (!fieldMapping) continue;

        await this.fillField(fieldMapping.selector, response);
      }

      // Handle file attachments
      for (const [fieldId, filePath] of data.attachments) {
        const fieldMapping = this.mapper.getFieldMapping(
          this.options.portal,
          fieldId
        );

        if (!fieldMapping) continue;

        await this.browser.uploadFile(fieldMapping.selector, filePath);
      }

      // Final screenshot before submission
      if (this.options.screenshots) {
        const screenshotPath = 'screenshot-final.png';
        await this.browser.screenshot(screenshotPath);
        screenshots.push(screenshotPath);
      }

      // Submit form (unless in dry-run mode)
      let referenceNumber: string | undefined;
      if (!this.options.dryRun) {
        referenceNumber = await this.submitForm();
      }

      return {
        success: true,
        referenceNumber,
        screenshots,
        errors,
        timestamp: new Date(),
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        screenshots,
        errors,
        timestamp: new Date(),
      };
    } finally {
      await this.browser.close();
    }
  }

  /**
   * Execute a navigation step
   */
  private async executeNavigationStep(step: NavigationStep): Promise<void> {
    switch (step.action) {
      case 'navigate':
        if (step.url) {
          await this.browser.navigate(step.url);
        }
        break;
      case 'click':
        if (step.selector) {
          await this.browser.click(step.selector);
        }
        break;
      case 'wait':
        if (step.verificationSelector) {
          // Wait for element to appear
          await this.browser
            .getPage()
            .waitForSelector(step.verificationSelector);
        }
        break;
    }
  }

  /**
   * Fill a form field based on its type
   */
  private async fillField(selector: string, value: string): Promise<void> {
    // TODO: Add type-specific handling (textarea, select, radio, etc.)
    await this.browser.fillField(selector, value);
  }

  /**
   * Submit the form and capture reference number
   */
  private async submitForm(): Promise<string | undefined> {
    // TODO: Implement form submission and reference number capture
    return 'REF-' + Date.now();
  }
}

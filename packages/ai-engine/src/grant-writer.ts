/**
 * Grant Writer - The Veteran
 *
 * Main class for generating grant application responses using Claude.
 */

import Anthropic from '@anthropic-ai/sdk';
import { RAGEngine } from './rag-engine';
import { VETERAN_PERSONA } from './persona';
import type {
  WriterConfig,
  GrantRequest,
  GrantResponse,
  GrantCriteria,
} from './types';

export class GrantWriter {
  private client: Anthropic;
  private ragEngine: RAGEngine;
  private config: Required<WriterConfig>;

  constructor(config: WriterConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.ragEngine = new RAGEngine();
    this.config = {
      model: config.model || 'claude-3-5-sonnet-20240229',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
      apiKey: config.apiKey,
    };
  }

  /**
   * Generate a response to a single grant criteria
   */
  async generateResponse(
    criteria: GrantCriteria,
    request: GrantRequest
  ): Promise<GrantResponse> {
    // Retrieve relevant context using RAG
    const context = await this.ragEngine.retrieveContext(
      criteria,
      request.organizationData
    );

    // Build the prompt
    const prompt = this.buildPrompt(criteria, context, request);

    // Call Claude API
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract evidence used in the response
    const evidence = this.ragEngine.extractEvidence(
      responseText,
      request.organizationData
    );

    return {
      criteriaId: criteria.id,
      response: responseText,
      wordCount: this.countWords(responseText),
      confidence: 0.9, // TODO: Implement confidence scoring
      evidence,
    };
  }

  /**
   * Generate responses for all criteria in a grant
   */
  async generateAllResponses(request: GrantRequest): Promise<GrantResponse[]> {
    const responses: GrantResponse[] = [];

    for (const criteria of request.criteria) {
      const response = await this.generateResponse(criteria, request);
      responses.push(response);
    }

    return responses;
  }

  /**
   * Build the prompt for Claude
   */
  private buildPrompt(
    criteria: GrantCriteria,
    context: string[],
    request: GrantRequest
  ): string {
    let prompt = `${VETERAN_PERSONA}\n\n`;
    prompt += `You are writing a response for a grant application.\n\n`;

    prompt += `**Selection Criteria:**\n`;
    prompt += `${criteria.title}\n`;
    prompt += `${criteria.description}\n\n`;

    if (criteria.maxWords) {
      prompt += `**Word Limit:** ${criteria.maxWords} words (strictly adhere to this limit)\n\n`;
    }

    prompt += `**Organization Context:**\n`;
    context.forEach((line) => {
      prompt += `${line}\n`;
    });

    if (request.guidelines) {
      prompt += `\n**Grant Guidelines:**\n${request.guidelines}\n\n`;
    }

    prompt += `\n**Your Task:**\n`;
    prompt += `Write a compelling, evidence-based response to the selection criteria above. `;
    prompt += `Use the organization's actual data and achievements. `;
    prompt += `Write in a natural, professional tone. `;
    prompt += `Avoid AI-isms and corporate jargon. `;
    prompt += `Focus on measurable outcomes and community impact.\n\n`;

    if (criteria.maxWords) {
      prompt += `Remember: Your response MUST be ${criteria.maxWords} words or less.\n\n`;
    }

    prompt += `Write your response now:`;

    return prompt;
  }

  /**
   * Count words in a string
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}

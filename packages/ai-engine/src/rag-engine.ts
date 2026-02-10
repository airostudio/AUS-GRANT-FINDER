/**
 * RAG (Retrieval-Augmented Generation) Engine
 *
 * Retrieves relevant organization data and grant guidelines to ground AI responses.
 * Uses semantic search and keyword matching for context retrieval.
 */

import type { OrganizationData, GrantCriteria } from './types';

interface RelevanceScore {
  item: string;
  score: number;
  type: 'achievement' | 'capability' | 'grant';
}

export class RAGEngine {
  /**
   * Retrieve relevant organization data for a specific grant criteria
   */
  async retrieveContext(
    criteria: GrantCriteria,
    organizationData: OrganizationData
  ): Promise<string[]> {
    const context: string[] = [];

    // Add organization overview
    context.push(
      `${organizationData.name} (ABN: ${organizationData.abn}) is a ${organizationData.industry} organization with ${organizationData.yearsInOperation} years of operation and ${organizationData.employees} employees.`
    );

    if (organizationData.revenue) {
      context.push(
        `Annual revenue: $${organizationData.revenue.toLocaleString()}`
      );
    }

    // Score and rank achievements by relevance to criteria
    const scoredAchievements = this.scoreItems(
      organizationData.achievements,
      criteria,
      'achievement'
    );

    if (scoredAchievements.length > 0) {
      context.push('\nKey Achievements (Most Relevant):');
      scoredAchievements
        .slice(0, 5) // Top 5 most relevant
        .forEach((scored) => {
          context.push(`- ${scored.item}`);
        });
    }

    // Score and rank capabilities by relevance
    const scoredCapabilities = this.scoreItems(
      organizationData.capabilities,
      criteria,
      'capability'
    );

    if (scoredCapabilities.length > 0) {
      context.push('\nCore Capabilities (Most Relevant):');
      scoredCapabilities
        .slice(0, 5)
        .forEach((scored) => {
          context.push(`- ${scored.item}`);
        });
    }

    // Add previous grant success (highly relevant for demonstrating capability)
    if (organizationData.previousGrants && organizationData.previousGrants.length > 0) {
      context.push('\nPrevious Grant Success:');
      organizationData.previousGrants.slice(0, 3).forEach((grant) => {
        context.push(`- ${grant}`);
      });
    }

    return context;
  }

  /**
   * Score items by relevance to grant criteria using keyword matching
   */
  private scoreItems(
    items: string[],
    criteria: GrantCriteria,
    type: 'achievement' | 'capability' | 'grant'
  ): RelevanceScore[] {
    const criteriaText = `${criteria.title} ${criteria.description}`.toLowerCase();
    const keywords = this.extractKeywords(criteriaText);

    return items
      .map((item) => {
        const itemLower = item.toLowerCase();
        let score = 0;

        // Keyword matching
        keywords.forEach((keyword) => {
          if (itemLower.includes(keyword)) {
            score += 1;
          }
        });

        // Length bonus (more detailed items often more relevant)
        if (item.length > 100) score += 0.5;

        // Type-specific bonuses
        if (type === 'achievement' && item.includes('achieved')) score += 0.3;
        if (type === 'capability' && item.includes('experience')) score += 0.3;

        return { item, score, type };
      })
      .filter((scored) => scored.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Extract keywords from criteria text
   */
  private extractKeywords(text: string): string[] {
    // Common stop words to exclude
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'may',
      'might',
      'can',
    ]);

    return text
      .split(/\W+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .slice(0, 20); // Top 20 keywords
  }

  /**
   * Score the relevance of context to grant criteria
   */
  scoreRelevance(context: string, criteria: GrantCriteria): number {
    const criteriaText = `${criteria.title} ${criteria.description}`.toLowerCase();
    const contextLower = context.toLowerCase();
    const keywords = this.extractKeywords(criteriaText);

    let matches = 0;
    keywords.forEach((keyword) => {
      if (contextLower.includes(keyword)) matches++;
    });

    return Math.min(matches / keywords.length, 1.0);
  }

  /**
   * Extract evidence from organization data that supports a response
   */
  extractEvidence(
    response: string,
    organizationData: OrganizationData
  ): string[] {
    const evidence: string[] = [];
    const responseLower = response.toLowerCase();

    // Extract numbers mentioned in response
    const numbers = response.match(/\d+/g) || [];

    // Find achievements mentioned in response
    organizationData.achievements.forEach((achievement) => {
      const achWords = achievement.toLowerCase().split(/\W+/);
      let matches = 0;

      achWords.forEach((word) => {
        if (word.length > 4 && responseLower.includes(word)) {
          matches++;
        }
      });

      if (matches >= 2) {
        evidence.push(achievement);
      }
    });

    // Find capabilities mentioned
    organizationData.capabilities.forEach((capability) => {
      const capWords = capability.toLowerCase().split(/\W+/);
      let matches = 0;

      capWords.forEach((word) => {
        if (word.length > 4 && responseLower.includes(word)) {
          matches++;
        }
      });

      if (matches >= 2) {
        evidence.push(capability);
      }
    });

    // Add organizational facts if numbers are mentioned
    if (numbers.length > 0) {
      evidence.push(`${organizationData.name} - ${organizationData.yearsInOperation} years in operation`);

      if (organizationData.employees) {
        evidence.push(`${organizationData.employees} employees`);
      }

      if (organizationData.revenue) {
        evidence.push(`Annual revenue: $${organizationData.revenue.toLocaleString()}`);
      }
    }

    return [...new Set(evidence)]; // Remove duplicates
  }

  /**
   * Generate summary of organization strengths relevant to criteria
   */
  summarizeStrengths(
    criteria: GrantCriteria,
    organizationData: OrganizationData
  ): string {
    const relevantAchievements = this.scoreItems(
      organizationData.achievements,
      criteria,
      'achievement'
    );

    const relevantCapabilities = this.scoreItems(
      organizationData.capabilities,
      criteria,
      'capability'
    );

    const strengths: string[] = [];

    if (organizationData.yearsInOperation >= 5) {
      strengths.push(`${organizationData.yearsInOperation} years of proven experience`);
    }

    if (relevantAchievements.length > 0) {
      strengths.push(`Demonstrated track record in relevant areas`);
    }

    if (relevantCapabilities.length > 0) {
      strengths.push(`Strong capabilities aligned with grant requirements`);
    }

    if (organizationData.previousGrants && organizationData.previousGrants.length > 0) {
      strengths.push(`History of successful grant delivery`);
    }

    return strengths.join('; ');
  }
}


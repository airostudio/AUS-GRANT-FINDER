/**
 * Vector Embeddings Service for RAG
 *
 * Generates and manages embeddings for semantic similarity search
 */

import Anthropic from '@anthropic-ai/sdk';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  metadata?: Record<string, any>;
}

export class EmbeddingService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generate embedding for a text using Claude
   * Note: This is a placeholder - Claude doesn't have a direct embedding API
   * In production, use a dedicated embedding model like Voyage AI or OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder: In production, use a proper embedding model
    // For now, return a mock embedding vector
    return this.mockEmbedding(text);
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      results.push({ embedding, text });
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar texts from a corpus
   */
  findSimilar(
    queryEmbedding: number[],
    corpusEmbeddings: EmbeddingResult[],
    topK: number = 5
  ): EmbeddingResult[] {
    const similarities = corpusEmbeddings.map((item) => ({
      ...item,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding),
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Mock embedding generation (for development)
   * In production, replace with actual embedding API
   */
  private mockEmbedding(text: string): number[] {
    // Simple hash-based mock embedding (1536 dimensions like OpenAI)
    const dimensions = 1536;
    const embedding: number[] = [];

    // Use text content to generate deterministic "embedding"
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    // Generate vector based on hash
    for (let i = 0; i < dimensions; i++) {
      const seed = hash + i;
      // Simple pseudo-random based on seed
      const value = Math.sin(seed) * 10000;
      embedding.push(value - Math.floor(value));
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / norm);
  }

  /**
   * Chunk text into smaller pieces for embedding
   */
  chunkText(text: string, maxChunkSize: number = 500): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks;
  }
}

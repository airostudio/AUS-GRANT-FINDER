# AI Engine Package

The AI Engine is the core of AusGrant-Automate's grant writing capabilities. It uses Claude (Anthropic) with Retrieval-Augmented Generation (RAG) to generate compelling, factual grant applications.

## Features

- **The Veteran Persona**: 30+ years of Australian public sector grant writing experience
- **RAG Pipeline**: Grounds responses in organization-specific data and grant guidelines
- **Natural Language**: Avoids AI-isms and robotic phrasing
- **Evidence-Based**: Incorporates real-world figures and historical data

## Architecture

1. **Persona Layer**: Maintains the 30-year veteran tone and expertise
2. **Context Retrieval**: Uses pgvector to find relevant organization data
3. **Grant Writer**: Generates responses tailored to selection criteria
4. **Quality Filter**: Ensures natural language and removes AI-isms

## Usage

```typescript
import { GrantWriter } from '@ausgrant/ai-engine';

const writer = new GrantWriter({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20240229',
});

const response = await writer.generateResponse({
  grantId: 'grant-123',
  criteria: 'Demonstrate community impact',
  organizationData: {...},
});
```

## Writer Persona

The AI writer embodies:
- 30+ years in Australian public sector grant writing
- Deep understanding of "Value for Money" principles
- Focus on community impact and measurable outcomes
- Natural, professional writing style
- Evidence-based argumentation

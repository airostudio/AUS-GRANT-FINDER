# Database Package

PostgreSQL database schema and client for AusGrant-Automate with pgvector support for RAG functionality.

## Features

- **Prisma ORM**: Type-safe database client
- **pgvector**: Vector similarity search for RAG
- **Migrations**: Version-controlled schema changes
- **Seed Data**: Australian LGAs and government departments

## Schema Overview

### Core Tables

- **grants**: Government grant and tender opportunities
- **organizations**: User organizations and their data
- **applications**: Grant application submissions
- **responses**: AI-generated responses to criteria
- **embeddings**: Vector embeddings for RAG

### Vector Search

Uses pgvector for semantic similarity search:
- Organization capabilities
- Grant guidelines
- Historical responses
- Best practices

## Setup

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema to database
pnpm db:push

# Run migrations (production)
pnpm db:migrate

# Seed database
pnpm db:seed

# Open Prisma Studio
pnpm db:studio
```

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ausgrant?schema=public"
```

## Usage

```typescript
import { prisma } from '@ausgrant/database';

// Find grants by keyword
const grants = await prisma.grant.findMany({
  where: {
    title: {
      contains: 'community',
    },
    closingDate: {
      gte: new Date(),
    },
  },
});

// Vector similarity search
const similar = await prisma.$queryRaw`
  SELECT * FROM embeddings
  ORDER BY embedding <-> ${queryVector}::vector
  LIMIT 5
`;
```

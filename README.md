# AusGrant-Automate 🇦🇺

> AI-Powered Tender & Grant Engine for Australian Government Opportunities

AusGrant-Automate is a high-performance, AI-driven platform designed to aggregate every Australian Federal, State, and Local government tender and grant, and automate the submission process.

The system acts as a **Chief Grant Writer with 30+ years of experience**, leveraging Retrieval-Augmented Generation (RAG) to ensure every submission is factual, persuasive, and written in a natural, professional tone.

## 🌟 Features

### 🔍 The Scout (Data Ingestion)
- Aggregates opportunities from GrantConnect, AusTender, and State portals
- AI-powered parsing of grant criteria and eligibility requirements
- Tracks closing dates and funding amounts
- Stores data in PostgreSQL with pgvector for semantic search

### ✍️ The Veteran (AI Writer)
- 30+ years of simulated Australian public sector experience
- Natural, professional writing that avoids AI-isms
- Evidence-based responses using RAG
- Demonstrates "Value for Money" and community impact
- Tailored to selection criteria with strict word limits

### 🚀 The Closer (Automation Engine)
- Browser-based form filling using Playwright
- Semi-automatic mode with human-in-the-loop verification
- Screenshot capture and session management
- Portal-specific mappings for major grant systems

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AusGrant-Automate                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   The Scout  │  │ The Veteran  │  │  The Closer  │        │
│  │              │  │              │  │              │        │
│  │  Web Scraper │→ │  AI Writer   │→ │ Form Filler  │        │
│  │  + Parser    │  │  + RAG       │  │  Playwright  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         ↓                  ↓                  ↓                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │         PostgreSQL + pgvector Database               │     │
│  │  Grants | Organizations | Applications | Embeddings  │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, Shadcn/UI |
| **Backend** | FastAPI (Python), Node.js |
| **Database** | PostgreSQL with pgvector |
| **AI Engine** | Claude 3.5 Sonnet (Anthropic) |
| **Automation** | Playwright |
| **ORM** | Prisma |
| **Monorepo** | Turborepo with pnpm workspaces |
| **CI/CD** | GitHub Actions |
| **Deployment** | Vercel (Frontend), Docker (Backend) |

## 📂 Project Structure

```
ausgrant-automate/
├── apps/
│   ├── web/                 # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utilities
│   │   └── package.json
│   └── scraper/             # Python Scraper & API
│       ├── src/
│       │   ├── api/         # FastAPI endpoints
│       │   ├── scrapers/    # Portal scrapers
│       │   └── parsers/     # AI parsers
│       └── pyproject.toml
├── packages/
│   ├── ai-engine/           # RAG & Grant Writer
│   │   ├── src/
│   │   │   ├── grant-writer.ts
│   │   │   ├── rag-engine.ts
│   │   │   └── persona.ts
│   │   └── prompts/
│   │       └── writer_persona.md
│   ├── form-filler/         # Playwright Automation
│   │   ├── src/
│   │   │   ├── form-filler.ts
│   │   │   ├── browser-controller.ts
│   │   │   └── portal-mapper.ts
│   │   └── mappings/        # Portal field mappings
│   └── database/            # Prisma Schema
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       └── src/
├── .github/
│   └── workflows/           # CI/CD pipelines
├── data/                    # Seed data for LGAs
├── turbo.json
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 15+ with pgvector extension
- pnpm 8+
- Poetry (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ausgrant-automate.git
   cd ausgrant-automate
   ```

2. **Install Node dependencies**
   ```bash
   pnpm install
   ```

3. **Install Python dependencies**
   ```bash
   cd apps/scraper
   poetry install
   poetry run playwright install
   cd ../..
   ```

4. **Set up environment variables**
   ```bash
   # Root .env
   cp .env.example .env

   # Database
   cp packages/database/.env.example packages/database/.env

   # Scraper
   cp apps/scraper/.env.example apps/scraper/.env
   ```

5. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb ausgrant

   # Enable pgvector extension
   psql ausgrant -c "CREATE EXTENSION IF NOT EXISTS vector;"

   # Push schema and seed data
   pnpm --filter @ausgrant/database db:push
   pnpm --filter @ausgrant/database db:seed
   ```

6. **Start development servers**
   ```bash
   # Start all services
   pnpm dev

   # Or start individually
   pnpm --filter @ausgrant/web dev          # Next.js on :3000
   cd apps/scraper && poetry run uvicorn src.api.main:app --reload  # FastAPI on :8000
   ```

### Development

```bash
# Run linter
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test

# Build all packages
pnpm build

# Database operations
pnpm --filter @ausgrant/database db:studio  # Open Prisma Studio
pnpm --filter @ausgrant/database db:migrate # Create migration
```

## 🎯 Target Portals & API Integration

### ✅ Integrated APIs (Phase 2 - Completed)

#### Federal Government
- **[AusTender](https://www.tenders.gov.au)** - Federal tenders
  📡 **API**: [OCDS API](https://github.com/austender/austender-ocds-api) (Open Contracting Data Standard)
  ✅ **Status**: Integrated with OpportunityAggregator

- **[GrantConnect](https://www.grants.gov.au)** - Federal grants
  📡 **API**: No public API (contact GrantConnect@Finance.gov.au for bulk access)
  ⚠️ **Status**: Manual integration pending API access

- **[ARC Grants](https://www.arc.gov.au)** - Research grants since 2001
  📡 **API**: JSON API available
  ✅ **Status**: Integrated with ARCGrantsClient

#### Local Government
- **[Brisbane City Council](https://data.brisbane.qld.gov.au)** - Local grants data
  📡 **API**: [Open Data API](https://data.brisbane.qld.gov.au/explore/dataset/grants-recipients/api/)
  ✅ **Status**: Integrated with BrisbaneCouncilClient

### 🔄 Planned Integrations (Phase 2 - In Progress)

#### State Governments
- **Victoria**: [tenders.vic.gov.au](https://tenders.vic.gov.au)
  📡 **API**: API catalogue available, integration pending

- **NSW**: [nswbuy.com.au](https://nswbuy.com.au) & [OpenGov NSW API](https://data.nsw.gov.au/data/dataset/opengov-nsw-api)
  📡 **API**: Available with API key (apply at data.nsw.gov.au)

- **Queensland**: [qld.gov.au/grants](https://www.qld.gov.au/grants) & [Data.QLD](https://www.data.qld.gov.au/)
  📡 **API**: Open datasets available via data.qld.gov.au

- **South Australia**: [sa.gov.au/grants](https://www.sa.gov.au/grants)
  📡 **API**: Manual integration required

- **Western Australia**: [wa.gov.au/grants](https://www.wa.gov.au/grants)
  📡 **API**: Manual integration required

- **Tasmania**: [tas.gov.au/grants](https://www.tas.gov.au/grants)
  📡 **API**: Manual integration required

### 📊 API Integration Architecture

```typescript
OpportunityAggregator
├── AusTenderClient (Federal Tenders)
├── ARCGrantsClient (Research Grants)
├── BrisbaneCouncilClient (Local Grants)
├── [Future] NSWOpenGovClient
├── [Future] DataQLDClient
└── [Future] StatePortalScrapers
```

**Features:**
- ✅ Multi-source data aggregation
- ✅ Automatic deduplication
- ✅ 15-minute response caching
- ✅ Graceful fallback to mock data
- ✅ Unified Opportunity interface
- ✅ Rate limiting ready

**See** [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md) for complete API documentation and integration guides.

## 📖 Documentation

- [AI Engine Documentation](./packages/ai-engine/README.md)
- [Form Filler Documentation](./packages/form-filler/README.md)
- [Database Schema](./packages/database/README.md)
- [Python Scraper API](./apps/scraper/README.md)
- [Writer Persona Guide](./packages/ai-engine/prompts/writer_persona.md)

## 🗺️ Roadmap

- [x] **Phase 1**: Project setup and architecture
  - [x] Turborepo monorepo structure
  - [x] Next.js frontend with Tailwind CSS
  - [x] FastAPI backend for scrapers
  - [x] PostgreSQL + pgvector database

- [ ] **Phase 2**: The Scout (Grant Aggregation)
  - [ ] Federal portal scrapers (GrantConnect, AusTender)
  - [ ] State portal scrapers (VIC, NSW, QLD)
  - [ ] AI-powered criteria parsing
  - [ ] Scheduled scraping jobs

- [ ] **Phase 3**: The Veteran (AI Writer)
  - [ ] RAG pipeline with pgvector
  - [ ] Grant response generation
  - [ ] Evidence extraction and citation
  - [ ] Quality filtering for AI-isms

- [ ] **Phase 4**: Evidence Vault
  - [ ] Organization data management
  - [ ] Document upload and processing
  - [ ] Achievement and capability tracking
  - [ ] Historical grant success database

- [ ] **Phase 5**: The Closer (Automation)
  - [ ] Portal field mappings
  - [ ] Form filling automation
  - [ ] Human-in-the-loop checkpoints
  - [ ] Submission tracking

- [ ] **Phase 6**: Production Readiness
  - [ ] Security hardening
  - [ ] Performance optimization
  - [ ] Monitoring and logging
  - [ ] User authentication and multi-tenancy

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Claude](https://www.anthropic.com/claude) by Anthropic
- Inspired by the challenges of Australian grant applications
- Designed to help organizations access vital government funding

## 📧 Contact

For questions, issues, or suggestions:
- Open an [Issue](https://github.com/your-org/ausgrant-automate/issues)
- Start a [Discussion](https://github.com/your-org/ausgrant-automate/discussions)

---

**Built with Claude Code** | [Documentation](https://docs.claude.ai) | [Report Bug](https://github.com/your-org/ausgrant-automate/issues) | [Request Feature](https://github.com/your-org/ausgrant-automate/issues)

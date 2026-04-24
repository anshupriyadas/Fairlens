# FairLens — Contextual Bias Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

FairLens is an AI-powered platform that detects, explains, and simulates bias in machine learning models. It helps organizations ensure fairness in critical AI systems used for loan approvals, hiring, healthcare, and more.

## Table of Contents
- [What is FairLens?](#what-is-fairlens)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development](#development)
- [Getting Help](#getting-help)
- [Contributing](#contributing)

## What is FairLens?

FairLens provides a comprehensive suite of tools for analyzing bias in ML models:

1. **Upload** your dataset and trained model
2. **Detect** hidden biases across different demographic groups
3. **Understand** why bias occurs through decision archaeology and explainability
4. **Simulate** counterfactual scenarios to test alternative outcomes
5. **Generate** risk scores and actionable reports

Perfect for ensuring fairness in:
- Loan and credit approvals
- Hiring and HR systems
- Healthcare diagnostics and treatment recommendations
- Criminal justice assessments

## Key Features

- **Bias Detection** — Identify disparities across protected attributes and demographic groups
- **Decision Archaeology** — Explainability layer showing why model made specific decisions
- **Counterfactual Sandbox** — Simulate alternative scenarios and test "what-if" outcomes
- **Harm Probability Score** — Quantified risk assessment for fairness violations
- **Bias Heatmaps** — Visual representations of bias patterns across features
- **AI Explanation Chatbot** — Interactive conversational interface for model exploration

## Quick Start

### Prerequisites
- Node.js 24+
- pnpm (required package manager)
- PostgreSQL (for database)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/anshupriyadas/Fairlens.git
   cd Fairlens
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root:
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/fairlens
   PORT=3000
   NODE_ENV=development
   ```

4. **Start development servers**
   
   Terminal 1 - API Server:
   ```bash
   pnpm --filter @workspace/api-server run dev
   ```
   
   Terminal 2 - Frontend:
   ```bash
   pnpm --filter @workspace/fairlens run dev
   ```

Access the application at `http://localhost:5173`

### Core Commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Build all packages
pnpm run build

# Run API server in development mode
pnpm --filter @workspace/api-server run dev

# Run frontend in development mode
pnpm --filter @workspace/fairlens run dev

# Regenerate API types from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push database schema changes
pnpm --filter @workspace/db run push
```

## Project Structure

This is a **pnpm workspace monorepo** with the following organization:

```
Fairlens/
├── artifacts/                    # Deployable applications
│   ├── api-server/              # Express.js API backend
│   ├── fairlens/                # React frontend (Vite + TailwindCSS)
│   └── mockup-sandbox/          # Sandbox environment
├── lib/                         # Shared libraries
│   ├── api-spec/               # OpenAPI specification
│   ├── api-zod/                # Generated Zod schemas
│   ├── api-client-react/       # React API client hooks
│   └── db/                     # Database layer (Drizzle ORM)
├── scripts/                     # Utility scripts
├── package.json                # Root workspace config
├── pnpm-workspace.yaml         # Workspace configuration
└── tsconfig.base.json          # Shared TypeScript config
```

### Key Technologies

**Backend:**
- Express 5 — HTTP API framework
- Drizzle ORM — Type-safe database queries
- PostgreSQL — Primary database
- Pino — Structured logging
- Zod — Runtime schema validation

**Frontend:**
- React 19 — UI framework
- Vite — Development server and build tool
- TailwindCSS — Utility-first styling
- Radix UI — Accessible component primitives
- React Query — Server state management
- Zustand — Client state management
- React Hook Form — Form state management

**Development:**
- TypeScript 5.9 — Static typing
- Prettier — Code formatting

## Development

### Architecture

The project follows a modular architecture:

1. **API Server** (`artifacts/api-server`) — Express server with REST endpoints
2. **Frontend** (`artifacts/fairlens`) — React SPA with responsive UI
3. **Shared Libraries** (`lib/*`) — Type definitions, database models, API clients
4. **Database** (`lib/db`) — Schema definitions and migrations via Drizzle

### Database Development

Database schema is defined in `lib/db` using Drizzle ORM:

```bash
# Add new migrations or update schema
pnpm --filter @workspace/db run push
```

### Type Safety

The project maintains strict type safety:

```bash
# Check types across all packages
pnpm run typecheck

# Build (includes type checking)
pnpm run build
```

### Supply Chain Security

The workspace enforces a minimum 1-day release age for npm packages to prevent supply-chain attacks. See `pnpm-workspace.yaml` for configuration.

## Getting Help

### Documentation
- Check the [replit.md](replit.md) file for detailed workspace information
- See individual package READMEs in `artifacts/*/` and `lib/*/` for specific documentation

### Support Resources
- **GitHub Issues** — Report bugs or request features
- **GitHub Discussions** — Ask questions and share ideas
- **Project Wiki** — Additional documentation and guides

## Contributing

We welcome contributions! To get started:

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Fairlens.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, typed TypeScript
   - Follow the project structure
   - Add tests where applicable

4. **Verify everything works**
   ```bash
   pnpm run typecheck
   pnpm run build
   ```

5. **Submit a Pull Request**
   - Provide clear description of changes
   - Reference related issues

### Development Tips
- Use `pnpm --filter` to run commands in specific packages
- The monorepo structure keeps dependencies isolated per package
- Always run typecheck before pushing

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ to make AI more fair and transparent**
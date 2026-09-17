# ConstroTrait

ConstroTrait is a modern construction enterprise platform designed for high performance, modularity, and enterprise data security.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4
- **Backend / Database**: Supabase (PostgreSQL + SSR Auth/Database)
- **Client/Server Auth**: `@supabase/ssr`

---

## Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env.local` and configure your Supabase connection:

```bash
cp .env.example .env.local
```

Populate the required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Project Structure

```text
src/
├── app/                  # Next.js App Router (pages, layouts, route groups)
│   ├── (auth)/           # Authentication route group
│   ├── (dashboard)/      # Workspace / Dashboard route group
│   ├── api/              # API Route Handlers
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Root landing page
│   └── globals.css       # Global styles
│
├── components/           # Reusable UI components
│   ├── ui/               # Minimal foundational primitives (Button, Input, Card, Spinner)
│   ├── common/           # Shared generic UI elements
│   ├── layout/           # Shared navigation and layout scaffolding
│   └── forms/            # Form wrappers and inputs
│
├── features/             # Feature domain modules
├── lib/                  # Utilities, constants, validations, and Supabase singletons
│   ├── supabase/         # Browser and server Supabase clients
│   └── utils/            # Shared helper functions (e.g. cn)
├── services/             # Centralized business logic & data-access layer
├── types/                # TypeScript type definitions and database schemas
└── config/               # App configuration
```

---

## Available Scripts

- `npm run dev`: Start Next.js development server
- `npm run build`: Build production bundle
- `npm run start`: Start production server
- `npm run lint`: Run ESLint checks

---

## Architecture & Guidelines

Before contributing or modifying the codebase, consult the documentation:

- [AGENTS.md](AGENTS.md) — Mandatory guidelines for AI agents
- [docs/architecture.md](docs/architecture.md) — System architecture & layered flow
- [docs/database.md](docs/database.md) — Database design & RLS rules
- [docs/api.md](docs/api.md) — API optimization & query standards
- [docs/authentication.md](docs/authentication.md) — Supabase SSR auth patterns
- [docs/security.md](docs/security.md) — Security & secret management
- [docs/coding-standards.md](docs/coding-standards.md) — TypeScript & React standards
- [docs/development-rules.md](docs/development-rules.md) — Development workflow

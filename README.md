# Monorepo

This is a monorepo containing three services:

- **web** - Frontend web application
- **api** - Backend API service
- **strategy** - Strategy service

## Structure

```
.
├── web/          # Frontend service
├── api/          # Backend API service
├── strategy/     # Strategy service
└── package.json  # Root workspace configuration
```

## Getting Started

### Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces.

### Development

Run all services in development mode:

```bash
npm run dev
```

Or run a specific service:

```bash
npm run dev --workspace=web
npm run dev --workspace=api
npm run dev --workspace=strategy
```

### Build

Build all services:

```bash
npm run build
```

Build a specific service:

```bash
npm run build --workspace=web
```

### Testing

Run tests for all services:

```bash
npm run test
```

## Workspace Management

This monorepo uses npm workspaces. Each service is an independent package that can have its own dependencies while sharing the root `node_modules` for common packages.

### Adding Dependencies

To add a dependency to a specific workspace:

```bash
npm install <package> --workspace=web
npm install <package> --workspace=api
npm install <package> --workspace=strategy
```

To add a dev dependency:

```bash
npm install <package> --workspace=web --save-dev
```

### Adding Root Dependencies

To add a dependency at the root level (shared across all workspaces):

```bash
npm install <package> -w .
```

## Services

### Web Service

Frontend application service. Configure your preferred framework (React, Vue, Next.js, etc.) in the `web/` directory.

### API Service

Backend API service. Configure your preferred framework (Express, Fastify, NestJS, etc.) in the `api/` directory.

### Strategy Service

Strategy service for business logic and algorithms. Configure based on your requirements in the `strategy/` directory.


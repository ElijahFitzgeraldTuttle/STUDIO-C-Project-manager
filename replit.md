# Project Flow - Replit Agent Guide

## Overview

Project Flow is a kanban-style project management application built with a modern full-stack architecture. The application allows teams to manage tasks across different workflow stages (prospect, scheduled, in-progress, complete) with support for comments, tracking fields, and real-time collaboration. The system uses a simple username-based authentication approach where users select their identity from a predefined list.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for client-side routing (lightweight React Router alternative)
- TailwindCSS v4 for utility-first styling with custom design tokens

**UI Component System**
- Shadcn/ui component library based on Radix UI primitives
- Custom theme configuration using CSS variables for light/dark mode support
- Framer Motion for animations and transitions (notably removed from dependencies but still used in components)
- Lucide React for iconography

**State Management**
- TanStack Query (React Query) for server state management, caching, and data synchronization
- React Context API for global user authentication state
- Local component state for UI interactions

**Design Decisions**
- Chose Wouter over React Router for minimal bundle size
- TanStack Query handles all API communication and caching, eliminating need for Redux/Zustand
- Component composition pattern with Radix UI ensures accessibility compliance
- Custom fonts (Inter and Space Grotesk) for professional typography

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server framework
- Dual-mode setup: development (with Vite middleware) and production (static file serving)
- RESTful API design pattern for task and comment operations

**Database Layer**
- PostgreSQL as the relational database (via Neon serverless)
- Drizzle ORM for type-safe database queries and schema management
- Schema-driven development with automatic TypeScript type generation

**API Structure**
- `/api/tasks` - CRUD operations for tasks
- `/api/tasks/:id/comments` - Comment management per task
- `/api/tasks/:id/comments/read` - Comment read tracking
- `/api/unread-counts` - Aggregate unread comment counts per user

**Authentication Approach**
- Username-based authentication without passwords (team collaboration focus)
- User context stored in localStorage for persistence
- Three predefined users: Miles, Eli, Chase

**Key Design Decisions**
- Separation of development and production server configurations for optimal DX
- Storage interface abstraction (`IStorage`) allows future database swapping
- Zod schema validation on API boundaries prevents invalid data entry
- Comment read tracking system for notification functionality

### Database Schema

**Users Table** (`users`)
- Primary purpose: User account storage (currently unused due to simple auth)
- Fields: id (UUID), username (unique), password
- Future-ready for password authentication implementation

**Tasks Table** (`tasks`)
- Core entity for project tracking
- Status field supports kanban workflow: prospect → scheduled → in-progress → complete
- Flexible tag system using PostgreSQL array type
- Boolean tracking fields for deliverables: delivered, invoiced, paid, distributed
- Assignee field references username for task ownership

**Comments Table** (`comments`)
- Threaded under tasks with cascade deletion
- Author field stores username
- Timestamp tracking for chronological ordering

**Comment Reads Table** (`comment_reads`)
- Junction table for tracking which users have read which comments
- Enables unread badge notifications on task cards
- Cascade deletes when parent comment is removed

**Schema Decisions**
- Drizzle ORM chosen for excellent TypeScript integration and migration tooling
- Array type for tags provides flexibility without junction table overhead
- Separate boolean fields for tracking vs. single status enum allows parallel workflows
- Cascade deletion ensures referential integrity without orphaned records

### External Dependencies

**Database Service**
- Neon Serverless PostgreSQL for managed database hosting
- WebSocket support for connection pooling via `ws` package
- Connection string via `DATABASE_URL` environment variable

**Third-party Libraries**
- Radix UI primitives for accessible component foundations
- TailwindCSS for utility-first styling system
- React Hook Form with Zod resolvers for form validation
- date-fns for date formatting and manipulation

**Development Tools**
- Replit-specific plugins for enhanced DX:
  - `@replit/vite-plugin-runtime-error-modal` - Error overlay
  - `@replit/vite-plugin-cartographer` - Code navigation
  - `@replit/vite-plugin-dev-banner` - Development indicators
- Custom `vite-plugin-meta-images` for OpenGraph image URL rewriting

**Build Pipeline**
- ESBuild for server-side code bundling in production
- TypeScript compiler for type checking without emission
- Drizzle Kit for database migrations and schema pushing

**Integration Points**
- Environment variables: `DATABASE_URL`, `NODE_ENV`, `REPL_ID`
- Google Fonts CDN for Inter and Space Grotesk typefaces
- Static asset serving from `/client/public` directory
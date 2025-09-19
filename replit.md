# Overview

SecureVault is a personal document management application designed for secure storage, organization, and tracking of important documents. The application provides features like document categorization, expiry date tracking, reminder notifications, and secure file uploads. It's built as a full-stack web application with a React frontend and Express.js backend, using PostgreSQL for data persistence.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using React with TypeScript and follows a modern component-based architecture:
- **UI Framework**: Uses shadcn/ui components with Radix UI primitives for consistent, accessible design
- **Styling**: Tailwind CSS for utility-first styling with CSS custom properties for theming
- **Routing**: wouter library for lightweight client-side routing
- **State Management**: React Query (@tanstack/react-query) for server state management with built-in caching and synchronization
- **Build System**: Vite for fast development and optimized production builds
- **File Structure**: Organized with clear separation between pages, components, hooks, and utilities

## Backend Architecture
The server follows a RESTful API pattern using Express.js:
- **Framework**: Express.js with TypeScript for type safety
- **API Design**: RESTful endpoints for documents, reminders, categories, and dashboard statistics
- **File Handling**: Multer middleware for handling file uploads with validation and size limits
- **Storage Layer**: Abstracted storage interface (IStorage) with in-memory implementation for development
- **Request Logging**: Custom middleware for API request logging and performance monitoring
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes

## Data Storage Solutions
The application uses a dual-storage approach:
- **Database**: PostgreSQL as the primary database with Drizzle ORM for type-safe database operations
- **Schema Design**: Well-structured tables for users, documents, reminders, and categories with proper relationships
- **Development Storage**: In-memory storage implementation for rapid development and testing
- **File Storage**: Local file system storage for uploaded documents with organized directory structure

## Authentication and Authorization
Implements production-ready Google OAuth authentication system:
- **Google OAuth**: Secure authentication using Google OAuth 2.0 with Passport.js strategy
- **Session Management**: Express sessions with connect-pg-simple for PostgreSQL session persistence
- **Centralized Auth State**: useAuth() hook provides single source of truth for authentication state
- **Route Protection**: All API endpoints secured with requireAuth middleware, frontend routes redirect to login when unauthenticated
- **Secure Logout**: POST-based logout with proper session cleanup and query cache clearing
- **User Management**: All operations scoped to authenticated user ID, replacing previous demo mode

## External Dependencies
- **Database Provider**: Neon Database (@neondatabase/serverless) for PostgreSQL hosting
- **UI Components**: Radix UI primitives for accessible, unstyled components
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Date Handling**: date-fns for comprehensive date manipulation and formatting
- **File Processing**: Multer for handling multipart/form-data uploads
- **Development Tools**: Replit-specific plugins for enhanced development experience in the Replit environment

# Recent Changes

- **September 19, 2025**: Implemented complete Google OAuth authentication system
  - Created centralized useAuth() hook with proper 401 handling (returns null instead of errors)
  - Fixed authentication loading loop by using null-based control flow instead of error-based
  - Updated all API routes to require authentication with proper user scoping
  - Secured file uploads, document management, and reminder creation to authenticated users
  - Added login page with Google sign-in integration and logout functionality

The architecture emphasizes type safety, developer experience, and scalability while maintaining simplicity for rapid development and deployment.
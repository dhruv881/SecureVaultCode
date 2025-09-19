# Running SecureVault Locally

This guide provides step-by-step instructions to run the SecureVault application on your local machine.

## Prerequisites

Before running the application locally, ensure you have the following installed:

### Required Software
- **Node.js**: Version 18.x or 20.x (recommended: 20.x)
- **npm**: Comes with Node.js (version 8.x or higher)
- **PostgreSQL**: Version 12 or higher
- **Git**: For cloning the repository

## System Requirements

- **Operating System**: Windows, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: At least 2GB free space
- **Network**: Internet connection for Google OAuth and dependencies

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd SecureVault
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

**IMPORTANT**: The application is configured to use Neon Database (serverless PostgreSQL). For local development, you have two options:

#### Option A: Use Neon Database (Recommended)
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a free account and new project
3. Copy the connection string from your dashboard
4. Use this as your `DATABASE_URL` in `.env`

#### Option B: Use Local PostgreSQL (Requires Code Changes)
If you prefer local PostgreSQL, you'll need to modify the database driver:

1. **Install PostgreSQL**:
   - **macOS**: `brew install postgresql && brew services start postgresql`
   - **Ubuntu/Debian**: `sudo apt install postgresql postgresql-contrib`
   - **Windows**: Download from https://www.postgresql.org/download/windows/

2. **Create Database**:
```bash
# Connect to PostgreSQL
psql postgres

# Enable UUID extension (required for schema)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

# Create database and user
CREATE DATABASE securevault;
CREATE USER securevault_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE securevault TO securevault_user;
\q
```

3. **Update Dependencies**:
```bash
npm uninstall @neondatabase/serverless
npm install pg @types/pg
```

4. **Update Database Connection** (`server/db.ts`):
```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { documents, users, reminders, categories } from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, { schema: { documents, users, reminders, categories } });
```

### 4. Environment Variables

**IMPORTANT**: The application doesn't automatically load `.env` files. You have three options:

#### Option A: Use Environment Variable Manager
Install and use `dotenv-cli`:
```bash
npm install -g dotenv-cli
```

Then create a `.env` file in the root directory:
```bash
# Database Configuration (use Neon connection string or local)
DATABASE_URL=postgresql://securevault_user:your_secure_password@localhost:5432/securevault

# Google OAuth Configuration  
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Session Configuration
SESSION_SECRET=your-very-secure-random-string-at-least-32-characters-long

# OCR Configuration (REQUIRED - app forces OCR on)
OPENAI_API_KEY=your-openai-api-key-for-document-scanning

# Development Settings
NODE_ENV=development
PORT=5000
```

#### Option B: Export Variables in Shell
**Linux/macOS**:
```bash
export DATABASE_URL="postgresql://your-connection-string"
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export SESSION_SECRET="your-32-character-secret"
export OPENAI_API_KEY="your-openai-key"
export NODE_ENV="development"
```

**Windows PowerShell**:
```powershell
$env:DATABASE_URL="postgresql://your-connection-string"
$env:GOOGLE_CLIENT_ID="your-client-id"
$env:GOOGLE_CLIENT_SECRET="your-client-secret"
$env:SESSION_SECRET="your-32-character-secret"
$env:OPENAI_API_KEY="your-openai-key"
$env:NODE_ENV="development"
```

**Windows CMD**:
```cmd
set DATABASE_URL=postgresql://your-connection-string
set GOOGLE_CLIENT_ID=your-client-id
set GOOGLE_CLIENT_SECRET=your-client-secret
set SESSION_SECRET=your-32-character-secret
set OPENAI_API_KEY=your-openai-key
set NODE_ENV=development
```

### 5. Google OAuth Setup

#### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. **No additional APIs needed** (OAuth works out of the box)

#### Configure OAuth Consent Screen
1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
   - Application name: "SecureVault"
   - User support email: your email
   - Developer contact information: your email
4. Add test users if needed

#### Create OAuth Client ID
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Add **Authorized redirect URIs**:
   ```
   http://localhost:5000/auth/google/callback
   https://localhost:5000/auth/google/callback
   ```
5. Copy the generated Client ID and Client Secret to your environment variables

#### ⚠️ **CRITICAL**: Fix OAuth Callback for Local Development
The application is hardcoded to use a Replit domain for OAuth callbacks. You **MUST** modify `server/index.ts`:

**Find this line** (around line 40-45):
```typescript
const callbackURL = process.env.NODE_ENV === 'production' 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/auth/google/callback`
  : `https://e90ca2a5-826d-4643-9333-6b53a4f7928d-00-2v0asdc3qu6kp.worf.replit.dev/auth/google/callback`;
```

**Replace it with**:
```typescript
const callbackURL = process.env.NODE_ENV === 'production' 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/auth/google/callback`
  : 'http://localhost:5000/auth/google/callback';
```

**Alternative**: Use a tunnel service like ngrok:
```bash
npm install -g ngrok
ngrok http 5000
```
Then use the generated HTTPS URL (e.g., `https://abc123.ngrok.io/auth/google/callback`) in both Google Console and the code.

### 6. Database Schema Setup

Run the database migration to create all necessary tables:

```bash
npm run db:push
```

If you encounter issues, use the force flag:
```bash
npm run db:push --force
```

### 7. Create Required Directories

```bash
mkdir -p uploads
mkdir -p attached_assets
```

## Running the Application

### Development Mode

**If using dotenv-cli**:
```bash
dotenv npm run dev
```

**If using exported environment variables**:

**Linux/macOS**:
```bash
npm run dev
```

**Windows PowerShell**:
```powershell
$env:NODE_ENV="development"; npm run dev
```

**Windows CMD**:
```cmd
set NODE_ENV=development && npm run dev
```

This command:
- Starts the Express server on port 5000
- Runs Vite dev server for hot module replacement  
- Enables TypeScript compilation
- Sets up file watching for auto-restart

⚠️ **Important**: The app forces OCR scanning to be enabled in the code (`process.env.ENABLE_REMOTE_OCR = 'true'`), so you **MUST** provide a valid `OPENAI_API_KEY` or document uploads may fail.

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push database schema changes |

## Application Structure

```
SecureVault/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
│   └── index.html         # HTML template
├── server/                # Express backend
│   ├── index.ts          # Main server file
│   ├── routes.ts         # API routes
│   ├── db.ts             # Database connection
│   ├── storage.ts        # Data storage layer
│   └── document-scanner.ts # OCR functionality
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema definitions
├── uploads/              # File upload directory
└── package.json          # Dependencies and scripts
```

## Technology Stack

### Frontend Dependencies
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **Radix UI** - Accessible component primitives
- **Tanstack Query** - Data fetching and caching
- **React Hook Form** - Form handling
- **Wouter** - Routing library
- **Lucide React** - Icon library
- **Framer Motion** - Animation library

### Backend Dependencies
- **Express** - Web server framework
- **TypeScript** - Type safety
- **Passport** - Authentication middleware
- **Passport Google OAuth20** - Google OAuth strategy
- **Express Session** - Session management
- **Multer** - File upload handling
- **Drizzle ORM** - Database ORM
- **Neon Database Serverless** - PostgreSQL driver
- **OpenAI** - AI-powered document scanning (optional)
- **Zod** - Schema validation

### Development Dependencies
- **TSX** - TypeScript execution
- **ESBuild** - Fast bundler
- **Drizzle Kit** - Database migration tool
- **PostCSS & Autoprefixer** - CSS processing
- **Tailwind CSS** - Utility-first CSS framework

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your-secret-key` |
| `SESSION_SECRET` | Session encryption key | `random-32-character-string` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |

### ⚠️ Important OCR Configuration
**CRITICAL**: The application code **forces OCR to be enabled** regardless of environment variables:
```typescript
process.env.ENABLE_REMOTE_OCR = 'true'; // Hardcoded in server/index.ts
```

This means:
- `OPENAI_API_KEY` is **REQUIRED**, not optional
- Document uploads may fail without a valid OpenAI API key
- To disable OCR, you must modify `server/index.ts` and comment out or remove the line that forces OCR on

## Features Available Locally

- ✅ **User Authentication** - Google OAuth login/logout
- ✅ **Document Upload** - Multi-format file uploads
- ✅ **Document Management** - View, categorize, delete documents
- ✅ **Document Preview** - PDF and image previews
- ✅ **Categories** - Pre-defined document categories
- ✅ **Reminders** - Expiry date tracking and notifications
- ✅ **Dashboard** - Statistics and overview
- ✅ **Search** - Document search functionality
- ✅ **Responsive Design** - Mobile and desktop compatible
- ⚠️ **OCR Scanning** - Requires OpenAI API key (optional)

## Troubleshooting

### Common Issues

#### Database Connection Error
```
Error: DATABASE_URL, ensure the database is provisioned
```
**Solution**: Ensure PostgreSQL is running and DATABASE_URL is set correctly in `.env`

#### Google OAuth Error
```
Error 400: redirect_uri_mismatch
```
**Solution**: Verify redirect URIs in Google Cloud Console match `http://localhost:5000/auth/google/callback`

#### Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
**Solution**: Kill process on port 5000 or change PORT in `.env`

```bash
# Kill process on port 5000
npx kill-port 5000
# OR
lsof -ti:5000 | xargs kill
```

#### File Upload Error
```
Cannot read properties of undefined (reading 'uploads')
```
**Solution**: Ensure `uploads/` directory exists

#### TypeScript Compilation Errors
```
TS2307: Cannot find module '@/components/...'
```
**Solution**: Verify path aliases in `tsconfig.json` and restart your IDE

#### Database Schema Mismatch
```
Error: relation "documents" does not exist
```
**Solution**: Run database migration
```bash
npm run db:push --force
```

#### PostgreSQL Extension Error
```
Error: function gen_random_uuid() does not exist
```
**Solution**: Enable the pgcrypto extension
```bash
psql your_database_url
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
\q
```

#### Windows Environment Variable Issues
```
'NODE_ENV' is not recognized as an internal or external command
```
**Solution**: Use platform-specific syntax or install cross-env
```powershell
# PowerShell
$env:NODE_ENV="development"; npm run dev

# Or install cross-env
npm install -g cross-env
# Then modify package.json scripts to use cross-env
```

#### OAuth Callback Mismatch (Local Development)
```
Error 400: redirect_uri_mismatch
```
**Solution**: The app is hardcoded for Replit domains. Either:
1. Modify `server/index.ts` callback URL to use localhost
2. Use ngrok tunnel and update Google Console with the tunnel URL

#### Environment Variables Not Loading
```
Error: Cannot read properties of undefined (reading 'GOOGLE_CLIENT_ID')
```
**Solution**: The app doesn't load `.env` files automatically. Use one of:
1. `dotenv-cli`: `dotenv npm run dev`
2. Export variables in your shell before running
3. Use a process manager like PM2 or nodemon with env file support

#### Session Issues
```
Error: Cannot read properties of undefined (reading 'user')
```
**Solution**: Ensure SESSION_SECRET is set and restart the server

### Development Tips

1. **Hot Reload**: Changes to client code auto-reload, server changes restart the server
2. **Database Changes**: Run `npm run db:push` after schema modifications
3. **Type Safety**: Run `npm run check` to verify TypeScript types
4. **Environment**: Use `.env` file for local configuration
5. **Debugging**: Check browser console and server logs for errors
6. **Database Inspection**: Use tools like pgAdmin or DBeaver to inspect your database

### Performance Optimization

1. **Clear Browser Cache**: If experiencing strange UI behavior
2. **Restart Development Server**: After major configuration changes
3. **Database Connection Pool**: PostgreSQL handles connection pooling automatically
4. **File Upload Size**: Default limit is handled by Multer configuration

## Database Schema

The application uses the following main tables:

- **users** - User authentication and profile data
- **documents** - Document metadata and file information
- **reminders** - Expiry date reminders and notifications
- **categories** - Document categorization system

Schema is automatically created via Drizzle ORM migrations.

## Security Considerations

- **Environment Variables**: Never commit `.env` file to version control
- **Session Secret**: Use a strong, random session secret in production
- **Database**: Use strong database credentials
- **HTTPS**: Consider using HTTPS in production (not required for local development)
- **File Uploads**: Files are stored locally in `uploads/` directory
- **Google OAuth**: Keep client secrets secure and never expose in client-side code

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Handle OAuth callback
- `POST /auth/logout` - Log out user
- `GET /api/auth/user` - Get current user info

### Documents
- `GET /api/documents` - List user documents
- `POST /api/documents/upload` - Upload new document
- `GET /api/documents/:id` - Get document details
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/download` - Download document file

### Categories & Reminders
- `GET /api/categories` - List document categories
- `GET /api/reminders` - List user reminders
- `POST /api/reminders` - Create new reminder

## Next Steps

Once the application is running locally:

1. **Test Authentication**: Try logging in with Google
2. **Upload Documents**: Test file upload functionality
3. **Explore Features**: Navigate through all application features
4. **Development**: Make changes and see them reflected immediately
5. **Database**: Inspect database tables with your preferred PostgreSQL client

## Production Deployment

For production deployment, consider:

1. **Environment Variables**: Set all required environment variables
2. **Database**: Use a production PostgreSQL instance
3. **Session Store**: Use Redis or PostgreSQL for session storage instead of memory
4. **File Storage**: Consider cloud storage (AWS S3, Google Cloud Storage)
5. **SSL/TLS**: Enable HTTPS for production
6. **Domain Configuration**: Update Google OAuth redirect URIs for production domain
7. **Security**: Implement additional security headers and CSRF protection

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Ensure all required services (PostgreSQL) are running
4. Check server and browser console logs for error messages
5. Verify Google OAuth configuration matches exactly

The application should now be fully functional locally with all features working including authentication, file upload, document management, and reminders.
# ContaEstoque - Stock Counting App

## Overview

ContaEstoque is a modern full-stack web application designed to simplify daily stock counting for beverages and soft drinks. The application provides a mobile-first interface for creating inventory counts, managing product data, and generating Excel reports for easy sharing and analysis.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Neon serverless connection
- **ORM**: Drizzle ORM for type-safe database operations
- **Excel Generation**: ExcelJS for creating downloadable spreadsheets
- **Session Management**: Express sessions with PostgreSQL store

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon
- **Local Storage**: Browser localStorage for temporary count data persistence
- **File Storage**: In-memory Excel generation with immediate download

## Key Components

### Database Schema
1. **Produtos Table**: Stores product master data with conversion factors
   - id, codigo (unique), nome, unidadesPorPacote, pacotesPorLastro, lastrosPorPallet, createdAt
2. **Contagens Table**: Stores count sessions (id, data, createdAt, excelUrl)
3. **Itens_Contagem Table**: Stores individual product counts with quantities (pallets, lastros, pacotes, unidades)

### Core Features
1. **Product Management**: Complete CRUD operations with codes and unit conversions
   - Product registry with unique codes and names
   - Unit conversion factors (unidades→pacotes→lastros→pallets)
   - Search by product name or code
   - Automatic total unit calculations
2. **Count Creation**: Date-based counting sessions with multiple products
3. **Inventory Tracking**: Four-tier quantity system with automatic unit conversion
4. **Excel Export**: Automated spreadsheet generation with formatted data
5. **History Management**: View and re-download previous counts

### UI Components
- Mobile-optimized responsive design (max-width: 428px)
- Modal-based product entry form
- Real-time search suggestions
- Toast notifications for user feedback
- Local storage integration for draft persistence

## Data Flow

1. **Count Creation**: User selects date → Opens product modal → Adds products with quantities → Saves count to database
2. **Product Search**: User types product name → Debounced API call → Returns matching products → User selects or creates new
3. **Excel Generation**: Count completion → Server generates Excel file → Returns download link → User downloads file
4. **History View**: User navigates to history → Loads all counts → Can re-download Excel files

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Connection Pooling**: Built-in connection management

### UI Libraries
- **Radix UI**: Headless component primitives
- **Lucide React**: Icon library
- **Class Variance Authority**: Component variant management
- **Date-fns**: Date manipulation and formatting

### Development Tools
- **ESBuild**: Production bundling
- **PostCSS**: CSS processing with Autoprefixer
- **Replit Integration**: Development environment optimizations

## Deployment Strategy

### Development
- Vite dev server with HMR
- Express server with TypeScript compilation
- Database migrations via Drizzle Kit

### Production
- Static asset building via Vite
- Server bundling via ESBuild
- Environment-based configuration
- Database schema deployment via migrations

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment specification

## Changelog
- June 30, 2025. Initial setup
- June 30, 2025. Enhanced product management with unit conversions and automatic calculations

## User Preferences
Preferred communication style: Simple, everyday language.
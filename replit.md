# Baytkom - بيتكم (Home Management)

## Overview
Arabic RTL web application for household shopping and task management. Features three role-based interfaces (Admin, Maid/Worker, Driver) plus a Household role with an approval system requiring only ONE authorized user to approve orders.

## Recent Changes (Feb 14, 2026)
- Replaced Replit Auth with custom username/password authentication (bcryptjs)
- First registered user automatically becomes admin with approval permission
- Added bilingual support (Arabic/English) with localStorage persistence
- Built complete CRUD for products, categories, orders, and users
- Added mobile-first responsive design with dark/light theme

## Architecture
- **Frontend**: React + Vite + TanStack Query + Wouter + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with session-based auth (connect-pg-simple)
- **Database**: PostgreSQL (Drizzle ORM)
- **Auth**: Custom username/password with bcryptjs hashing, express-session

## Project Structure
- `shared/schema.ts` - Database schema (users, categories, products, orders, orderItems)
- `server/routes.ts` - All API routes with session-based auth
- `server/storage.ts` - Database CRUD operations interface
- `client/src/App.tsx` - Main app with routing, theme toggle, language toggle
- `client/src/pages/login.tsx` - Login/Register page
- `client/src/pages/admin-dashboard.tsx` - Admin: orders, products, categories, users management
- `client/src/pages/maid-dashboard.tsx` - Maid: product grid, shopping cart, order creation
- `client/src/pages/driver-dashboard.tsx` - Driver: order fulfillment, actual prices, completion
- `client/src/pages/household-dashboard.tsx` - Household: order viewing, approval (if canApprove)
- `client/src/lib/i18n.ts` - Arabic/English translation system
- `client/src/hooks/use-auth.ts` - Auth hook for session management

## Key Features
- **Roles**: admin, household, maid, driver
- **Approval**: Only users with `canApprove=true` can approve/reject orders (one approval needed)
- **Language**: Arabic (primary, RTL) / English toggle with localStorage persistence
- **Theme**: Dark/Light mode toggle with localStorage persistence

## API Routes
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login with username/password
- POST `/api/auth/logout` - Logout
- GET `/api/auth/user` - Get current user
- GET/POST `/api/categories` - CRUD categories (admin only for POST)
- GET/POST `/api/products` - CRUD products (admin only for POST)
- GET/POST `/api/orders` - Orders (filtered by role)
- PATCH `/api/orders/:id/status` - Update order status
- GET/POST `/api/orders/:id/items` - Order items
- PATCH `/api/order-items/:id` - Update order item
- GET `/api/stats` - Dashboard statistics

## User Preferences
- Arabic as primary language with RTL layout
- Mobile-first design
- Large touch-friendly buttons for maid interface

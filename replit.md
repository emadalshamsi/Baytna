# Baytkom - بيتكم (Home Management)

## Overview
Arabic RTL web application for household shopping and task management. Features four role-based interfaces (Admin, Maid/Worker, Driver, Household) with an approval system requiring only ONE authorized user to approve orders. Includes vehicles management, trips system with waiting time tracking, and technicians directory.

## Recent Changes (Feb 14, 2026)
- Restructured admin dashboard from single tabbed page to sidebar-based navigation
- Admin uses Shadcn Sidebar (right-side for RTL) with separate routes per section
- Dashboard (/) = stats overview + quick links to sections
- Shopping section (/admin/shopping) = Orders, Products, Categories, Stores tabs
- Logistics section (/admin/logistics) = Trips, Vehicles, Technicians tabs
- Users section (/admin/users) = User management standalone page
- Non-admin roles (maid, driver, household) keep simple header-based layout
- Technicians page (/technicians) accessible to all roles

## Architecture
- **Frontend**: React + Vite + TanStack Query + Wouter + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with session-based auth (connect-pg-simple)
- **Database**: PostgreSQL (Drizzle ORM)
- **Auth**: Custom username/password with bcryptjs hashing, express-session

## Project Structure
- `shared/schema.ts` - Database schema (users, stores, categories, products, orders, orderItems, vehicles, trips, technicians)
- `server/routes.ts` - All API routes with session-based auth
- `server/storage.ts` - Database CRUD operations interface
- `client/src/App.tsx` - Main app with dual layouts: AdminLayout (sidebar) + SimpleLayout (header)
- `client/src/pages/login.tsx` - Login/Register page
- `client/src/pages/admin-dashboard.tsx` - Admin: stats overview + quick links
- `client/src/pages/admin-shopping.tsx` - Admin: orders, products, categories, stores management
- `client/src/pages/admin-logistics.tsx` - Admin: vehicles, trips, technicians management
- `client/src/pages/admin-users.tsx` - Admin: user role and permission management
- `client/src/pages/maid-dashboard.tsx` - Maid: product grid, shopping cart, order creation, order updates
- `client/src/pages/driver-dashboard.tsx` - Driver: order fulfillment, actual prices, receipt upload, store grouping, trips
- `client/src/pages/household-dashboard.tsx` - Household: order viewing, approval (if canApprove)
- `client/src/pages/technicians.tsx` - Technicians directory with call and coordination (all roles)
- `client/src/lib/i18n.ts` - Arabic/English translation system
- `client/src/hooks/use-auth.ts` - Auth hook for session management

## Key Features
- **Roles**: admin, household, maid, driver
- **Admin Navigation**: Sidebar with Dashboard, Shopping, Logistics, Users, Technicians sections
- **Stores**: Name (AR/EN), website URL, linked to products
- **Approval**: Only users with `canApprove=true` can approve/reject orders and trips
- **Stats**: Completed orders = current week (Sat-Fri), spending = current month
- **Driver**: Receipt upload, items grouped by store, trips with waiting timer
- **Maid**: Can add items to active (in_progress) orders
- **Vehicles**: Name, odometer reading, last maintenance date tracking
- **Trips**: Full lifecycle (pending → approved → started → waiting → completed) with waiting time
- **Technicians**: Directory with specialties, phone contacts, driver coordination
- **Language**: Arabic (primary, RTL) / English toggle with localStorage persistence
- **Theme**: Dark/Light mode toggle with localStorage persistence

## Admin Routes
- `/` - Stats dashboard with quick links
- `/admin/shopping` - Shopping section (Orders/Products/Categories/Stores tabs)
- `/admin/logistics` - Logistics section (Trips/Vehicles/Technicians tabs)
- `/admin/users` - User management
- `/technicians` - Technicians directory (shared with all roles)

## API Routes
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login with username/password
- POST `/api/auth/logout` - Logout
- GET `/api/auth/user` - Get current user
- GET/POST `/api/categories` - CRUD categories (admin only for POST)
- PATCH/DELETE `/api/categories/:id` - Update/delete category
- GET/POST `/api/stores` - CRUD stores (admin only for POST)
- PATCH/DELETE `/api/stores/:id` - Update/delete store
- GET/POST `/api/products` - CRUD products (admin only for POST)
- PATCH/DELETE `/api/products/:id` - Update/delete product
- GET/POST `/api/orders` - Orders (filtered by role)
- PATCH `/api/orders/:id/status` - Update order status
- PATCH `/api/orders/:id/actual` - Update actual total + receipt
- GET/POST `/api/orders/:id/items` - Order items
- POST `/api/orders/:id/items/maid` - Maid adds items to active order
- PATCH `/api/order-items/:id` - Update order item
- GET/POST `/api/vehicles` - CRUD vehicles (admin only for POST)
- PATCH/DELETE `/api/vehicles/:id` - Update/delete vehicle
- GET/POST `/api/trips` - Trips (filtered by role)
- PATCH `/api/trips/:id/status` - Update trip status (approval/start/wait/complete)
- GET/POST `/api/technicians` - CRUD technicians (admin only for POST)
- PATCH/DELETE `/api/technicians/:id` - Update/delete technician
- POST `/api/technicians/:id/coordinate` - Create coordination trip for technician
- POST `/api/upload` - File upload (images, receipts)
- GET `/api/stats` - Dashboard statistics (week/month scoped)

## User Preferences
- Arabic as primary language with RTL layout
- Mobile-first design
- Large touch-friendly buttons for maid interface
- Week runs Saturday to Friday

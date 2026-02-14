# Baytkom - بيتكم (Home Management)

## Overview
Arabic RTL web application for household shopping and task management. Features four role-based interfaces (Admin, Maid/Worker, Driver, Household) with an approval system requiring only ONE authorized user to approve orders. Includes vehicles management, trips system with waiting time tracking, and technicians directory.

## Recent Changes (Feb 14, 2026)
- Replaced sidebar + header navigation with Bottom Navigation Bar (5 icons at bottom of screen)
- All roles now use the same unified layout with bottom nav
- Navigation: Home (الرئيسية), Groceries (المشتريات), Logistics (الخدمات), Housekeeping (المنزل), Settings (الإعدادات)
- Settings page includes profile, theme/language toggles, logout, and user management (admin only)
- Housekeeping section is a placeholder (coming soon)
- Content in each tab adapts to user role (admin sees admin views, driver sees driver views, etc.)
- Added driver availability conflict detection system
- Trip waiting functionality with "arrived at location" button

## Architecture
- **Frontend**: React + Vite + TanStack Query + Wouter + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with session-based auth (connect-pg-simple)
- **Database**: PostgreSQL (Drizzle ORM)
- **Auth**: Custom username/password with bcryptjs hashing, express-session

## Project Structure
- `shared/schema.ts` - Database schema (users, stores, categories, products, orders, orderItems, vehicles, trips, technicians)
- `server/routes.ts` - All API routes with session-based auth
- `server/storage.ts` - Database CRUD operations interface
- `client/src/App.tsx` - Main app with bottom navigation bar layout for all roles
- `client/src/pages/login.tsx` - Login/Register page
- `client/src/pages/admin-dashboard.tsx` - Admin: stats overview + quick links
- `client/src/pages/admin-shopping.tsx` - Admin: orders, products, categories, stores management
- `client/src/pages/admin-logistics.tsx` - Admin: vehicles, trips, technicians management
- `client/src/pages/admin-users.tsx` - Admin: user role and permission management
- `client/src/pages/maid-dashboard.tsx` - Maid: product grid, shopping cart, order creation, order updates
- `client/src/pages/driver-dashboard.tsx` - Driver: order fulfillment, actual prices, receipt upload, store grouping, trips
- `client/src/pages/household-dashboard.tsx` - Household: order viewing, approval (if canApprove)
- `client/src/pages/housekeeping.tsx` - Placeholder page (coming soon)
- `client/src/pages/settings.tsx` - Profile, theme/language, logout, user management (admin)
- `client/src/lib/i18n.ts` - Arabic/English translation system
- `client/src/hooks/use-auth.ts` - Auth hook for session management

## Navigation (Bottom Nav Bar)
All roles use the same 5-tab bottom navigation:
- `/` - Home: Dashboard stats (role-specific content)
- `/groceries` - Groceries: Shopping & orders (role-specific content)
- `/logistics` - Logistics: Vehicles, trips, technicians (role-specific content)
- `/housekeeping` - Housekeeping: Coming soon placeholder
- `/settings` - Settings: Profile, theme, language, logout, user management (admin)

### Content per role per tab:
- **Admin**: Home=stats+quick links, Groceries=admin shopping, Logistics=admin logistics, Settings=profile+users
- **Maid**: Home=maid dashboard, Groceries=maid dashboard, Logistics=admin logistics view
- **Driver**: Home=driver dashboard, Groceries=driver dashboard, Logistics=driver dashboard
- **Household**: Home=household dashboard, Groceries=household dashboard, Logistics=admin logistics view

## Key Features
- **Roles**: admin, household, maid, driver
- **Navigation**: Bottom nav bar with 5 tabs (Home, Groceries, Logistics, Housekeeping, Settings)
- **Stores**: Name (AR/EN), website URL, linked to products
- **Approval**: Only users with `canApprove=true` can approve/reject orders and trips
- **Stats**: Completed orders = current week (Sat-Fri), spending = current month
- **Driver**: Receipt upload, items grouped by store, trips with waiting timer, availability conflict detection
- **Maid**: Can add items to active (in_progress) orders
- **Vehicles**: Name, odometer reading, last maintenance date tracking
- **Trips**: Full lifecycle (pending → approved → started → waiting → completed) with waiting time
- **Technicians**: Directory with specialties, phone contacts, driver coordination
- **Language**: Arabic (primary, RTL) / English toggle (in Settings page)
- **Theme**: Dark/Light mode toggle (in Settings page)

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
- GET `/api/drivers/:id/availability` - Check driver availability (conflict detection)
- GET/POST `/api/technicians` - CRUD technicians (admin only for POST)
- PATCH/DELETE `/api/technicians/:id` - Update/delete technician
- POST `/api/technicians/:id/coordinate` - Create coordination trip for technician
- POST `/api/upload` - File upload (images, receipts)
- GET `/api/stats` - Dashboard statistics (week/month scoped)

## User Preferences
- Arabic as primary language with RTL layout
- Mobile-first design with bottom navigation bar
- Large touch-friendly buttons for maid interface
- Week runs Saturday to Friday

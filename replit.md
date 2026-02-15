# Baytkom - بيتكم (Home Management)

## Overview
Arabic RTL web application for household shopping and task management. Features four role-based interfaces (Admin, Maid/Worker, Driver, Household) with an approval system requiring only ONE authorized user to approve orders. Includes vehicles management, trips system with waiting time tracking, and technicians directory.

## Recent Changes (Feb 15, 2026)
- Added Shortages (نواقص) feature: users with canAddShortages permission can request shortage items
- Shortages table: nameAr, nameEn, quantity, notes, status (pending/approved/rejected/in_progress/completed), createdBy
- Profile management: users can upload/remove profile photo, change password, toggle push notifications
- PATCH /api/auth/profile and POST /api/auth/change-password endpoints added
- User-room assignment: admin can assign rooms to household users, users only see tasks/laundry for their rooms
- userRooms junction table links users to rooms, admin manages via expandable user cards
- Household users with assigned rooms see filtered tasks, laundry in Housekeeping page
- canAddShortages permission toggle in admin user management (blue button, matching canApprove)
- Admin sees all shortages in Groceries > Shortages tab with approve/reject/progress/complete workflow
- Household dashboard rebuilt to match maid interface: product grid, categories, cart, order creation with prices
- Household orders tab: expandable order details with item list, prices, status badges
- canApprove users can add/edit/delete products, categories, and stores (not admin-only anymore)
- Household gets tabs: Shopping, Orders, Products/Categories/Stores (if canApprove), Shortages (if canAddShortages)
- Push notifications: new shortage notifies admins, status changes notify requesters
- Hidden all prices (estimated/actual) from maid dashboard view
- Replaced daily/weekly/monthly frequency filter with horizontal date strip in Tasks tab
- Added daysOfWeek integer[] column to housekeeping_tasks for flexible day-of-week scheduling
- DateStrip component: scrollable 29-day range centered on today, auto-scrolls to selected date
- DaysOfWeekSelector component: multi-select toggle for choosing recurring days when creating tasks
- Tasks now filter by selected date's day-of-week matching task's daysOfWeek array
- Completion tracking uses simple YYYY-MM-DD date strings per selected date
- Added i18n translations for day abbreviations (sat/sun/mon/tue/wed/thu/fri)

## Previous Changes (Feb 14, 2026)
- Built complete Housekeeping module with 3 subsystems: Tasks, Laundry, Kitchen
- Added 6 new database tables: rooms, housekeepingTasks, taskCompletions, laundryRequests, laundrySchedule, meals
- Room management in Settings page (admin can add, exclude, delete rooms)
- Laundry tab: household sends laundry requests per room, maid marks as done, admin manages weekly schedule
- Kitchen tab: weekly meal planning with meal type, people count, notes, image URLs
- All housekeeping features have full Arabic/English i18n support
- Role-based access: admin manages all, maid completes tasks/laundry, household requests laundry, all can view meals
- Real-time sync via TanStack Query with 10-second refetch intervals

## Architecture
- **Frontend**: React + Vite + TanStack Query + Wouter + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with session-based auth (connect-pg-simple)
- **Database**: PostgreSQL (Drizzle ORM)
- **Auth**: Custom username/password with bcryptjs hashing, express-session

## Project Structure
- `shared/schema.ts` - Database schema (users, stores, categories, products, orders, orderItems, vehicles, trips, technicians, rooms, housekeepingTasks, taskCompletions, laundryRequests, laundrySchedule, meals)
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
- `client/src/pages/housekeeping.tsx` - Housekeeping: 3 tabs (Tasks, Laundry, Kitchen) with role-based access
- `client/src/pages/settings.tsx` - Profile, theme/language, logout, room management (admin), user management (admin)
- `client/src/lib/i18n.ts` - Arabic/English translation system
- `client/src/hooks/use-auth.ts` - Auth hook for session management

## Navigation (Bottom Nav Bar)
All roles use the same 5-tab bottom navigation:
- `/` - Home: Dashboard stats (role-specific content)
- `/groceries` - Groceries: Shopping & orders (role-specific content)
- `/logistics` - Logistics: Vehicles, trips, technicians (role-specific content)
- `/housekeeping` - Housekeeping: Tasks, Laundry, Kitchen (role-specific content)
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
- GET/POST `/api/rooms` - Rooms CRUD (admin only for POST)
- PATCH/DELETE `/api/rooms/:id` - Update/delete room (admin only)
- GET/POST `/api/housekeeping-tasks` - Tasks CRUD (admin only for POST)
- PATCH/DELETE `/api/housekeeping-tasks/:id` - Update/delete task (admin only)
- GET `/api/task-completions/:date` - Get completions by date key
- POST `/api/task-completions` - Create task completion
- DELETE `/api/task-completions/:taskId/:date` - Remove completion
- GET `/api/laundry-requests` - List laundry requests
- POST `/api/laundry-requests` - Create laundry request
- PATCH `/api/laundry-requests/:id/complete` - Mark laundry as done
- GET `/api/laundry-schedule` - Get laundry schedule
- PUT `/api/laundry-schedule` - Set laundry schedule days (admin only)
- GET/POST `/api/meals` - Meals CRUD (admin only for POST)
- PATCH/DELETE `/api/meals/:id` - Update/delete meal (admin only)

## User Preferences
- Arabic as primary language with RTL layout
- Mobile-first design with bottom navigation bar
- Large touch-friendly buttons for maid interface
- Week runs Saturday to Friday

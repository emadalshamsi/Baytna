# Baytna - بيتنا (Home Management)

## Overview
Baytna is an Arabic RTL web application designed for comprehensive household management, focusing on shopping, task management, and logistics. It features distinct role-based interfaces (Admin, Maid/Worker, Driver, Household) with a streamlined approval system requiring only one authorized user for orders and trips. The project aims to digitalize and optimize household operations, including managing vehicles, tracking trips with waiting times, maintaining a technicians directory, and overseeing housekeeping activities like tasks, laundry, and meal planning.

## User Preferences
- Arabic as primary language with RTL layout
- Mobile-first design with bottom navigation bar
- Large touch-friendly buttons for maid interface
- Week runs Saturday to Friday

## System Architecture
The application is built with a modern web stack:
- **Frontend**: React, Vite, TanStack Query for data fetching and state management, Wouter for routing, Tailwind CSS and shadcn/ui for styling.
- **Backend**: Express.js handles API requests and business logic, with session-based authentication using `connect-pg-simple`.
- **Database**: PostgreSQL is used as the primary data store, with Drizzle ORM for database interactions.
- **Authentication**: Custom username/password authentication with `bcryptjs` for secure password hashing and `express-session` for session management.

**Key Architectural Decisions & Features:**
- **Role-Based Access Control**: Granular permissions for Admin, Household, Maid, and Driver roles, dictating access to features and data.
- **Internationalization**: Full Arabic (RTL) and English support across the application.
- **Modular Design**: Separation of concerns with dedicated components and pages for different functionalities (e.g., shopping, logistics, housekeeping).
- **Housekeeping Module**: Integrated Task, Laundry, and Kitchen management with dedicated database tables and role-specific workflows.
  - **Tasks**: Flexible scheduling with `daysOfWeek` array, date strip for navigation, and completion tracking.
  - **Laundry**: Request system per room, maid completion tracking, and admin-managed weekly schedule.
  - **Kitchen**: Two-tier meal management with a reusable meal catalog and date-specific meal planning.
- **Logistics & Trips**:
  - **Vehicles**: Management of private and shared vehicles, including odometer and maintenance tracking.
  - **Trips**: Comprehensive lifecycle management (pending, approved, started, waiting, completed) with waiting time tracking and driver availability conflict detection.
  - **Personal Trips**: Drivers can create personal trips that go through the standard approval workflow.
- **Shopping & Orders**:
  - **Product Management**: Auto-generated unique item codes, import/export functionality for products via Excel, and image cropping.
  - **Order Workflow**: Approval system, scheduling options (Today/Now/Tomorrow), ability for `canApprove` users to edit pending orders, and driver-specific order visibility.
  - **Shortages Feature**: Users can request shortage items with a dedicated workflow (pending, approved, rejected, in_progress, completed).
- **Notifications**: System for relevant user groups (e.g., admins for new orders/trips, requesters for shortage status changes).
- **UI/UX**: Mobile-first approach, bottom navigation bar for consistent access, theme (dark/light) toggle.
- **User Management**: Admins can manage user roles, permissions (e.g., `canApprove`, `canAddShortages`), and assign rooms to household users.
- **Image Handling**: Cloudinary integration for image storage and management, with improved cleanup and error handling.
- **ZIP Import/Export**: Bulk product management via ZIP files containing Excel + images named by itemCode.
  - Import: Extracts Excel data, matches images by filename to itemCode, uploads to Cloudinary.
  - Export: Downloads ZIP with Excel + all product images from Cloudinary.
  - SSRF protection, zip bomb mitigation, timeout/size limits.
- **Startup Migrations**: Auto-adds missing columns (item_code, unit_ar, unit_en) on server start.

## External Dependencies
- **Cloudinary**: For image storage, optimization, and delivery.
- **PostgreSQL**: Relational database management system.
- **Node.js**: Runtime environment for the backend.
- **React**: Frontend JavaScript library.
- **Vite**: Frontend build tool.
- **TanStack Query**: Data fetching and state management library.
- **Wouter**: Small routing library for React.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: UI component library.
- **Express.js**: Web application framework for Node.js.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **bcryptjs**: Library for hashing passwords.
- **express-session**: Middleware for managing user sessions.
- **connect-pg-simple**: PostgreSQL session store for `express-session`.
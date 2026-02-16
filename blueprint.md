# Project Blueprint: ASBN Admin Dashboard

## Overview

This document outlines the structure, design, and features of the ASBN Admin Dashboard, a comprehensive tool for managing cleaning business operations. The dashboard is built with Next.js, TypeScript, and Tailwind CSS, featuring a modern, responsive, and intuitive user interface.

## Core Features & Design

### 1. **Admin Layout**
*   **Technology**: Next.js App Router, Client Component (`"use client"`)
*   **State Management**: `useState` for sidebar state.
*   **Responsiveness**: Handles both desktop (collapsible sidebar) and mobile (slide-in overlay) views gracefully.
*   **Components**: Comprises a `Sidebar`, `TopNav`, and a main `AdminLayout` that orchestrates the UI.

### 2. **Dashboard Overview Page (`/admin/dashboard`)**
*   **Purpose**: Provides a real-time, at-a-glance view of key business metrics using stats cards, charts, and an activity feed.
*   **Styling**: Modern and clean design with subtle animations.

### 3. **Company & Unit Management Page (`/admin/companies`)**
*   **Purpose**: A two-column layout to manage clients (Companies) and their properties (Units).
*   **State Management**: Utilizes a reactive approach with `useEffect` dependent on `selectedCompany` to fetch and display units, ensuring UI consistency. Features optimistic updates with revert-on-failure for all CRUD operations.

### 4. **Advanced Team Management (Daily Squad) (`/admin/teams`)**
*   **Purpose**: A sophisticated system for creating, adjusting, and managing daily cleaning squads. It ensures that agents are not double-booked and provides a clear view of the day's operational teams.
*   **Core Logic**: Features day-specific team loading (`shift_date`) and an intelligent availability checker (`getAvailableAgents`) to prevent double-booking. Includes a unified modal for creating and editing teams dynamically.
*   **Data Model**: The `teams` table is enhanced with `status`, `shift_date`, and `updated_at` to support this daily, stateful logic.

### 5. **Employee Management Page (`/admin/employees`)**
*   **Purpose**: A comprehensive directory for managing all staff, including `agents` and `supervisors`. It provides functionality for creating, viewing, updating, and deleting employee records.
*   **Backend (Server Actions)**:
    *   **Secure Operations**: Uses a Supabase admin client (`service_role` key) within Server Actions (`actions.ts`) to securely perform administrative tasks.
    *   **`createEmployeeAction`**: Creates a new user in the `auth.users` table and simultaneously creates a corresponding entry in the `profiles` table. This ensures data consistency between authentication and user profile information.
    *   **`deleteEmployeeAction`**: Deletes a user from the `auth.users` table. Database policies are set up to cascade the delete to the corresponding `profiles` entry.
    *   **`updateEmployeeAction`**: Updates employee details directly in the `profiles` table.
*   **Frontend UI & UX**:
    *   **Main View**: A searchable grid of employee cards. Each card displays the employee's name, role (differentiated by color), and status. A search bar allows for quick filtering.
    *   **Slide-Over Profile Viewer**: Clicking on an employee card opens a sleek, animated side sheet from the right. This provides a detailed view of the employee without leaving the main page.
        *   **Profile Details**: Shows the employee's full name, role, contact info (phone, email), and join date.
        *   **Inline Editing**: A dedicated "Edit" button (✏️) switches the profile view into an editable form. The user can update details like phone number and role directly within the side sheet. A "Save" button commits the changes using the `updateEmployeeAction`.
    *   **Add Employee Modal**: A separate modal is used to add new employees. It captures all necessary information (name, email, password, phone, role) and uses the `createEmployeeAction` to register the new staff member.
*   **State Management**: The page uses `useState` to manage the list of employees, loading states, search queries, and the state of modals and the slide-over. It optimistically updates the UI for delete operations to provide a faster user experience.

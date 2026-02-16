# Project Blueprint: ASBN Admin Dashboard

## Overview

This document outlines the structure, design, and features of the ASBN Admin Dashboard, a comprehensive tool for managing cleaning business operations. The dashboard is built with Next.js, TypeScript, and Tailwind CSS, featuring a modern, responsive, and intuitive user interface.

## Core Features & Design

### 1. **Admin Layout**
*   **Technology**: Next.js App Router, Client Component (`"use client"`)
*   **State Management**: `useState` for sidebar state.
*   **Responsiveness**:
    *   **Desktop**: A collapsible sidebar that is open by default. A toggle button allows collapsing it to an icon-only view, expanding the main content area.
    *   **Mobile**: The sidebar is hidden by default. A hamburger menu icon in the top navigation opens the sidebar as a slide-in overlay from the left. A backdrop is shown, and clicking on it or the close icon hides the sidebar.
*   **Components**:
    *   `Sidebar.tsx`: The main navigation component. It's responsive and handles both desktop and mobile states. It includes links to all major sections of the dashboard.
    *   `TopNav.tsx`: The top navigation bar. It contains a search bar, user profile information, notifications, and the hamburger menu icon for mobile view.
    *   `AdminLayout.tsx`: The main layout file that orchestrates the `Sidebar` and `TopNav` components, managing the state for the responsive behavior.

### 2. **Dashboard Overview Page (`/admin/dashboard`)**
*   **Purpose**: Provides a real-time, at-a-glance view of key business metrics.
*   **Design**:
    *   **Stats Cards**: A grid of cards displaying important statistics like "Total Revenue", "Active Teams", "Pending Tasks", and "Completed Today". These cards feature icons, metric values, and change indicators.
    *   **Charts**: Placeholder areas for "Revenue Analytics" and other visual data representations.
    *   **Activity Feed**: A list showing recent activities, such as new bookings.
*   **Styling**: Uses `motion` for subtle animations, clean typography, and a balanced layout with ample whitespace.

### 3. **Company & Unit Management Page (`/admin/companies`)**
*   **Purpose**: A dedicated section to manage clients (Companies) and their associated properties (Units).
*   **Design (Two-Column Layout)**:
    *   **Left Column (Clients List)**: Displays a searchable list of clients. The selected client is highlighted. A modal is used for adding new clients, and a delete icon appears on hover.
    *   **Right Column (Units Management)**: Displays an animated grid of units for the selected client, with options to add or delete units via modals and buttons.
*   **State Management**: Utilizes a reactive approach with `useEffect` dependent on `selectedCompany` to fetch and display units, ensuring UI consistency. It also features optimistic updates with revert on failure for CRUD operations.

### 4. **Team Management Page (`/admin/teams`)**
*   **Purpose**: To create, manage, and view cleaning teams composed of agents. This is crucial for assigning teams to future bookings.
*   **Design & Features**:
    *   **Main View**: A grid layout displaying all created teams as cards. Each card shows the team name, number of members, and a list of member avatars and names.
    *   **Create Team Modal**: A full-featured modal for creating new teams.
        *   **Team Name**: A dedicated input field for the team's name.
        *   **Multi-Select Agent List**: Fetches all users with the `role` of "agent" from the `profiles` table and displays them in a selectable list. The admin can select multiple agents to form a team.
        *   **Visual Selection**: Selected agents are visually highlighted with a checkmark and a change in background color, providing clear feedback.
        *   **Dynamic Button**: The "Create Team" button in the modal is disabled until a team name is entered and at least one agent is selected. It also dynamically shows the count of selected members.
*   **Data Model**:
    *   **`profiles` table**: Stores user information, including a `role` column to distinguish agents.
    *   **`teams` table**: Stores team information, including `team_name` and `member_ids` (an array of UUIDs corresponding to the selected agents).
*   **Interactivity & State Management**:
    *   **Data Fetching**: On page load, it fetches all agents and all existing teams from the database.
    *   **Optimistic Updates**: When a new team is created or a team is deleted, the UI updates instantly. If the database operation fails, the action is reverted, and an alert is shown.
    *   **Helper Function**: A `getAgentDetails` function is used to efficiently look up agent information from the `agents` state to display in the team cards.
    *   **User Feedback**: A loading spinner is shown during initial data fetching. An empty state is displayed if no teams have been created, guiding the user to create one.

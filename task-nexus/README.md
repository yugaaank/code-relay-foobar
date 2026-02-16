# Task Nexus — Enterprise Task Manager

A full-stack task management application built with **React**, **Vite**, **Node.js**, **Express**, and **MySQL**.

## Features

- **Authentication** — Register & Login with JWT tokens
- **Workspaces** — Organize teams and members
- **Projects** — Group tasks within workspaces with color coding
- **Tasks** — Kanban board and list views with priorities and due dates
- **Analytics** — Dashboard with task statistics and breakdown charts

## Project Structure

```
├── server/             # Node.js + Express backend
│   ├── server.js       # Main server file (all routes)
│   └── package.json
├── client/             # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx                   # Main app with routing
│   │   ├── App.css                   # Global styles
│   │   ├── main.jsx                  # Entry point
│   │   ├── modules/
│   │   │   ├── context/AuthContext.jsx   # Auth state management
│   │   │   ├── Layout.jsx                # App shell (sidebar + nav)
│   │   │   ├── UI/                       # Reusable UI components
│   │   │   └── TaskComponents/           # Legacy task components
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Workspaces.jsx
│   │       ├── Projects.jsx
│   │       └── Tasks.jsx
│   ├── vite.config.js
│   └── package.json
├── database.sql        # MySQL schema
└── README.md           # You are here
```

## Setup Instructions

### Prerequisites

- **Node.js** v16 or higher
- A hosted **PostgreSQL** database (Railway, Supabase, Neon, etc.) or local Postgres

### 1. Database

Provision a Postgres database and grab its connection string, e.g.:
`postgresql://user:password@host:5432/task_nexus?schema=public`

### 2. Environment

Create a `.env` file in the `server/` directory:

```env
DATABASE_URL="postgresql://user:password@host:5432/task_nexus?schema=public"
PORT=5000
JWT_SECRET=change-me
```

Prisma uses `DATABASE_URL` for all queries. If your provider requires SSL, append `&sslmode=require` to the URL.

### 3. Backend

```bash
cd server
npm install
npx prisma generate
npx prisma db push         # creates/updates tables from Prisma schema
npm start
```

The server runs on **http://localhost:5000**

### 4. Frontend

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

The client runs on **http://localhost:3000**

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 18, Vite, Axios, React Router, Lucide Icons |
| Backend | Node.js, Express, Prisma, JSON Web Tokens |
| Database | PostgreSQL (via Prisma) |
| Styling | Vanilla CSS with glassmorphism design |

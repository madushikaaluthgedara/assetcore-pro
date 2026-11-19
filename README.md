# AssetCore Pro — Asset Management & Maintenance Scheduler

A desktop application for factory asset management and maintenance scheduling.
Factories register their machines, schedule and track maintenance work orders,
record downtime and spare parts, and report breakdowns — with three role-based
workspaces (Admin, Technician, User/Operator).

Built as a Computer Programming mini project — **Group 08**.

## Features

- **Machine register** — machine code, category, department, location, install date
- **Work orders** — Preventive / Breakdown / Inspection jobs with scheduled date & time
- **Automatic machine status** — Running / Under Maintenance / Breakdown, recomputed from open work orders
- **Breakdown tickets** — operators report issues; admins convert them into work
- **Technician workspace** — assigned jobs, completion with downtime end & spare parts used
- **Reports** — PDF and Excel exports, machine QR tag PDFs
- **Security** — bcrypt password hashing, JWT login sessions, protected admin accounts
- **Audit log** — key system actions are recorded
- **Light & dark themes**

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (SPA), Electron desktop shell |
| Backend | Node.js + Express REST API (port 5000) |
| Database | MySQL (`asset_db`, six tables) |
| Auth | JWT + bcryptjs password hashing |
| Reports | jsPDF (PDF), SheetJS (Excel), qrcode (QR tags) |

## Project structure

```
frontend/    React app + Electron main process (main.cjs)
backend/     Express API — routes, auth middleware, MySQL connection
database.sql Full schema + seed data (creates the admin account)
```

## Getting started

1. Install MySQL and import the schema:
   ```sql
   SOURCE database.sql;
   ```
2. Configure the backend — copy `backend/.env.example` to `backend/.env`
   and set your MySQL credentials.
3. Start the backend:
   ```
   cd backend
   npm install
   npm start
   ```
4. Start the app:
   ```
   cd frontend
   npm install
   npm run electron
   ```

**Default admin login:** `admin@gmail.com` / `admin123`

## Team — Group 08

| Index | Role |
|---|---|
| 2023T01614 | Database Design & Security / Backend Lead |
| 2023T01596 | SPA Frontend Development & UI/UX Design |

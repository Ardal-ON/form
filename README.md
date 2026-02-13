# SCR Forms Web App

This project provides a role-based forms system for a Formula SAE team. Users
login, see only their assigned subteam forms, and submit updates. Every change
is recorded with timestamps and user information. The backend watches a folder
for new `.ldx` XML files and injects the latest values into the file's `detail`
section.

## Features
- Role-based login (admin or subteam roles)
- Config-driven forms (YAML/JSON)
- Latest values prefilled on forms
- Audit log of every field change
- Admin dashboard for user management, audit table, and watch directory
- LDX watcher that injects current values into new `.ldx` files

## Tech Stack
- Backend: FastAPI + SQLModel + SQLite
- Frontend: React + Vite
- Deployment: Docker Compose

## Roles
Subteam roles are:
`DAQ`, `Chief`, `suspension`, `electronic`, `drivetrain`, `driver`, `chasis`,
`aero`, `ergo`.

Admins do not have subteam roles. Non-admin users can have up to two subteam
roles.

## Form Configuration
Forms live in `backend/forms/` as YAML or JSON files. Each file maps to a role.

Example (`backend/forms/daq.yaml`):
```
form_name: "DAQ Form"
role: "DAQ"
fields:
  - name: "sampling_rate"
    label: "Sampling Rate (Hz)"
    type: "number"
    required: true
  - name: "notes"
    label: "Notes"
    type: "textarea"
```

Supported field types:
- `text`
- `number`
- `textarea`
- `select` (use `options`)

## Environment Variables
Backend (`docker-compose.yml`):
- `ADMIN_USERNAME`: bootstrap admin username (first run)
- `ADMIN_PASSWORD`: bootstrap admin password (first run)
- `JWT_SECRET`: secret for signing JWT tokens
- `LDX_WATCH_DIR`: default watch directory (used if admin has not set one)

Frontend:
- `VITE_API_URL`: backend base URL (baked at build time)

## Local Development (without Docker)
Backend:
1. `cd backend`
2. `python -m venv .venv`
3. `source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. `export ADMIN_USERNAME=admin ADMIN_PASSWORD=admin123 JWT_SECRET=change-me`
6. `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

Frontend:
1. `cd frontend`
2. `npm install`
3. `VITE_API_URL=http://localhost:8000 npm run dev`

## Docker Deployment
1. Make sure Docker is installed on the OpenMediaVault host.
2. Create a directory for the project and place this repo there.
3. Update `docker-compose.yml` with your own `JWT_SECRET` and admin credentials.
4. Optionally create a host folder for LDX files: `./ldx`.
5. Run:
   ```
   docker compose up --build -d
   ```

### Access
- Frontend: `http://<host>:8080`
- Backend API: `http://<host>:8000`

### First Login
Use the admin credentials from `docker-compose.yml` (default is `admin/admin123`).
Change the password after first login.

## Admin Workflow
1. Login as admin.
2. Set the LDX watch directory in the admin dashboard.
   - In Docker, use `/ldx` to point at the mounted folder.
3. Create users and assign roles.
4. Use the audit table to review recent changes.
5. Admin can open and submit any form with current values prefilled.

## LDX Injection
When a new `.ldx` file appears in the watch directory, the backend injects all
current form values into the file's `detail` section as `<entry>` elements.

## Data Storage
- SQLite DB is stored in `backend/data/app.db` (mounted as a Docker volume).
- You can back up the DB by copying this file.

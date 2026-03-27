# URAS - Unified Room Allocation System

## Setup

The backend and frontend are separated into independent packages, but the system guarantees a zero-config start.

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment (`setup .env`)**
   ```bash
   cp backend/.env.example backend/.env
   # Ensure DATABASE_URL corresponds to your local or Docker PostgreSQL instance
   ```
   > By default, `docker-compose.yml` matches the connection string inside `.env.example`.

3. **Run Safe Setup**
   ```bash
   cd backend
   npm run setup
   ```
   > This automatically checks connection reliability, applies Drizzle schema migrations, and seeds the testing dataset.
   
4. **Start the System**
   ```bash
   # From root folder (or separate terminals)
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

## Default Accounts
Seed data generates the following default credentials.

- **Admin:** `admin@ura.com` / `password123`
- **Staff:** `staff@ura.com` / `password123`
- **Faculty:** `faculty@ura.com` / `password123`
- **Student:** `student@ura.com` / `password123`

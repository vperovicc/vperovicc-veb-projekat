# Travel Planner App

A full-stack web application for organizing trips from start to finish — destinations, daily activity schedules, expense tracking, packing checklists, and shareable travel plans via QR codes.

**Stack:** React + TypeScript frontend, Microsoft Service Fabric microservices backend, SQL Server database.

---

## Requirements

Before running anything, make sure you have the following installed:

| Tool | Notes |
|---|---|
| .NET SDK 3.1 | Required for all backend services |
| Node.js 18+ | Required for the frontend |
| Docker Desktop | Used to run SQL Server locally |
| Service Fabric SDK | Required for the local SF cluster — Windows only |
| Visual Studio 2019+ | Recommended for deploying the SF application |

> **Note:** The Service Fabric local cluster only runs on Windows. The React frontend works on any operating system.

---

## Getting started

### 1. Start the database

Run a SQL Server container using Docker:

```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=SuperStrongPassword123!" \
  -p 1433:1433 --name sqlserver_travelplanner \
  -d mcr.microsoft.com/mssql/server:2019-latest
```

Check that it started correctly:

```bash
docker ps
```

The database schema is created automatically when the services boot up for the first time — no manual setup needed.

---

### 2. Start the Service Fabric cluster

1. Locate the **Service Fabric Local Cluster Manager** icon in the Windows system tray (installed with the SF SDK).
2. Right-click → **Start Local Cluster**.
3. Wait for the cluster status to show **Running** (usually takes about a minute).

You can verify via PowerShell:

```powershell
Connect-ServiceFabricCluster localhost:19000
Get-ServiceFabricClusterHealthChunk
```

---

### 3. Apply database migrations (first run only)

Services run `db.Database.Migrate()` automatically on startup, so this step is optional. If you want to apply migrations manually:

```bash
cd UserService && dotnet ef database update
cd ../TravelService && dotnet ef database update
cd ../SharingService && dotnet ef database update
```

---

### 4. Deploy the backend

**Via Visual Studio:**
1. Open `TravelPlanner.sln`.
2. Right-click the Service Fabric Application project → **Publish**.
3. Choose **Local Cluster** and click **Publish**.

**Via PowerShell:**
```powershell
cd TravelPlannerSF
dotnet build
.\Scripts\Deploy-FabricApp.ps1 -ApplicationPackagePath ".\pkg\Debug"
```

Once deployed, the services are available at:

| Service | URL |
|---|---|
| API Gateway | http://localhost:5000 |
| UserService | http://localhost:5001 |
| TravelService | http://localhost:5002 |
| SharingService | http://localhost:5003 |

Service Fabric Explorer is available at **http://localhost:19080** for monitoring.

---

### 5. Start the frontend

```bash
cd frontend
npm install       # first run only
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Environment configuration

The frontend reads the API URL from a `.env` file. Create `frontend/.env` with the following content:

```env
VITE_API_BASE_URL=http://localhost:5000
```

> This variable must be set. All backend URLs are read from here — they are never hardcoded in component files.

---

## Creating accounts

### Standard user
Go to http://localhost:5173/register, fill in your name, email and a password (6 characters minimum), and submit.

### Admin user
Same registration form, but enter the admin key in the **Admin Key** field:

```
GuildCoreOverride2024!
```

Admin accounts have access to the dashboard at `/admin`, where all users and plans can be managed.

> Change the `AdminSecret` in each service's `appsettings.json` before deploying anywhere beyond your local machine.

---

## Project structure

```
/
├── ApiGateway/              # Entry point — proxies requests to internal services (port 5000)
│   ├── Controllers/         # One proxy controller per resource group
│   ├── Services/            # HttpProxyService — handles request forwarding
│   └── PackageRoot/         # ServiceManifest.xml
│
├── UserService/             # Handles auth, JWT tokens, user accounts (port 5001)
│   ├── Controllers/         # AuthController, UsersController
│   ├── Data/                # UserDbContext + EF migrations
│   ├── DTOs/                # Input/output data shapes
│   ├── Models/              # User entity, UserRole enum
│   └── Services/            # AuthService, JwtService, UserManagementService
│
├── TravelService/           # Core travel logic — plans, activities, expenses, checklist (port 5002)
│   ├── Controllers/         # One controller per entity
│   ├── Data/                # TravelDbContext + EF migrations
│   ├── DTOs/                # All travel-related DTOs
│   ├── Models/              # TravelPlan, Activity, Expense, Destination, ChecklistItem
│   └── Services/            # Service class per entity
│
├── SharingService/          # Share token generation and validation (port 5003)
│   ├── Controllers/         # ShareController
│   ├── Data/                # SharingDbContext + EF migrations
│   ├── DTOs/                # Token DTOs
│   ├── Models/              # ShareToken, ShareAccessLevel
│   └── Services/            # SharingTokenService
│
└── frontend/
    ├── src/
    │   ├── components/      # Layout, route guards, TravelMap, reusable UI
    │   ├── context/         # AuthContext — global auth state
    │   ├── hooks/           # useAuth
    │   ├── models/          # TypeScript interfaces (types.ts)
    │   ├── pages/           # One file per page/screen
    │   └── services/        # All HTTP calls live here, never in components
    └── .env
```

---

## API reference

All requests are sent to the API Gateway at `http://localhost:5000`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a new account |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/travel-plans` | User | List your travel plans |
| POST | `/api/travel-plans` | User | Create a new plan |
| GET | `/api/travel-plans/{id}` | User | Get full plan details |
| PUT | `/api/travel-plans/{id}` | User | Update a plan |
| DELETE | `/api/travel-plans/{id}` | User | Delete a plan and all its data |
| POST | `/api/travel-plans/{id}/destinations` | User | Add a destination |
| POST | `/api/travel-plans/{id}/activities` | User | Add an activity |
| POST | `/api/travel-plans/{id}/expenses` | User | Log an expense |
| POST | `/api/travel-plans/{id}/checklist` | User | Add a checklist item |
| POST | `/api/shares` | User | Create a share token |
| POST | `/api/shares/validate` | Public | Validate a share token |
| GET | `/api/admin/users` | Admin | List all users |
| DELETE | `/api/admin/travel-plans/{id}` | Admin | Delete any plan |

---

## Troubleshooting

**Services fail to start after deployment**
Check the Service Fabric Explorer at http://localhost:19080 for health warnings. Confirm Docker is running and port 1433 is not occupied by another process.

**`dotnet ef` not found**
```bash
dotnet tool install --global dotnet-ef --version 3.1.*
```

**Frontend cannot reach the API**
Verify the gateway responds at http://localhost:5000 (a 401 response without a token is expected). Check that `VITE_API_BASE_URL` in `.env` is set correctly.

**JWT validation errors / login fails with correct credentials**
The `Jwt:Key` value must be identical across all services and the gateway. A mismatch causes token validation to silently fail.

---

## Shutting down

```bash
# Stop the frontend: Ctrl+C in the terminal running npm run dev

# Stop the database container
docker stop sqlserver_travelplanner && docker rm sqlserver_travelplanner
```

Stop the Service Fabric cluster: right-click the tray icon → **Stop Local Cluster**.

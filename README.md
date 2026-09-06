# SafeRide PU 🚀

### AI-Powered Safe Ride Booking Platform for Educational Institutions

SafeRide PU is a secure, institution-exclusive transit platform designed for students, faculty, and staff. It provides safe, verified, AI-monitored, and real-time tracked transportation options inside school campuses and their surrounding school district areas.

---

## 🗺️ Project Structure

This project is set up as an npm monorepo containing the following workspaces:
- `client/`: Single Page Application built on **React 19**, **Vite**, **Tailwind CSS**, and **React Router**.
- `server/`: Backend service powered by **Node.js**, **Express.js**, **Mongoose**, and **Socket.IO**.
- `shared/`: Centralized interfaces, configurations, types, and constants.
- `docs/`: System documentation (SRS, SAD, DDD, ADD, and Test strategies).
- `scripts/`: Development and operations tooling.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, React Router DOM, TanStack Query, Axios, React Hook Form, Zod, Framer Motion, React Hot Toast, React Icons |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose, Socket.IO, JWT, Bcrypt, Helmet, Morgan, Compression, Cookie Parser, Express Rate Limit, Multer, Cloudinary, Nodemailer, Express Validator, Zod, Swagger (OpenAPI) |
| **Integrations** | Google Maps Platform (Directions, Geocoding, Places), Razorpay Payment Gateway, Firebase Cloud Messaging (FCM), OpenAI / Gemini API |
| **DevOps & QA** | ESLint, Prettier, Husky, lint-staged, Docker, Docker Compose, GitHub Actions |

---

## 📁 Workspace Directory Map

```
SafeRidePU/
├── client/                     # Frontend Application
│   ├── src/
│   │   ├── assets/             # Images, fonts, SVG icons
│   │   ├── components/         # Reusable presentation and utility components
│   │   ├── config/             # Third-party configurations (Axios, Maps, FCM)
│   │   ├── constants/          # Static layout and page constants
│   │   ├── contexts/           # React Context (Auth, Socket)
│   │   ├── features/           # Modular domain scopes (auth, rider, driver, admin, etc.)
│   │   ├── hooks/              # Reusable React hooks
│   │   ├── layouts/            # Page templates (RiderLayout, AuthLayout)
│   │   ├── pages/              # Routing entry points (Login, Dashboard)
│   │   ├── routes/             # AppRouting definitions
│   │   ├── services/           # Socket and backend communication layers
│   │   ├── store/              # Client state management (Zustand/Context)
│   │   ├── styles/             # Global CSS and Tailwind configurations
│   │   ├── types/              # Client-side specific TypeScript interfaces
│   │   └── utils/              # Helper utilities (formatters, calculations)
│   └── tsconfig.json
├── server/                     # Backend API
│   ├── config/                 # DB, Mailer, Logger, and API integrations
│   ├── constants/              # Static server codes and business constraints
│   ├── controllers/            # Request handlers (logic orchestration)
│   ├── docs/                   # Swagger JSON configurations
│   ├── events/                 # Event emitters and pub-sub handlers
│   ├── logs/                   # Log output files
│   ├── middlewares/            # Auth gates, rate-limiters, error handling
│   ├── models/                 # Database schema definitions
│   ├── repositories/           # Direct database accessor layer
│   ├── routes/                 # Express route entrypoints
│   ├── services/               # Core business services (AI, Maps, SMS)
│   ├── sockets/                # Socket.IO event controllers
│   ├── uploads/                # Temporary local file storage
│   ├── validators/             # Request payload Zod/Validator definitions
│   └── utils/                  # Backend helpers
├── shared/                     # Shared Types and Utilities
│   └── src/
│       ├── constants/          # Shared constants (Roles, Status codes)
│       ├── interfaces/         # Common TypeScript models
│       ├── DTOs/               # Data Transfer Objects for API payloads
│       └── types/              # Type helper abstractions
├── docs/                       # Architecture and Specifications
└── docker-compose.yml          # Container configuration for local dev
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.x or above)
- npm (v9.x or above)
- Docker (optional, for localized environment running)

### Installation
Run the command below in the project root to install the workspaces' packages:
```bash
npm install
```

### Environment Configuration
1. Go to the `server` workspace directory.
2. Copy the `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Populate the environment parameters with your local development keys (Google Maps API, Razorpay keys, MongoDB local/Atlas connection string, etc.).

---

## 💻 Running the Project

### Local Development (Concurrently)
Launch both backend and frontend development setups using the root package runner:
```bash
npm run dev
```
- **Client (Frontend)**: Runs at [http://localhost:5173](http://localhost:5173) (Vite hot-reloading)
- **Server (Backend)**: Runs at [http://localhost:5000](http://localhost:5000) (Nodemon reload)
- **API Docs (Swagger)**: Viewable at [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

### Development using Docker Compose
Orchestrate a fully isolated setup using docker-compose:
```bash
docker-compose up --build
```
This starts:
- MongoDB at `localhost:27017`
- Express API server at `localhost:5000`
- React Client client at `localhost:5173`

---

## 🧪 Linting, Formatting, and Code Quality
Ensure styling remains consistent before pushing commits:
```bash
# Run ESLint checking
npm run lint

# Prettier format compliance auto-apply
npm run format
```

---

## 🛡️ Git Workflow and Branching Strategy
We follow the **Git Flow** strategy:
- `main`: Production release branch.
- `develop`: Pre-production staging branch.
- `feature/*`: Specific active features (e.g., `feature/sos-alert`).
- `bugfix/*`: Corrective patch releases.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

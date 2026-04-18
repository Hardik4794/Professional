# Task Manager API — DevOps Pipeline (SIT223/SIT753 HD Task)

A production-grade **Task Manager REST API** built with Node.js, Express, and MongoDB, with a full 7-stage Jenkins DevOps pipeline.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) |
| Containerisation | Docker + Docker Compose |
| CI/CD | Jenkins |
| Code Quality | SonarQube |
| Security Scan | Trivy + npm audit |
| Monitoring | Prometheus + Grafana |
| Testing | Jest + Supertest |

---

## Pipeline Stages (All 7)

| # | Stage | Tool |
|---|---|---|
| 1 | Build | Docker |
| 2 | Test | Jest + Supertest |
| 3 | Code Quality | SonarQube |
| 4 | Security | Trivy + npm audit |
| 5 | Deploy | Docker Compose (Staging) |
| 6 | Release | Docker Compose (Production) |
| 7 | Monitoring | Prometheus + Grafana |

---

## Prerequisites

- Docker & Docker Compose installed
- Jenkins running at `http://localhost:8089`
- SonarQube running at `http://localhost:9000`
- Jenkins plugins: Pipeline, Git, HTML Publisher, JUnit, SonarQube Scanner, AnsiColor, Timestamper

---

## Step-by-Step Setup

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/task-manager-api.git
cd task-manager-api
```

### 2. Start SonarQube (if not already running)
```bash
docker run -d --name sonarqube \
  -p 9000:9000 \
  sonarqube:community
```
Visit http://localhost:9000, login with `admin/admin`, change password, then:
- Create a project with key: `task-manager-api`
- Generate a token and save it

### 3. Configure Jenkins

#### Install required plugins (Manage Jenkins → Plugins):
- Pipeline
- Git
- HTML Publisher
- JUnit
- SonarQube Scanner
- AnsiColor
- Timestamper

#### Configure SonarQube in Jenkins (Manage Jenkins → System):
- Name: `SonarQube`
- URL: `http://host.docker.internal:9000`
- Token: (add as a Secret Text credential)

#### Configure SonarQube Scanner (Manage Jenkins → Tools):
- Name: `SonarScanner`
- Install automatically ✓

### 4. Create Jenkins Pipeline Job
1. New Item → Pipeline → Name: `task-manager-pipeline`
2. Pipeline Definition: **Pipeline script from SCM**
3. SCM: Git
4. Repository URL: your GitHub repo URL
5. Branch: `*/main`
6. Script Path: `Jenkinsfile`
7. Save → **Build Now**

---

## API Endpoints

### Auth
```
POST /api/users/register   - Register new user
POST /api/users/login      - Login
GET  /api/users/me         - Get current user (Auth required)
```

### Tasks
```
GET    /api/tasks           - Get all tasks
POST   /api/tasks           - Create task
GET    /api/tasks/:id       - Get task by ID
PATCH  /api/tasks/:id       - Update task
DELETE /api/tasks/:id       - Delete task
GET    /api/tasks/stats     - Task statistics
```

### System
```
GET /health    - Health check
GET /ready     - Readiness probe
GET /metrics   - Prometheus metrics
```

---

## Monitoring

| Service | URL | Credentials |
|---|---|---|
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | - |
| App Metrics | http://localhost/metrics | - |
| App Health | http://localhost/health | - |

---

## Local Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with nodemon
npm run dev
```

---

## Security Notes

The `npm audit` and Trivy scans may flag vulnerabilities in transitive dependencies. Any HIGH/CRITICAL issues found are documented in `npm-audit.json` (archived per build). The app itself uses:
- `helmet` for HTTP security headers
- `express-rate-limit` for DDoS protection
- `bcryptjs` for password hashing (cost factor 12)
- JWT with configurable expiry

---

## Project Structure

```
.
├── src/
│   ├── app.js                  # Express app setup
│   ├── server.js               # Entry point
│   ├── controllers/            # Route handlers
│   ├── models/                 # Mongoose models
│   ├── routes/                 # Express routers
│   └── middleware/             # Auth middleware
├── tests/
│   ├── unit/                   # Model unit tests
│   └── integration/            # API integration tests
├── monitoring/
│   ├── prometheus.yml          # Prometheus config
│   ├── alert_rules.yml         # Alert rules
│   └── grafana/                # Grafana dashboards
├── Dockerfile
├── docker-compose.yml          # Staging
├── docker-compose.prod.yml     # Production
├── Jenkinsfile                 # Full 7-stage pipeline
└── sonar-project.properties    # SonarQube config
```

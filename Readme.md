# Task Manager API — DevOps Pipeline (SIT223/SIT753 HD Task)

A production-grade **Task Manager REST API** built with Node.js, Express, and MongoDB,
with a complete 7-stage Jenkins DevOps pipeline targeting Top HD (96–100%).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 (Alpine) |
| Framework | Express.js 4.x |
| Database | MongoDB 7.0 (via Mongoose) |
| Containerisation | Docker (multi-stage build) |
| CI/CD | Jenkins (Pipeline as Code) |
| Code Quality | SonarQube Community |
| Security Scanning | Trivy + npm audit |
| Monitoring | Prometheus + Grafana |
| Testing | Jest + Supertest |

---

## Pipeline Stages (All 7)

| # | Stage | Tool | Description |
|---|---|---|---|
| 1 | **Build** | Docker | Multi-stage build, versioned image tags |
| 2 | **Test** | Jest + Supertest | Unit + integration tests in isolated Docker network |
| 3 | **Code Quality** | SonarQube | Static analysis, code smells, duplication detection |
| 4 | **Security** | Trivy + npm audit | CVE scanning on Docker image and dependencies |
| 5 | **Deploy** | Docker | Automated staging deployment with health checks |
| 6 | **Release** | Docker | Versioned production release with rollback support |
| 7 | **Monitoring** | Prometheus + Grafana | Live metrics, dashboards, alert rules |

---

## Quick Start

### Prerequisites
- Docker & Docker Desktop installed and running
- Jenkins at `http://localhost:8089`
- SonarQube at `http://localhost:9000`

### 1. Clone the Repository
```bash
git clone https://github.com/Hardik4794/Professional.git
cd Professional
```

### 2. Start SonarQube
```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
```
Visit `http://localhost:9000` → login `admin/admin` → change password →
create project key `Task-Manager-API` → generate token → save token.

### 3. Save SonarQube Token in Jenkins
```bash
docker exec -u root jenkins bash -c "echo 'sqp_YOUR_TOKEN' > /var/jenkins_home/sonar-token.txt"
```

### 4. Configure Jenkins
1. Install plugins: Pipeline, Git, JUnit, Timestamper, Workspace Cleanup
2. Create Pipeline job → SCM: Git → Repo URL → Branch: `*/main`
3. Script Path: `Jenkinsfile`
4. **Build Now**

---

## API Endpoints

### Authentication
```
POST /api/users/register   Register new user
POST /api/users/login      Login (returns JWT)
GET  /api/users/me         Get current user  [Auth required]
```

### Tasks (all require Auth)
```
GET    /api/tasks           Get all tasks (supports ?status= ?priority= filters)
POST   /api/tasks           Create task
GET    /api/tasks/:id       Get task by ID
PATCH  /api/tasks/:id       Update task
DELETE /api/tasks/:id       Delete task
GET    /api/tasks/stats     Aggregated task statistics
```

### System
```
GET /health    Health check (DB status, uptime, version)
GET /ready     Kubernetes-style readiness probe
GET /metrics   Prometheus metrics endpoint
```

---

## Monitoring Stack

| Service | URL | Credentials |
|---|---|---|
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | — |
| App Metrics | http://localhost/metrics | — |
| App Health | http://localhost/health | — |

### Alert Rules Configured
- **AppDown** — fires if app is unreachable for > 1 minute (CRITICAL)
- **HighResponseTime** — fires if P95 latency > 500ms for > 2 minutes (WARNING)
- **HighErrorRate** — fires if 5xx error rate > 10% for > 2 minutes (CRITICAL)

---

## Security

All security findings from Trivy and npm audit are documented in
[SECURITY_REPORT.md](./SECURITY_REPORT.md).

**Summary:** 11 HIGH CVEs found — all are false positives located in npm's own
bundled tools inside the base image, not in the application code. Our app's
direct dependencies have `0 vulnerabilities`.

**Application security controls:**
- `helmet` — HTTP security headers
- `express-rate-limit` — DDoS protection (100 req/15min)
- `bcryptjs` — password hashing (cost factor 12)
- JWT authentication with expiry
- Non-root Docker user (`nodeapp`, UID 1001)
- `apk upgrade --no-cache` patches Alpine OS CVEs at build time

---

## Project Structure

```
.
├── src/
│   ├── app.js                  Express app (middleware, routes, metrics)
│   ├── server.js               Entry point (DB connect + listen)
│   ├── controllers/            Business logic (users, tasks)
│   ├── models/                 Mongoose schemas (User, Task)
│   ├── routes/                 Express routers (users, tasks, health)
│   └── middleware/             JWT auth middleware
├── tests/
│   ├── unit/                   Model-level unit tests
│   └── integration/            Full API endpoint tests
├── monitoring/
│   ├── prometheus.yml          Prometheus scrape config
│   ├── alert_rules.yml         Alert rules (AppDown, latency, errors)
│   └── grafana/
│       ├── dashboards/         Pre-built API dashboard JSON
│       └── datasources/        Auto-provisioned Prometheus datasource
├── Dockerfile                  Multi-stage production build
├── docker-compose.yml          Staging environment
├── docker-compose.prod.yml     Production environment
├── Jenkinsfile                 7-stage CI/CD pipeline
├── sonar-project.properties    SonarQube analysis config
├── SECURITY_REPORT.md          CVE findings and mitigations
└── .env.example                Environment variable template
```

---

## Local Development

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Run tests
npm test

# Start development server
npm run dev
```

---

## Design Decisions

**Why Docker-in-Docker for tests?**
The Jenkins container itself runs in Docker. Running MongoDB as a sidecar
container on a shared Docker network (`test-network`) avoids MongoMemoryServer
compatibility issues with Debian 13 and provides a realistic test environment.

**Why SonarQube via Docker scanner instead of Jenkins plugin?**
The Jenkins SonarQube plugin requires persistent configuration that is lost when
the Jenkins container is recreated. The `sonarsource/sonar-scanner-cli` Docker
image is self-contained and requires only the token file, making it more resilient.

**Why Prometheus config via `docker exec` instead of volume mount?**
The Jenkins workspace is cleaned after each build. Volume-mounting a file from a
cleaned workspace causes Prometheus to fail on the next run. Injecting config via
`docker exec` after container start avoids this entirely.

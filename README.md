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
| 1 | **Build** | Docker | Multi-stage build, versioned image tags (`:N`, `:release-N`, `:latest`) |
| 2 | **Test** | Jest + Supertest | Unit + integration tests in isolated Docker network with MongoDB 7.0 |
| 3 | **Code Quality** | SonarQube | Static analysis — code smells, duplication, maintainability rating |
| 4 | **Security** | Trivy + npm audit | CVE scanning on Docker image and all Node.js dependencies |
| 5 | **Deploy** | Docker | Automated staging deployment with health check gating |
| 6 | **Release** | Docker | Versioned production release with environment-specific configs |
| 7 | **Monitoring** | Prometheus + Grafana | Live metrics, auto-provisioned dashboard, meaningful alert rules |

---

## Quick Start

### Prerequisites
- Docker Desktop installed and running
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
create project with key `Task-Manager-API` → generate a token → copy it.

### 3. Start Jenkins with Docker access
```bash
docker run -d --name jenkins \
  -p 8089:8080 -p 50000:50000 \
  -u root \
  --dns 8.8.8.8 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

### 4. Save SonarQube Token in Jenkins
```bash
docker exec -u root jenkins bash -c "echo 'sqp_YOUR_TOKEN_HERE' > /var/jenkins_home/sonar-token.txt"
```

### 5. Install tools inside Jenkins container
```bash
docker exec -u root jenkins bash -c "apt-get update && apt-get install -y docker.io nodejs npm && chmod 666 /var/run/docker.sock"
```

### 6. Configure Jenkins Pipeline Job
1. Open `http://localhost:8089` → install suggested plugins
2. **New Item** → Pipeline → name: `task-manager-pipeline`
3. Pipeline → Definition: **Pipeline script from SCM**
4. SCM: Git → Repository URL: `https://github.com/Hardik4794/Professional.git`
5. Branch: `*/main` → Script Path: `Jenkinsfile`
6. **Save** → **Build Now**

---

## API Endpoints

### Authentication
```
POST /api/users/register    Register a new user
POST /api/users/login       Login — returns JWT token
GET  /api/users/me          Get current user profile  [Auth required]
```

### Tasks (all require Bearer token)
```
GET    /api/tasks            Get all tasks (supports ?status= and ?priority= filters)
POST   /api/tasks            Create a new task
GET    /api/tasks/:id        Get task by ID
PATCH  /api/tasks/:id        Update task fields
DELETE /api/tasks/:id        Delete a task
GET    /api/tasks/stats      Aggregated task statistics by status
```

### System
```
GET /health     Health check — returns DB status, uptime, version
GET /ready      Kubernetes-style readiness probe
GET /metrics    Prometheus metrics endpoint (HTTP durations, counts)
```

---

## Monitoring Stack

| Service | URL | Credentials |
|---|---|---|
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | — |
| App Metrics | http://localhost/metrics | — |
| App Health | http://localhost/health | — |

### Alert Rules (configured in `monitoring/alert_rules.yml`)

| Alert | Condition | Severity |
|---|---|---|
| AppDown | App unreachable for > 1 minute | CRITICAL |
| HighResponseTime | P95 latency > 500ms for > 2 minutes | WARNING |
| HighErrorRate | 5xx error rate > 10% for > 2 minutes | CRITICAL |

---

## Security

All CVE findings are fully documented in [securityreport.md](./securityreport.md).

**Summary:** Trivy found 11 HIGH CVEs — all are false positives inside npm's own
bundled CLI tools within the `node:18-alpine` base image. Our application's own
dependencies have `0 vulnerabilities` (confirmed by `npm audit`).

### Application-Level Security Controls

| Control | Implementation |
|---|---|
| Security headers | `helmet` middleware on all routes |
| Rate limiting | `express-rate-limit` — 100 req per 15 min per IP |
| Password hashing | `bcryptjs` with cost factor 12 |
| JWT authentication | Signed tokens with configurable expiry |
| Request size limit | `express.json({ limit: '10kb' })` |
| Non-root container | Docker user `nodeapp` (UID 1001) |
| OS CVE patching | `apk upgrade --no-cache` at Docker build time |

---

## Project Structure

```
.
├── src/
│   ├── app.js                  Express app — middleware, routes, Prometheus metrics
│   ├── server.js               Entry point — DB connect and server listen
│   ├── controllers/            Business logic (userController, taskController)
│   ├── models/                 Mongoose schemas (User, Task)
│   ├── routes/                 Express routers (users, tasks, health)
│   └── middleware/             JWT authentication middleware
├── tests/
│   ├── app.test.js             Basic smoke test
│   ├── unit/                   Model-level unit tests (User, Task)
│   └── integration/            Full API endpoint integration tests
├── monitoring/
│   ├── prometheus.yml          Prometheus scrape configuration
│   ├── alert_rules.yml         Alert rules — AppDown, HighLatency, HighErrorRate
│   └── grafana/
│       ├── dashboards/         Pre-built API performance dashboard JSON
│       └── datasources/        Auto-provisioned Prometheus datasource config
├── Dockerfile                  Multi-stage production Docker build
├── docker-compose.yml          Staging environment definition
├── docker-compose.prod.yml     Production environment definition
├── Jenkinsfile                 7-stage CI/CD pipeline (Pipeline as Code)
├── sonar-project.properties    SonarQube analysis and quality gate config
├── securityreport.md           CVE findings, severity analysis, mitigations
├── env.example                 Environment variable template
└── .eslintrc.json              ESLint code style rules
```

---

## Local Development

```bash
# Install dependencies
npm install

# Copy environment config
cp env.example .env

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Start development server with hot reload
npm run dev
```

---

## Design Decisions

### Why Docker-in-Docker for tests?
The Jenkins container itself runs inside Docker. Running MongoDB as a sidecar on
a shared `test-network` avoids `MongoMemoryServer` incompatibility with Debian 13
(the Jenkins container OS) and provides a realistic, isolated test environment that
mirrors production more accurately than an in-memory database.

### Why SonarQube via Docker scanner instead of the Jenkins plugin?
The Jenkins SonarQube plugin requires persistent server configuration stored in
`jenkins_home`. When Jenkins is recreated (e.g. to fix Docker socket permissions),
this config is lost. The `sonarsource/sonar-scanner-cli` Docker image is
self-contained — it only needs the token file — making the pipeline resilient to
Jenkins restarts and recreations.

### Why inject Prometheus config via `docker exec` instead of a volume mount?
Jenkins cleans the workspace after each build (`cleanWs`). If Prometheus mounts
a config file from the workspace, it fails on the second build because the file
no longer exists. Writing the config directly into the running container via
`docker exec` avoids this entirely and is idempotent across builds.

### Why stop Prometheus and Grafana at the start of the Release stage?
Prometheus and Grafana from the previous build remain attached to `prod-network`.
Docker refuses to delete a network with active endpoints. By explicitly stopping
and removing all containers that use `prod-network` before recreating it, the
pipeline becomes fully idempotent — every build starts from a clean state.

### Why use `|| true` on health check loops?
The staging and production containers sometimes take longer than 75 seconds to
connect to MongoDB on first start (image pull, volume init). Using `|| true`
ensures the pipeline continues even if the health check times out, which is
acceptable in a local development CI environment. In a production CI system,
this would be replaced with a hard failure.

# Security Vulnerability Report

This document describes the security vulnerabilities identified during the automated
security scanning stage of the CI/CD pipeline (Stage 4: Security).

## Scanning Tools Used

- **Trivy** — scans the Docker image for OS-level and Node.js package CVEs
- **npm audit** — scans Node.js dependencies for known vulnerabilities

---

## Trivy Scan Results — Docker Image

**Scan target:** `task-manager-api:<BUILD_NUMBER>`
**Severity filter:** HIGH, CRITICAL
**Total findings:** 11 HIGH, 0 CRITICAL

> Note: All vulnerabilities are found in **npm's own bundled dependencies** (inside
> the Node.js Docker image's `/usr/local/lib/node_modules/npm/` directory).
> These are **not in our application code** — they are part of the npm CLI tool
> pre-installed in the `node:18-alpine` base image.

### Vulnerability Details

| Library | CVE | Severity | Installed | Fixed | Description | Action Taken |
|---|---|---|---|---|---|---|
| cross-spawn | CVE-2024-21538 | HIGH | 7.0.3 | 7.0.5 | RegEx Denial of Service via crafted shell argument | False positive — this is npm's internal dependency, not used by our app. Noted for future base image update. |
| glob | CVE-2025-64756 | HIGH | 10.4.2 | 10.5.0 | Command injection via malicious filenames | False positive — npm internal. Not exploitable in our context. |
| minimatch | CVE-2026-26996 | HIGH | 9.0.5 | 9.0.6 | DoS via crafted glob patterns | False positive — npm internal. |
| minimatch | CVE-2026-27903 | HIGH | 9.0.5 | 9.0.7 | DoS via unbounded recursive backtracking | False positive — npm internal. |
| minimatch | CVE-2026-27904 | HIGH | 9.0.5 | 9.0.7 | DoS via catastrophic backtracking | False positive — npm internal. |
| tar | CVE-2026-23745 | HIGH | 6.2.1 | 7.5.3 | Arbitrary file overwrite via symlink poisoning | False positive — npm internal. Our app does not extract tar archives. |
| tar | CVE-2026-23950 | HIGH | 6.2.1 | 7.5.4 | Arbitrary file overwrite via Unicode path collision | False positive — npm internal. |
| tar | CVE-2026-24842 | HIGH | 6.2.1 | 7.5.7 | Arbitrary file creation via path traversal | False positive — npm internal. |
| tar | CVE-2026-26960 | HIGH | 6.2.1 | 7.5.8 | Arbitrary file read/write via malicious hardlink | False positive — npm internal. |
| tar | CVE-2026-29786 | HIGH | 6.2.1 | 7.5.10 | Hardlink path traversal via drive-relative linkpath | False positive — npm internal. |
| tar | CVE-2026-31802 | HIGH | 6.2.1 | 7.5.11 | File overwrite via drive-relative symlink traversal | False positive — npm internal. |

### Mitigation Strategy

All 11 vulnerabilities are located in `npm`'s bundled dependencies within the
`node:18-alpine` base image — not in our application's `node_modules`. They are
not directly exploitable by our application because:

1. Our application does not invoke the npm CLI at runtime.
2. Our Docker image runs as a **non-root user** (`nodeapp`, UID 1001), limiting
   the blast radius of any potential exploit.
3. Our Dockerfile includes `RUN apk upgrade --no-cache` to patch all OS-level
   Alpine CVEs at build time.

**Planned remediation:** Upgrade to `node:20-alpine` or `node:22-alpine` as the
base image in the next sprint, as newer Node.js versions ship with patched npm.

---

## npm audit Results

**Command:** `npm audit --audit-level=high`
**Result:** `found 0 vulnerabilities` in our application's own dependencies.

This confirms our application's direct and transitive dependencies are clean.
The Trivy findings above are limited to the base image's npm installation.

---

## Application-Level Security Controls

Beyond dependency scanning, the application implements the following security measures:

| Control | Implementation |
|---|---|
| Security headers | `helmet` middleware on all routes |
| Rate limiting | `express-rate-limit` — 100 req/15min per IP |
| Password hashing | `bcryptjs` with cost factor 12 |
| JWT authentication | Signed tokens with configurable expiry |
| Request size limit | `express.json({ limit: '10kb' })` |
| Non-root container | Docker user `nodeapp` (UID 1001) |
| OS patch at build | `apk upgrade --no-cache` in Dockerfile |

# Module 14 — Improving Quality, Security & Performance (CI/CD)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=coderrony_improving-quality&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=coderrony_improving-quality)

> If the badge shows **Quality gate not computed**, run a successful **`sonarcloud`** job in GitHub Actions once and ensure the **`SONAR_TOKEN`** repository secret is set.

React + Vite todo UI with CI pipelines for testing, SonarCloud, Trivy, k6 load testing, and OPA policy checks.

## What was done

### Part 1 — Unit testing & code quality

- Added **Vitest** tests for `src/api/todos.js` (`buildApiUrl`, happy-path API calls, network errors).
- **GitHub Actions** runs `npm run lint`, `npm run test:coverage`, and `npm run build`.
- **SonarCloud**: configure `sonar-project.properties`, then add repo secrets (see below). Coverage is uploaded from `react-frontend/coverage/lcov.info`.
- **Code fixes aimed at quality / Sonar-style issues**
  1. Removed duplicate “backend down” string by reusing `BACKEND_DOWN_MSG` in `apiFetch`.
  2. Restored the **error alert** UI in `App.jsx` (was commented out).

Capture **Sonar “before”** screenshots before merging these fixes, then **“after”** on `main`.

### Part 2 — Load testing (k6)

- Script: [`load-tests/k6-frontend.js`](load-tests/k6-frontend.js).
- Targets **50–100 VUs** by default (`K6_VUS`, default `75`).
- Measures failure rate via thresholds and prints **p95 latency** in the summary.

Example:

```bash
cd react-frontend
npm run build
npm run preview
# another terminal:
k6 run load-tests/k6-frontend.js -e BASE_URL=http://localhost:4173
```

Save the **k6 stdout summary + screenshot** for your report.

### Part 3 — Security in CI/CD (Trivy)

- Workflow job **security-scan** runs **Trivy FS** on `react-frontend` and **Trivy image** on the built Docker image.
- Example findings to document (run `npm audit` / read CI logs):
  1. **esbuild / Vite (moderate, GHSA-67mh-4wv8-2f99)** — affects the **dev server**, not the static nginx production image. Mitigation: only run `npm run dev` on trusted networks; plan **Vite 6** upgrade when feasible (`npm audit fix --force` is breaking).
  2. **Base image / distro packages** — mitigated by pinning **nginx:1.26-alpine** and rebuilding periodically; review **Trivy image** output after each build.

### Part 4 — Secrets management

- No API keys in the repo: `VITE_API_URL` and `VITE_ENV` come from **environment variables** (local `.env`, Docker `ARG`/`ENV`, CI **GitHub Actions secrets**).
- Production Docker build example:

```bash
docker build ./react-frontend \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg VITE_ENV=production \
  -t todo-frontend:local
```

### Part 5 — Policy as code (OPA)

- Policy: [`policies/disallow_latest.rego`](policies/disallow_latest.rego) — denies Kubernetes **Deployment** containers whose image ends with **`:latest`**.
- Fixtures: [`policy-fixtures/deployment-bad.json`](policy-fixtures/deployment-bad.json) vs [`deployment-good.json`](policy-fixtures/deployment-good.json).
- CI job **opa-policy** asserts violations for the bad manifest and none for the good one.

## Tools used

| Area            | Tool                          |
|----------------|-------------------------------|
| Unit tests     | Vitest                        |
| Lint           | ESLint                        |
| Coverage       | `@vitest/coverage-v8` (lcov)  |
| CI             | GitHub Actions                |
| Quality gate   | SonarCloud                    |
| Security scan  | Trivy                         |
| Load test      | k6                            |
| Policy         | Open Policy Agent (OPA)       |
| Container      | Docker + nginx (pinned tag) |

## GitHub setup (required for green CI)

1. Push this repo to **GitHub**.
2. **SonarCloud**: create project + generate token. Set repository secrets:
   - `SONAR_TOKEN`
   - Fill in `sonar.organization` and `sonar.projectKey` in [`sonar-project.properties`](sonar-project.properties) (or override via Sonar UI).
3. Optional: `VITE_API_URL` secret if the built SPA must call a real API in CI.
4. Upload **screenshots**: Actions tab (tests), Sonar dashboard (before/after), Trivy table from workflow log, k6 summary.

## Local commands

```bash
cd react-frontend
npm install
npm run lint
npm test
npm run test:coverage
npm run build
```

## Key learnings

- CI gives fast feedback on **lint + tests + build** before merge.
- **SonarCloud** links coverage to maintainability issues; small refactors (DRY strings, dead/commented UI) improve maintainability scores.
- **Trivy** separates filesystem vs **image** risk; pinning base tags reduces supply-chain drift.
- **OPA** turns “no `:latest` in prod” into an **automated** check.
- **k6** validates that the static host stays responsive under concurrent users.

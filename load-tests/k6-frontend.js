/**
 * Basic load test against the static SPA (preview or Docker/nginx).
 *
 * Run locally:
 *   cd react-frontend && npm run build && npm run preview &
 *   k6 run load-tests/k6-frontend.js -e BASE_URL=http://localhost:4173
 *
 * Tune VUs via env: K6_VUS (default 75), K6_DURATION (default 2m).
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const failRate = new Rate('failed_requests')
const durationTrend = new Trend('response_time_ms')

const targetVUs = Number(__ENV.K6_VUS || 75)
const stageDuration = __ENV.K6_DURATION || '2m'

export const options = {
  stages: [
    { duration: '30s', target: Math.floor(targetVUs / 2) },
    { duration: stageDuration, target: targetVUs },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
    failed_requests: ['rate<0.05'],
  },
}

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:4173').replace(/\/$/, '')

export default function () {
  const res = http.get(BASE_URL)
  durationTrend.add(res.timings.duration)
  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
  })
  failRate.add(!ok)
  sleep(0.3)
}

export function handleSummary(data) {
  const reqs = data.metrics.http_reqs?.values.count ?? 0
  const failed = data.metrics.http_req_failed?.values.rate ?? 0
  const p95 = data.metrics.http_req_duration?.values['p(95)'] ?? 0
  const lines = [
    'k6 summary',
    `  HTTP requests: ${reqs}`,
    `  Failure rate: ${(failed * 100).toFixed(2)}%`,
    `  p95 response time: ${p95.toFixed(1)} ms`,
  ]
  return { stdout: lines.join('\n') + '\n' }
}

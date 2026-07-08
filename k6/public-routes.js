import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');

const trends = {
  home:           new Trend('web_home_ms'),
  inicio:         new Trend('web_inicio_ms'),
  login:          new Trend('web_login_ms'),
  requestOtp:     new Trend('auth_request_otp_ms'),
  verifyOtp:      new Trend('auth_verify_otp_ms'),
  mallaPublica:   new Trend('web_malla_publica_ms'),
};

const STAGES = __ENV.STAGES || 'full';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

function getStages(name) {
  const scenarios = {
    smoke: [
      { duration: '10s', target: 2 },
      { duration: '20s', target: 2 },
      { duration: '10s', target: 0 },
    ],
    full: [
      { duration: '30s', target: 10 },
      { duration: '1m',  target: 25 },
      { duration: '30s', target: 50 },
      { duration: '1m',  target: 50 },
      { duration: '30s', target: 0 },
    ],
    stress: [
      { duration: '1m',  target: 20 },
      { duration: '2m',  target: 80 },
      { duration: '1m',  target: 120 },
      { duration: '2m',  target: 120 },
      { duration: '1m',  target: 0 },
    ],
  };
  return scenarios[name] || scenarios.full;
}

export const options = {
  stages: getStages(STAGES),
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    errors:            ['rate<0.05'],
  },
};

export function setup() {
  // Default ID for malla-publica tests
  const ids = { programaId: 9 };

  // Try to discover a real ID from the API, fallback to 9
  const apiRes = http.get(`${BASE_URL}/api/v1/public/facultades`);
  if (apiRes.status === 200) {
    const facs = Array.isArray(apiRes.json()) ? apiRes.json() : (apiRes.json().data || []);
    if (facs.length > 0) {
      const facId = facs[0].id ?? facs[0].Id ?? facs[0].ID;
      const progRes = http.get(`${BASE_URL}/api/v1/public/facultades/${facId}/programas`);
      if (progRes.status === 200) {
        const progs = Array.isArray(progRes.json()) ? progRes.json() : (progRes.json().data || []);
        if (progs.length > 0) {
          ids.programaId = progs[0].id ?? progs[0].Id ?? progs[0].ID;
        }
      }
    }
  }

  return ids;
}

function seedRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

let vuRnd = seedRandom(__VU);

export default function ({ programaId }) {
  const rnd = vuRnd();

  // GET / (home) — 25%
  if (rnd < 0.25) {
    group('GET /', () => {
      const res = http.get(`${BASE_URL}/`);
      trends.home.add(res.timings.duration);
      check(res, { 'home 200': r => r.status === 200 });
      errorRate.add(res.status !== 200);
    });

  // GET /inicio — 10%
  } else if (rnd < 0.35) {
    group('GET /inicio', () => {
      const res = http.get(`${BASE_URL}/inicio`);
      trends.inicio.add(res.timings.duration);
      check(res, { 'inicio 200': r => r.status === 200 });
      errorRate.add(res.status !== 200);
    });

  // GET /login — 20%
  } else if (rnd < 0.55) {
    group('GET /login', () => {
      const res = http.get(`${BASE_URL}/login`);
      trends.login.add(res.timings.duration);
      check(res, { 'login 200': r => r.status === 200 });
      errorRate.add(res.status !== 200);
    });

  // GET /malla-publica/{id_programa} — 15%
  } else if (rnd < 0.70 && programaId) {
    group('GET /malla-publica/{id}', () => {
      const res = http.get(`${BASE_URL}/malla-publica/${programaId}`);
      trends.mallaPublica.add(res.timings.duration);
      check(res, { 'malla-publica 200': r => r.status === 200 });
      errorRate.add(res.status !== 200);
    });

  // POST /auth/request-otp — 15%
  } else if (rnd < 0.85) {
    group('POST /auth/request-otp', () => {
      const payload = JSON.stringify({ email: 'carga@test.com' });
      const res = http.post(`${BASE_URL}/auth/request-otp`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      trends.requestOtp.add(res.timings.duration);
      // Accept 200 (success), 429 (rate-limited), or 422 (validation)
      check(res, {
        'otp accepted (200|429|422)': r => r.status === 200 || r.status === 429 || r.status === 422,
      });
      errorRate.add(res.status !== 200 && res.status !== 429 && res.status !== 422);
    });

  // POST /auth/verify-otp — 15%
  } else {
    group('POST /auth/verify-otp', () => {
      const payload = JSON.stringify({ email: 'carga@test.com', otp: '000000' });
      const res = http.post(`${BASE_URL}/auth/verify-otp`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      trends.verifyOtp.add(res.timings.duration);
      // Accept 200 (success), 422 (invalid OTP), or 429 (rate-limited)
      check(res, {
        'verify accepted (200|422|429)': r => r.status === 200 || r.status === 422 || r.status === 429,
      });
      errorRate.add(res.status !== 200 && res.status !== 422 && res.status !== 429);
    });
  }

  sleep(1);
}

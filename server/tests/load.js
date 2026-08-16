import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users over 30 seconds
    { duration: '1m', target: 20 },  // Stay at 20 users for 1 minute
    { duration: '10s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5001';

export default function () {
  // We assume there's a routing or health endpoint we can test
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'is status 200': (r) => r.status === 200,
  });

  sleep(1);
}

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users for 1 min
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must complete below 500ms
  },
};

const BASE_URL = 'http://localhost:8000/api/v1';

export default function () {
  // Test Liveness
  let res = http.get('http://localhost:8000/health/live');
  check(res, { 'status was 200': (r) => r.status == 200 });
  
  // Test Neighborhoods Endpoint
  res = http.get(`${BASE_URL}/neighborhoods/`);
  check(res, { 'neighborhoods status was 200': (r) => r.status == 200 });
  
  // Test Predictions (POST) with Idempotency
  const payload = JSON.stringify({
    neighborhood_id: "560001",
    target_date: new Date().toISOString().split('T')[0]
  });
  
  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': `loadtest-key-${__VU}`,
  };
  
  res = http.post(`${BASE_URL}/predictions/predict`, payload, { headers: headers });
  check(res, {
    'predict status was 200': (r) => r.status == 200,
  });

  sleep(1);
}

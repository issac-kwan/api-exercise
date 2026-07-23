## Load testing and live metrics (k6 + Prometheus + Grafana)

### Why this stack

Prometheus *pulls* metrics from a `/metrics` endpoint on a schedule,
rather than the app pushing to it — this matches the stateless,
horizontally-scalable design used throughout (see "Performance and
scalability" above): any number of gateway instances can be scraped
independently with zero code change, no shared state between them.

Two metric sources are combined deliberately: k6 measures the system
from the *client's* perspective (response time, status codes); the
gateway's own `/metrics` (via `prom-client`) measures it from the
*server's* perspective (exactly which rule allowed or blocked each
request). Together they show both that the system behaves correctly
under load, and specifically why.

### Two load tests, two different questions

- `k6/rateLimitTest.js` — sustained load from a *single* client, above
  its configured limit, using k6's `constant-arrival-rate` executor
  (fires at a fixed rate regardless of response time — a VU-based
  executor would self-throttle and hide the effect we want to show).
  Proves the rate limiter enforces its configured capacity/refill rate.
- `k6/scalabilityTest.js` — ramping concurrent load spread across many
  distinct clients (each with its own key, each within its own limit).
  Proves the system's overall throughput and latency hold up under
  concurrency — this is testing the pipeline, not the limiter.

### `/metrics` is unauthenticated — a deliberate local-only trade-off

Mounted before `authenticate`, same as `/healthz`, so a scraper doesn't
need a key. Fine for this exercise; in a real deployment this endpoint
reveals real operational detail and should sit on a separate internal
port or behind network-level access control, not exposed publicly
alongside the API itself.

### What I'd add with more time

- A pre-built Grafana dashboard JSON committed to the repo, so the two
  panels above don't need to be recreated by hand.
- Alerting rules in Prometheus (e.g. alert if the `blocked` rate exceeds
  some threshold sustained over several minutes — could indicate either
  an attack or limits configured too conservatively for real usage).
- Authentication on `/metrics` before any real deployment.

# To run tests 

Root scaffold tests:  npm test (from repo root)
Gateway tests: cd gateway && npm test

# Authentication

API-key based: callers send `X-Api-Key: <key>` on every request. Keys are
generated with `npm run generate-key`, which prints the raw key once and
stores only its SHA-256 hash in Redis (set: `apikeys`) — a Redis leak
alone can't be used to impersonate a client.

## Why API keys, and not JWT / OAuth2 / Basic Auth / mTLS

This is a machine-to-machine API — no login form, no browser, no
end-user consent screen. That rules out session/cookie auth (nothing to
store a cookie) and OAuth2 (built for delegated third-party access, which
doesn't apply here). JWT is normally the *second half* of an auth system
sitting on top of a login flow issuing tokens — we don't have a login
flow to issue them from, so JWT would mean building that machinery for no
real benefit. Basic Auth is functionally similar to an API key but
implies human-chosen passwords, which invites weak secrets. Mutual TLS is
the strongest option for machine-to-machine auth, but the operational
cost of running a certificate authority and rotating client certs isn't
justified for this exercise. A single, high-entropy, pre-shared secret in
a header is the simplest thing that correctly fits "identify a known
automated caller."

## Security

- Keys are hashed (SHA-256) before storage — never stored or logged in
  plaintext.
- Requires HTTPS in any real deployment — an API key sent over plain HTTP
  can be read by anyone on the network path. (Not enforced in this local
  exercise, since there's no TLS termination configured.)
- Auth runs before rate limiting, so unauthenticated requests are
  rejected immediately without spending Redis calls on rate-limit
  bookkeeping.

## Scalability

Keys live in Redis, not in each gateway instance's code/memory — every
gateway instance shares the same source of truth, so adding or revoking a
key takes effect instantly across all instances with no redeploy.

# Rate-Limiting Gateway

A standalone Express service that sits in front of the existing classifier
service and rate-limits requests before proxying them through.

    client → gateway (:8080) → existing app (:3000) → classifier

## Why a separate gateway service, not middleware in the existing app

[Your words — e.g.: rejected traffic never reaches the classifier at all;
the gateway can be scaled/deployed independently; matches the "API
Gateway" placement recommended in the design reference below]

## Why Token Bucket + Redis

- Token Bucket: allows short bursts while still enforcing a steady rate,
  and only needs two numbers stored per client.
- Redis: shared state across gateway instances. If each gateway process
  kept its own in-memory count, running more than one instance behind a
  load balancer would let clients dodge the limit depending on which
  instance handled their request.

## The race condition, and why it needs a Lua script

A naive version reads the bucket, does the math in JS, then writes it
back — three separate round trips to Redis. Two near-simultaneous
requests from the same client can both read the same "1 token left"
before either has written back, and both get allowed through. Moving the
read-calculate-write into a single Lua script makes Redis run it as one
atomic step, so this can't happen even across multiple gateway instances
hitting the same key at once.

## Fail-closed on Redis errors

If Redis is unreachable, the gateway returns 503 rather than letting
traffic through unchecked. Trade-off: this makes the API unavailable
during a Redis outage. I chose fail-closed because [your reasoning —
e.g.: a rate limiter failure is most likely to coincide with a genuine
traffic spike, exactly when the protection matters most]. Fail-open is a
one-line change if availability were the higher priority instead.

## Rules

/image gets its own, tighter limit (capacity 5, refill 1/sec) since it's
the expensive call. Everything else uses a looser default (capacity 20,
refill 5/sec). Each rule gets its own bucket per client, so draining one
doesn't affect the other.

## How to run it

Needs three things running:

    # Redis
    docker run --rm -p 6379:6379 redis:7

    # existing classifier service, from repo root
    npm start fake

    # this gateway
    cd gateway && npm run dev

Then:

    curl -F "image_file=@../tests/dog.jpg" http://localhost:8080/image

## Testing

    cd gateway && npm test

Requires Redis running (see above) — these are integration tests against
a real Redis and a real Express app via Supertest, not isolated unit
tests.

## What I'd do with more time

- [Your list — some ideas: identify clients by API key/user ID as well as
  IP, since many users can share one IP behind a NAT; pull the token
  bucket math into a pure function with its own unit tests that don't
  need Redis running; add structured logging instead of console.error]
  
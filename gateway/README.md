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
  
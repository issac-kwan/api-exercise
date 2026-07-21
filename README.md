## Scenario

We have an [Image classifier API](https://github.com/LJBirch/Backend-Test/tree/main) that can take an photo/image and return a classification.

We wish to wrap this in an ExpressJS service that will make it suitable to use in a production environment.

```
┌────────────────────────────────────┐                                  
│              Docker                │                                  
│                                    │                                  
│ ┌──────────────────┐  ┌──────────┐ │ ┌─────────────────┐     ┌───────┐
│ │                  │  │          │ │ │                 │     │       │
│ │ Image Classifier ◄──┤ Fast API ◄─┼─┤   Express API   │◄────┤ Photo │
│ │                  │  │          │ │ │                 │     │       │
│ └──────────────────┘  └──────────┘ │ └─────────────────┘     └───────┘
│                                    │                                  
│                                    │                                  
└────────────────────────────────────┘                                  
```


In particular the classifier API we're wrapping lacks some of the following. 

* Validation of uploaded filetypes
* Rate limiting
* Authentication
* Data sanitization
* Protection against common security vulnerabilities
* Error handling and logging (n.b. without exposing sensitive information)
* Performance and scalability awareness

We'd like to implement some of these via a new ExpressJS wrapper service. 

## Task

We'd like you to implement some of the above. Please don't spend more than 2-3 hours on this. It's not essential you complete all the features listed above; we're more interested in your approach.  

To help you get started we have provided you with a scaffolding wrapper service that can call through to a fake or real classifier service.  

## Instructions to run

`$ npm install`

`$ npm start fake`

You can upload an image to the express service you just started. e.g.
 
`$ curl -vv -F "image_file=@./tests/dog.jpg" http://localhost:3000/image`

You can also run tests via 

`$ npm test`

n.b. `$ npm start fake` starts up with a stub image classifier service. Just in case you're interested, you can also omit the `fake` parameter to point to a real instance of our example [image classifier API](https://github.com/LJBirch/Backend-Test/tree/main). To get this running you'd have to clone and follow the instructions in [the linked repo](ttps://github.com/LJBirch/Backend-Test/tree/main). But for the purposes of the exercise you can save yourself some time by using the stub.

## Evaluation criteria

We'd like to either pair with you on this task or review it together with you after you complete.

* Ability to articulate decisions and tradeoffs during code review
* Code quality
* Completeness
* Testing 
* Security implementation & awareness

## Additional Notes

* Feel free to modify the provided code in any way you see fit
* Include some written notes on your solution & how we can try it out 

## Submission

* Create a private GitHub/GitLab repository for storing the code and share it with us. Invite is ok.

## Additional information

Unless you work for us, your work is your own. We kindly ask you to not share the code publicly before the recruitment project is concluded. Once the process is completed, you’re free to open source this work and share it publicly / as part of your portfolio. 

## File upload validation

### Where this lives, and why

This validation runs in the existing scaffold service (`app.ts` /
`routers/image.ts`), not the gateway — a different placement decision
than auth and rate limiting, which live in the gateway.

The gateway deliberately never parses the request body (see
`gateway/src/proxy.ts`) — it forwards the raw multipart stream through
untouched, specifically so nothing has to duplicate multer's parsing
logic at the edge. Validating a file's *type* requires looking at its
actual bytes, which means parsing the body — doing that in the gateway
too would mean running multer twice (once in the gateway, once
downstream), maintaining the same validation logic in two places, and
undoing the "dumb transparent proxy" design the rate limiter and auth
system were built around.

The trade-off: an invalid upload still costs the caller one rate-limit
token and is still authenticated before being rejected, since it isn't
caught until it reaches the scaffold service. That's an acceptable cost —
rejecting a bad file is cheap; the alternative (parsing multipart twice)
is a real maintenance and complexity cost for a relatively rare case.

### Layered checks, and why one layer isn't enough

1. **`fileFilter` (multer option, in `app.ts`)** — rejects based on the
   client-declared `Content-Type`. Fast, but spoofable — a client can lie
   about this, the same way renaming a file's extension doesn't change
   its actual content.
2. **Magic-byte signature check (`validateImageContent` middleware)** —
   after the file is buffered, checks its real first bytes against known
   image format signatures (JPEG/PNG/GIF/WEBP). This is the check that
   can't be spoofed by renaming or relabeling a file.
3. **Size limit (`limits.fileSize`, multer option)** — caps uploads at
   5MB, preventing a large-file memory exhaustion attack.
4. **Filename sanitization** — strips directory-traversal characters from
   the uploaded filename before it's used anywhere, even though this
   service doesn't currently write files to disk.

### Security

- Fails closed: anything not matching a known image signature is
  rejected, rather than only checking for known-bad patterns.
- No file is ever written to disk or executed — it's classified directly
  from an in-memory buffer, which limits the attack surface considerably
  (no path traversal into a real filesystem is currently possible).
- **Known limitation**: a magic-byte check confirms a file *starts with*
  a valid image signature, not that the entire file is a well-formed,
  safe image — a "polyglot" file could pass this check while embedding
  another payload later in the same file. A stronger version would fully
  decode the image with a real image-processing library (e.g. `sharp`),
  which fails outright on malformed files. Noting this as a deliberate
  scope trade-off rather than an oversight.

### Scalability

This validation is pure, synchronous, in-memory byte comparison — no
database or Redis lookups, no network calls. It adds negligible latency
and requires no shared state, so it scales horizontally for free: every
instance of this service validates independently, with nothing to
coordinate or synchronize across instances.

## Performance and scalability

### Caching

Classification results are cached in Redis, keyed by a SHA-256 hash of
the uploaded file's bytes (`cache/classificationCache.ts`). Classification
is deterministic for a given input and model, so a repeat upload of the
same image returns instantly instead of re-running inference.

Cache failures fail *open* (classify anyway, don't cache) rather than
failing the request — a cache is a performance optimization, not a
safety control, so a Redis outage should degrade gracefully rather than
take the API down. This is the opposite default from authentication,
which fails closed — the right failure mode depends on what a check is
protecting, not a fixed rule applied everywhere.

### Statelessness → horizontal scaling

Every piece of cross-request state (rate-limit buckets, valid API keys,
the classification cache) lives in Redis, not in any process's memory.
That means any number of gateway or scaffold-app instances can run
behind a load balancer with no session affinity required — every
instance sees identical shared state.

### Sharding readiness

API keys are stored as individual Redis keys (`apikey:<hash>`), not as
members of one shared Set. A single Set is pinned to one shard/node in a
sharded Redis deployment regardless of how many members it has, becoming
a bottleneck; individual keys distribute naturally across shards.
Rate-limit bucket keys (`ratelimit:<rule>:<clientId>`) were already
structured this way from the start.

### Bounded latency

Redis commands have an explicit timeout (`commandTimeout`), so a
degraded Redis fails fast into the existing fail-closed handling instead
of silently slowing down every request.

### Connection reuse

The gateway's proxy uses a keep-alive HTTP agent when forwarding to the
downstream service, avoiding a fresh TCP handshake on every request.

### Load balancing

No special configuration needed beyond correctly setting `trust proxy`
to match the actual number of proxy hops in front of the gateway — the
statelessness above means any instance can serve any request.

## What I'd add with more time

- Redis Cluster for true horizontal scaling of the datastore itself —
  not needed at this scale, but the key-naming choices above are made
  specifically so that migration wouldn't require a data-model rewrite.
- A CDN or edge cache in front of the gateway for identical repeat
  requests from different clients, beyond what per-content caching alone
  covers.
- Load testing to actually validate assumptions here (e.g. confirming
  75ms is a sensible Redis command timeout) rather than reasoning from
  first principles alone.

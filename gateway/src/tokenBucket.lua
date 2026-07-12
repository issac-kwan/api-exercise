local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])

local time = redis.call('TIME')
local now = tonumber(time[1]) + (tonumber(time[2]) / 1000000)

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

local elapsed = now - lastRefill
if elapsed < 0 then elapsed = 0 end

tokens = math.min(capacity, tokens + (elapsed * refill_rate))

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call('HSET', key, 'tokens', tokens, 'lastRefill', now)
redis.call('EXPIRE', key, 3600)

return { allowed, tostring(tokens) }

import client from 'prom-client';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry }); // CPU, memory, event loop lag, etc — free, built in

export const rateLimiterDecisions = new client.Counter({
  name: 'gateway_rate_limiter_decisions_total',
  help: 'Rate limiter decisions, labeled by rule and outcome',
  labelNames: ['rule', 'outcome'] as const, // outcome: 'allowed' | 'blocked'
  registers: [registry],
});

export const authDecisions = new client.Counter({
  name: 'gateway_auth_decisions_total',
  help: 'Authentication decisions, labeled by outcome',
  labelNames: ['outcome'] as const, // outcome: 'allowed' | 'rejected'
  registers: [registry],
});

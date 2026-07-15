import { Request } from 'express';

export interface RateLimitRule {
  name: string;
  capacity: number;
  refillRate: number;
  match: (req: Request) => boolean;
}

export const rules: RateLimitRule[] = [
  {
    name: 'image-classification',
    capacity: 5,
    refillRate: 1,
    match: (req) => req.path.startsWith('/image'),
  },
  {
    name: 'default',
    capacity: 20,
    refillRate: 5,
    match: () => true, // catch-all — must stay last
  },
];

export function resolveRule(req: Request): RateLimitRule {
  return rules.find((rule) => rule.match(req)) ?? rules[rules.length - 1];
}

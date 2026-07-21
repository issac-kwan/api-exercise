type LogLevel = 'info' | 'warn' | 'error';
type LogFields = Record<string, unknown>;

// Field names that should never appear in a log line, even accidentally.
const SENSITIVE_KEYS = ['authorization', 'x-api-key', 'apikey', 'password', 'token'];

function redact(fields: LogFields): LogFields {
  const safe: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      safe[key] = '[redacted]';
    } else if (typeof value === 'string') {
      // Strip newlines so a malicious value (e.g. a crafted filename)
      // can't inject fake extra lines into the logs — this is "log
      // injection", a real, under-known vulnerability class: without
      // this, an attacker-controlled string containing \n could make
      // one log call appear as several, forging entries that never
      // actually happened.
      safe[key] = value.replace(/[\r\n]/g, ' ');
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...redact(fields) };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
};

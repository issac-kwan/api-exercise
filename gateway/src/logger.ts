type LogLevel = 'info' | 'warn' | 'error';
type LogFields = Record<string, unknown>;

const SENSITIVE_KEYS = ['authorization', 'x-api-key', 'apikey', 'password', 'token'];

function redact(fields: LogFields): LogFields {
  const safe: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      safe[key] = '[redacted]';
    } else if (typeof value === 'string') {
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

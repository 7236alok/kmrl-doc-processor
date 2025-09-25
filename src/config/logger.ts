export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function timestamp() {
  return new Date().toISOString();
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: timestamp(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  if (level === 'error' || level === 'warn') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};

export default logger;

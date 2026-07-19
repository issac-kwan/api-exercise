import app from './app';
import { logger } from '../../logging/logger';

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection — shutting down', { reason: String(reason) });
  process.exit(1);
});

app.listen(8080, () => {
  console.log('Gateway listening on http://localhost:8080');
});

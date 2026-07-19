import app from "./app";
import { PORT } from "./constants";
import { logger } from "./logging/logger"; 

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection — shutting down', { reason: String(reason) });
  process.exit(1);
});
app.listen(PORT, () => {
  console.log(`app is listening on port ${PORT}`);
});

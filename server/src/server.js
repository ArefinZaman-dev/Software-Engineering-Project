const config = require('./config/env');
const app = require('./app');
const { connectDB } = require('./config/db');
const User = require('./models/User');
const logger = require('./utils/logger');

async function start() {
  await connectDB();
  await User.init(); // make sure the unique email index exists before serving requests
  app.listen(config.port, () => {
    logger.info(`CampusGig API running on http://localhost:${config.port} (${config.env})`);
  });
}

start().catch((error) => {
  logger.error('Could not start the server:', error.message);
  process.exit(1);
});

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isTest = NODE_ENV === 'test';
const isProduction = NODE_ENV === 'production';

function read(name, { testFallback } = {}) {
  const value = process.env[name] || (isTest ? testFallback : undefined);
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to server/.env and fill it in.`
    );
  }
  return value;
}

function databaseName(uri) {
  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, '');
  const match = withoutScheme.match(/\/([^/?]+)/);
  return match ? match[1] : '';
}

const config = {
  env: NODE_ENV,
  isTest,
  isProduction,
  port: Number(process.env.PORT) || 5000,
  mongodbUri: isTest ? read('MONGODB_URI_TEST') : read('MONGODB_URI'),
  jwtSecret: read('JWT_SECRET', { testFallback: 'test-only-secret-never-use-outside-tests' }),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Fewer rounds in tests keeps the test suite fast. Real runs use 12.
  bcryptRounds: isTest ? 4 : 12,
};

if (isProduction && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

if (isTest) {
  // Tests delete data, so make sure they can never touch the development database.
  if (process.env.MONGODB_URI && process.env.MONGODB_URI === config.mongodbUri) {
    throw new Error('MONGODB_URI_TEST must be different from MONGODB_URI.');
  }
  if (!databaseName(config.mongodbUri).toLowerCase().includes('test')) {
    throw new Error('The test database name must contain "test" (for example campusgig_test).');
  }
}

module.exports = config;

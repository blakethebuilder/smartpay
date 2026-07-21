require('dotenv').config();

const config = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'smartpay',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'changeme',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    pool: { min: 2, max: 20 },
    migrations: {
      directory: './migrations',
      extension: 'js',
    },
  },
};

module.exports = config;

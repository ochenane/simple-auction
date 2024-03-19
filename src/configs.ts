import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: {
    host: process.env.SERVER_HOST ?? '127.0.0.1',
    port: parseInt(process.env.SERVER_PORT ?? '8080'),
  },
  auth: {
    token: process.env.AUTH_TOKEN ?? '',
  },
};

export default config;

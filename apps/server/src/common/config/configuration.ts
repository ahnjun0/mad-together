export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
  },
  dev: {
    authEnabled: process.env.DEV_AUTH_ENABLED === 'true',
    authToken: process.env.DEV_AUTH_TOKEN || 'dev-token',
  },
});

export default () => ({
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',

  // Database
  database: {
    url: process.env.DATABASE_URL, // URL de connexion complète (prioritaire si définie)
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'ifa_dev',
    schema: process.env.DB_SCHEMA || 'public',
    ssl: process.env.DB_SSL === 'true',
  },

  // JWT - Admin
  jwtAdmin: {
    secret: process.env.JWT_ADMIN_SECRET,
    refreshSecret: process.env.JWT_ADMIN_REFRESH_SECRET,
  },

  // JWT - User
  jwtUser: {
    secret: process.env.JWT_USER_SECRET,
    refreshSecret: process.env.JWT_USER_REFRESH_SECRET,
  },

  // Super Admin Initial
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    firstName: process.env.SUPER_ADMIN_FIRST_NAME,
    lastName: process.env.SUPER_ADMIN_LAST_NAME,
  },
});


const dotenv = require('dotenv');
const path = require('path');

// Load development environment variables
const devEnv = dotenv.config({ path: path.join(__dirname, '.env') }).parsed || {};

// Load production environment variables
const prodEnv = dotenv.config({ path: path.join(__dirname, '.env.production') }).parsed || {};

/**
 * PM2 Ecosystem Configuration
 * 
 * Direct PM2 Commands:
 * 
 * Development:
 *   pm2 start ecosystem.config.js                    # Start with development env
 *   pm2 restart ecosystem.config.js                  # Restart with development env
 *   pm2 reload ecosystem.config.js                   # Reload with development env
 *   pm2 logs                                          # View all logs
 *   pm2 status                                        # View status
 *   pm2 monit                                         # Monitor processes
 * 
 * Production:
 *   pm2 start ecosystem.config.js --env production  # Start with production env
 *   pm2 restart ecosystem.config.js --env production # Restart with production env
 *   pm2 reload ecosystem.config.js --env production  # Reload with production env
 *   pm2 logs --env production                        # View production logs
 * 
 * Common Commands:
 *   pm2 stop all                                      # Stop all processes
 *   pm2 delete all                                    # Delete all processes
 *   pm2 show <process-name>                           # Show process details
 *   pm2 logs <process-name> --lines 50               # View specific process logs
 */

module.exports = {
  apps: [
    {
      name: 'comunicate-api',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: devEnv.NODE_ENV || 'development',
        PORT: devEnv.PORT || '3008',
        DEBUG_MODE: devEnv.DEBUG_MODE || 'false',
        
        // Database - Development
        DB_HOST: devEnv.DB_HOST,
        DB_PORT: devEnv.DB_PORT,
        DB_USERNAME: devEnv.DB_USERNAME,
        DB_PASSWORD: devEnv.DB_PASSWORD,
        DB_DATABASE: devEnv.DB_DATABASE,
        
        // Redis - Development
        REDIS_HOST: devEnv.REDIS_HOST,
        REDIS_PORT: devEnv.REDIS_PORT,
        REDIS_PASSWORD: devEnv.REDIS_PASSWORD,
        REDIS_DB: devEnv.REDIS_DB,
        
        // JWT - Development
        JWT_ACCESS_SECRET: devEnv.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: devEnv.JWT_REFRESH_SECRET,
        JWT_ACCESS_EXPIRES_IN: devEnv.JWT_ACCESS_EXPIRES_IN || '30m',
        JWT_REFRESH_EXPIRES_IN: devEnv.JWT_REFRESH_EXPIRES_IN || '1h',
        
        // API Configuration - Development
        API_SERVICE_URL: devEnv.API_SERVICE_URL,
        
        // API Throttling - Development
        API_THROTTLE_GET_LIMIT: devEnv.API_THROTTLE_GET_LIMIT || '100',
        API_THROTTLE_GET_WINDOW: devEnv.API_THROTTLE_GET_WINDOW || '60',
        API_THROTTLE_POST_LIMIT: devEnv.API_THROTTLE_POST_LIMIT || '30',
        API_THROTTLE_POST_WINDOW: devEnv.API_THROTTLE_POST_WINDOW || '60',
        
        // CORS - Development
        CORS_ALLOWED_ORIGINS: devEnv.CORS_ALLOWED_ORIGINS,
        BYPASS_CORS_ORIGIN: devEnv.BYPASS_CORS_ORIGIN || '1',
        
        // Upload Configuration - Development
        UPLOAD_DIR: devEnv.UPLOAD_DIR || 'uploads',
        UPLOAD_STORAGE_TYPE: devEnv.UPLOAD_STORAGE_TYPE || 'local',
        UPLOAD_MAX_FILE_SIZE: devEnv.UPLOAD_MAX_FILE_SIZE || '5242880',
        UPLOAD_IMAGE_QUALITY: devEnv.UPLOAD_IMAGE_QUALITY || '80',
        UPLOAD_BASE_URL: devEnv.UPLOAD_BASE_URL || '/uploads',
      },
      env_production: {
        NODE_ENV: prodEnv.NODE_ENV || 'production',
        PORT: prodEnv.PORT || '3008',
        DEBUG_MODE: prodEnv.DEBUG_MODE || 'false',
        
        // Database - Production
        DB_HOST: prodEnv.DB_HOST,
        DB_PORT: prodEnv.DB_PORT,
        DB_USERNAME: prodEnv.DB_USERNAME,
        DB_PASSWORD: prodEnv.DB_PASSWORD,
        DB_DATABASE: prodEnv.DB_DATABASE,
        
        // Redis - Production
        REDIS_HOST: prodEnv.REDIS_HOST,
        REDIS_PORT: prodEnv.REDIS_PORT,
        REDIS_PASSWORD: prodEnv.REDIS_PASSWORD,
        REDIS_DB: prodEnv.REDIS_DB,
        
        // JWT - Production
        JWT_ACCESS_SECRET: prodEnv.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: prodEnv.JWT_REFRESH_SECRET,
        JWT_ACCESS_EXPIRES_IN: prodEnv.JWT_ACCESS_EXPIRES_IN || '30m',
        JWT_REFRESH_EXPIRES_IN: prodEnv.JWT_REFRESH_EXPIRES_IN || '1h',
        
        // API Configuration - Production
        API_SERVICE_URL: prodEnv.API_SERVICE_URL,
        
        // API Throttling - Production
        API_THROTTLE_GET_LIMIT: prodEnv.API_THROTTLE_GET_LIMIT || '100',
        API_THROTTLE_GET_WINDOW: prodEnv.API_THROTTLE_GET_WINDOW || '60',
        API_THROTTLE_POST_LIMIT: prodEnv.API_THROTTLE_POST_LIMIT || '30',
        API_THROTTLE_POST_WINDOW: prodEnv.API_THROTTLE_POST_WINDOW || '60',
        
        // CORS - Production
        CORS_ALLOWED_ORIGINS: prodEnv.CORS_ALLOWED_ORIGINS,
        BYPASS_CORS_ORIGIN: prodEnv.BYPASS_CORS_ORIGIN || '1',
        
        // Upload Configuration - Production
        UPLOAD_DIR: prodEnv.UPLOAD_DIR || 'uploads',
        UPLOAD_STORAGE_TYPE: prodEnv.UPLOAD_STORAGE_TYPE || 'local',
        UPLOAD_MAX_FILE_SIZE: prodEnv.UPLOAD_MAX_FILE_SIZE || '5242880',
        UPLOAD_IMAGE_QUALITY: prodEnv.UPLOAD_IMAGE_QUALITY || '80',
        UPLOAD_BASE_URL: prodEnv.UPLOAD_BASE_URL || '/uploads',
      },
      log_file: 'pm2/logs/app.log',
      out_file: 'pm2/logs/app-out.log',
      error_file: 'pm2/logs/app-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
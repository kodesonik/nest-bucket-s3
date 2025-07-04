import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'Digital Bucket',
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60000,
    requests: parseInt(process.env.RATE_LIMIT_REQUESTS, 10) || 100,
  },

  // File Upload Limits
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 104857600, // 100MB
    maxFilesPerRequest: parseInt(process.env.MAX_FILES_PER_REQUEST, 10) || 10,
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
      'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm',
      'mp3', 'wav', 'flac', 'aac'
    ],
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'default-session-secret',
    maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 86400000, // 24 hours
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    apiKeyLength: parseInt(process.env.API_KEY_LENGTH, 10) || 32,
  },

  // File Processing
  fileProcessing: {
    image: {
      quality: parseInt(process.env.IMAGE_QUALITY, 10) || 80,
      maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH, 10) || 2048,
      maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT, 10) || 2048,
      thumbnailWidth: parseInt(process.env.THUMBNAIL_WIDTH, 10) || 200,
      thumbnailHeight: parseInt(process.env.THUMBNAIL_HEIGHT, 10) || 200,
    },
    compression: {
      level: parseInt(process.env.COMPRESSION_LEVEL, 10) || 6,
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD, 10) || 1024,
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs',
    maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 7,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
  },

  // Health Check
  healthCheck: {
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10) || 5000,
    memoryHeap: parseInt(process.env.HEALTH_CHECK_MEMORY_HEAP, 10) || 150000000,
    memoryRss: parseInt(process.env.HEALTH_CHECK_MEMORY_RSS, 10) || 300000000,
  },

  // CDN Configuration (Optional)
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    baseUrl: process.env.CDN_BASE_URL,
  },

  // Analytics (Optional)
  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true',
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
  },
})); 
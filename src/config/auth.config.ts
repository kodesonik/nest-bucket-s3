import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'digital-bucket',
  },
  
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'default-session-secret',
    maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 86400000, // 24 hours
  },
  
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  },
  
  apiKey: {
    length: parseInt(process.env.API_KEY_LENGTH, 10) || 32,
  },
})); 
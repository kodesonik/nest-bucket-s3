import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/digital-bucket',
  name: process.env.MONGODB_DATABASE || 'digital-bucket',
  
  // Connection options
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    bufferMaxEntries: 0,
  },
})); 
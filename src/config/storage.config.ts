import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: 'digitalocean-spaces',
  
  // DigitalOcean Spaces Configuration
  digitalOcean: {
    endpoint: process.env.DO_SPACES_ENDPOINT || 'https://nyc3.digitaloceanspaces.com',
    bucket: process.env.DO_SPACES_BUCKET,
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
    region: process.env.DO_SPACES_REGION || 'nyc3',
    
    // Additional S3 options
    signatureVersion: 'v4',
    s3ForcePathStyle: false,
  },
  
  // File organization
  folders: {
    images: 'images',
    videos: 'videos',
    documents: 'documents',
    archives: 'archives',
    thumbnails: 'thumbnails',
    temp: 'temp',
  },
  
  // CDN settings
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    baseUrl: process.env.CDN_BASE_URL,
  },
})); 
# Digital Bucket - NestJS File Storage Management System

A comprehensive file storage management system built with NestJS, DigitalOcean Spaces, and MongoDB. This application provides a secure, scalable solution for managing file uploads, downloads, and organization with admin dashboard capabilities.

## 🚀 Features

### Core Functionality
- **File Management**: Upload, download, delete files (images, videos, documents)
- **Multiple Upload Types**: Single file, multiple files, compressed archives
- **Folder Organization**: Create and manage folder structures
- **File Compression**: Automatic compression for large files
- **File Type Validation**: Support for images, videos, documents with validation

### Admin Dashboard
- **Web Interface**: Clean, responsive dashboard built with EJS and Tailwind CSS
- **App Management**: Create and manage applications
- **Access Key Management**: Generate and revoke API keys for apps
- **File Browser**: Visual file/folder browser with management capabilities
- **Usage Analytics**: Storage usage and API usage statistics

### Security & Access Control
- **API Key Authentication**: Secure access via `x-app-id` and `x-api-key` headers
- **Admin Authentication**: Protected admin dashboard
- **Role-based Access**: Different permission levels for apps
- **Rate Limiting**: API rate limiting and usage quotas

### Technical Features
- **DigitalOcean Spaces**: S3-compatible object storage integration
- **MongoDB**: Flexible document database for metadata storage
- **Docker Support**: Fully containerized application
- **RESTful API**: Clean REST API with comprehensive documentation
- **Error Handling**: Robust error handling and logging
- **Health Checks**: Application health monitoring endpoints

## 🏗️ Architecture

```
├── src/
│   ├── modules/
│   │   ├── auth/           # Authentication & authorization
│   │   ├── admin/          # Admin dashboard controllers
│   │   ├── apps/           # App management
│   │   ├── files/          # File operations
│   │   ├── storage/        # DigitalOcean Spaces integration
│   │   └── database/       # MongoDB configuration
│   ├── guards/             # Authentication guards
│   ├── interceptors/       # Request/response interceptors
│   ├── decorators/         # Custom decorators
│   └── common/             # Shared utilities
├── views/                  # EJS templates
├── public/                 # Static assets (CSS, JS)
├── docker/                 # Docker configuration files
└── docs/                   # API documentation
```

## 🛠️ Technology Stack

- **Backend**: NestJS (Node.js)
- **Database**: MongoDB with Mongoose
- **File Storage**: DigitalOcean Spaces (S3-compatible)
- **Frontend**: EJS templates with Tailwind CSS
- **Authentication**: JWT tokens, API keys
- **Containerization**: Docker & Docker Compose
- **File Processing**: Multer, Sharp (image processing)
- **Compression**: Archiver.js for file compression

## 📋 Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- DigitalOcean Spaces account
- MongoDB (local or cloud instance)

## ⚡ Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd digital-bucket
```

### 2. Environment Configuration
Create a `.env` file in the root directory. Below are the essential environment variables you need to set:

#### **Core Application Settings**
```env
# Application Configuration
NODE_ENV=development
APP_NAME=Digital Bucket
PORT=3000

# Security & Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=24h
SESSION_SECRET=your-session-secret-key-change-this-in-production
BCRYPT_ROUNDS=12

# Admin User Configuration
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-admin-password-change-this
```

#### **Database Configuration**
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/digital-bucket
MONGODB_DATABASE=digital-bucket
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=password

# Redis Configuration (for sessions and caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### **Storage Configuration**
```env
# DigitalOcean Spaces Configuration
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=your-bucket-name
DO_SPACES_ACCESS_KEY=your-access-key
DO_SPACES_SECRET_KEY=your-secret-key
DO_SPACES_REGION=nyc3

# CDN Configuration (Optional)
CDN_ENABLED=false
CDN_BASE_URL=https://your-cdn-domain.com
```

#### **File Upload & Processing**
```env
# File Upload Limits
MAX_FILE_SIZE=104857600  # 100MB in bytes
MAX_FILES_PER_REQUEST=10
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,webp,bmp,svg,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,mp4,avi,mov,wmv,flv,webm,mp3,wav,flac,aac,zip,rar,7z

# Image Processing Configuration
IMAGE_QUALITY=80          # JPEG quality (1-100)
IMAGE_MAX_WIDTH=2048      # Max image width for resizing
IMAGE_MAX_HEIGHT=2048     # Max image height for resizing
THUMBNAIL_WIDTH=200       # Thumbnail width
THUMBNAIL_HEIGHT=200      # Thumbnail height

# File Compression Configuration
COMPRESSION_LEVEL=6       # Gzip compression level (1-9)
AUTO_COMPRESS_IMAGES=true
AUTO_GENERATE_THUMBNAILS=true
```

#### **Security & Rate Limiting**
```env
# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_TTL=60000      # 1 minute in milliseconds
RATE_LIMIT_REQUESTS=100   # Max requests per TTL window
RATE_LIMIT_FILE_UPLOAD=10 # Max file uploads per minute

# Security Headers
HELMET_ENABLED=true
CSP_ENABLED=true
```

#### **Webhook Configuration**
```env
# Webhook Configuration
WEBHOOK_ENABLED=true
WEBHOOK_URL=https://your-webhook-endpoint.com/webhook
WEBHOOK_SECRET=your-webhook-secret-key
WEBHOOK_TIMEOUT=10000     # Webhook timeout in milliseconds
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=5000  # Delay between retries in milliseconds
```

#### **Email & Notifications**
```env
# Email Configuration (for notifications)
EMAIL_ENABLED=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
EMAIL_FROM=noreply@digitalbucket.com
EMAIL_FROM_NAME=Digital Bucket

# Slack Integration (Optional)
SLACK_ENABLED=false
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

#### **Monitoring & Logging**
```env
# Logging Configuration
LOG_LEVEL=debug           # error, warn, info, debug, verbose
LOG_FILE_ENABLED=true
LOG_FILE_PATH=./logs
LOG_MAX_FILES=7          # Keep logs for 7 days
LOG_MAX_SIZE=10m         # Max log file size

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=5000 # Health check timeout in milliseconds
HEALTH_CHECK_MEMORY_HEAP=150000000  # Max memory heap in bytes
HEALTH_CHECK_MEMORY_RSS=300000000   # Max memory RSS in bytes
```

#### **Feature Flags**
```env
# Feature Toggles
FEATURE_USER_REGISTRATION=true
FEATURE_PUBLIC_UPLOADS=false
FEATURE_BULK_OPERATIONS=true
FEATURE_FILE_VERSIONING=true
FEATURE_ADVANCED_SEARCH=true
FEATURE_FILE_SHARING=true
FEATURE_COMMENTS=true
```

#### **Advanced Configuration (Optional)**
```env
# Analytics Configuration
ANALYTICS_ENABLED=false
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X

# Backup Configuration
BACKUP_ENABLED=false
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM (cron format)
BACKUP_RETENTION_DAYS=30

# Virus Scanning (ClamAV)
VIRUS_SCAN_ENABLED=false
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# OCR (Optical Character Recognition)
OCR_ENABLED=false
TESSERACT_PATH=/usr/bin/tesseract

# Custom Branding
BRAND_NAME=Digital Bucket
BRAND_LOGO_URL=https://your-domain.com/logo.png
BRAND_PRIMARY_COLOR=#3b82f6
BRAND_SECONDARY_COLOR=#1e40af
```

> **💡 Quick Start Tip**: For a minimal setup, you only need to configure the Core Application Settings, Database Configuration, and Storage Configuration sections. The other sections can be configured later as needed.

> **🔒 Security Note**: Make sure to change all default passwords and secrets before deploying to production. Use strong, randomly generated values for JWT_SECRET and SESSION_SECRET.

### 3. Using Docker (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Manual Installation

```bash
# Install dependencies
npm install

# Start MongoDB (if running locally)
mongod

# Start the application
npm run start:dev
```

## 🔑 API Usage

### Authentication
All API requests require authentication headers:

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -H "x-app-id: your-app-id" \
  -H "x-api-key: your-api-key" \
  -F "file=@image.jpg"
```

### API Endpoints

#### File Operations
- `POST /api/files/upload` - Upload single file
- `POST /api/files/upload-multiple` - Upload multiple files
- `POST /api/files/upload-compressed` - Upload and compress files
- `GET /api/files/:id` - Download file
- `DELETE /api/files/:id` - Delete file
- `GET /api/files` - List files with pagination

#### Folder Management
- `POST /api/folders` - Create folder
- `GET /api/folders` - List folders
- `DELETE /api/folders/:id` - Delete folder

#### App Management (Admin only)
- `POST /api/apps` - Create new app
- `GET /api/apps` - List all apps
- `PUT /api/apps/:id` - Update app
- `DELETE /api/apps/:id` - Delete app
- `POST /api/apps/:id/keys` - Generate new API key

## 🎨 Dashboard Access

Access the admin dashboard at: `http://localhost:3000/dashboard`

Default admin credentials:
- Email: `admin@example.com`
- Password: `secure-admin-password`

### Dashboard Features
- **File Browser**: Visual interface for browsing and managing files
- **App Management**: Create apps and manage API keys
- **Usage Statistics**: Monitor storage and API usage
- **User Management**: Manage admin users and permissions

## 📊 File Upload Examples

### Single File Upload
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('folder', 'images');

fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'x-app-id': 'your-app-id',
    'x-api-key': 'your-api-key'
  },
  body: formData
});
```

### Multiple Files Upload
```javascript
const formData = new FormData();
for (const file of fileInput.files) {
  formData.append('files', file);
}

fetch('/api/files/upload-multiple', {
  method: 'POST',
  headers: {
    'x-app-id': 'your-app-id',
    'x-api-key': 'your-api-key'
  },
  body: formData
});
```

## 🐳 Docker Configuration

The application includes a complete Docker setup with:
- **App Container**: NestJS application
- **MongoDB Container**: Database with persistent storage
- **Nginx Container**: Reverse proxy (optional)

### Docker Compose Services
```yaml
services:
  app:          # NestJS application
  mongodb:      # MongoDB database
  nginx:        # Reverse proxy (optional)
```

## 🔧 Development

### Available Scripts
```bash
npm run start         # Start production server
npm run start:dev     # Start development server with hot reload
npm run start:debug   # Start with debugging enabled
npm run build         # Build for production
npm run test          # Run unit tests
npm run test:e2e      # Run end-to-end tests
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
```

### Project Structure Details
```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── strategies/
│   ├── admin/
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── admin.module.ts
│   ├── apps/
│   │   ├── apps.controller.ts
│   │   ├── apps.service.ts
│   │   ├── apps.module.ts
│   │   └── schemas/
│   ├── files/
│   │   ├── files.controller.ts
│   │   ├── files.service.ts
│   │   ├── files.module.ts
│   │   └── dto/
│   └── storage/
│       ├── storage.service.ts
│       └── storage.module.ts
├── guards/
│   ├── api-key.guard.ts
│   └── admin-auth.guard.ts
├── interceptors/
│   ├── file-upload.interceptor.ts
│   └── response.interceptor.ts
└── common/
    ├── filters/
    ├── pipes/
    └── utils/
```

## 📝 API Documentation

Interactive API documentation is available through multiple interfaces:

- **Swagger UI**: `http://localhost:3000/api/docs` - Interactive API explorer
- **ReDoc**: `http://localhost:3000/api/redoc` - Clean, responsive documentation
- **OpenAPI JSON**: `http://localhost:3000/api/docs-json` - Raw OpenAPI specification

The API follows RESTful conventions and includes:
- Request/response schemas with validation
- Authentication requirements and examples
- Error codes and detailed error messages
- Rate limiting information
- Usage examples and code samples
- Interactive testing capabilities

## 🔒 Security Features

- **API Key Authentication**: Secure app-based access control
- **JWT Tokens**: Secure admin session management
- **Rate Limiting**: Prevent API abuse
- **File Validation**: Comprehensive file type and size validation
- **CORS Protection**: Configurable CORS policies
- **Input Sanitization**: Protection against malicious inputs

## 🚀 Deployment

### Production Deployment
1. Set up DigitalOcean Spaces bucket
2. Configure MongoDB cluster
3. Set production environment variables
4. Deploy using Docker containers
5. Set up domain and SSL certificates

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/digital-bucket
# ... other production configs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 References

- [NestJS Documentation](https://docs.nestjs.com/)
- [DigitalOcean Spaces API](https://docs.digitalocean.com/products/spaces/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Docker Documentation](https://docs.docker.com/)

## 📞 Support

For support and questions:
- Open an issue in the repository
- Check the [documentation](./docs/)
- Review the [FAQ](./docs/FAQ.md)

---

**Digital Bucket** - A modern, scalable file storage solution for your applications.

#!/bin/bash

# Digital Bucket Development Setup Script

echo "🚀 Setting up Digital Bucket Development Environment..."

# Create .env.dev if it doesn't exist
if [ ! -f .env.dev ]; then
    echo "📝 Creating .env.dev file..."
    cat > .env.dev << 'EOF'
# Development Environment Variables
NODE_ENV=development
PORT=3001
DEBUG_PORT=9229

# MongoDB Configuration
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=password
MONGODB_DATABASE=digital-bucket-dev
MONGODB_PORT=27017

# Redis Configuration
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=dev-jwt-secret-change-in-production

# Digital Ocean Spaces Configuration (Optional for development)
DO_SPACES_ENDPOINT=
DO_SPACES_BUCKET=
DO_SPACES_ACCESS_KEY=
DO_SPACES_SECRET_KEY=
DO_SPACES_REGION=nyc3

# Admin Configuration
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# File Upload Configuration
MAX_FILE_SIZE=104857600
MAX_FILES_PER_REQUEST=10
ALLOWED_FILE_TYPES=

# MongoDB Express Configuration
MONGO_EXPRESS_PORT=8081
MONGO_EXPRESS_USERNAME=admin
MONGO_EXPRESS_PASSWORD=pass

# Nginx Configuration (if using reverse proxy)
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
EOF
    echo "✅ .env.dev file created!"
else
    echo "📋 .env.dev file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads logs

# Build and start the development environment
echo "🔨 Building and starting development environment..."
docker compose --env-file .env.dev -f docker-compose.dev.yml up --build -d

echo "🎉 Development environment is starting up!"
echo ""
echo "📋 Services will be available at:"
echo "   - Application: http://localhost:3001"
echo "   - MongoDB Express: http://localhost:8081"
echo "   - MongoDB: localhost:27017"
echo "   - Redis: localhost:6379"
echo ""
echo "🔍 To view logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "🛑 To stop: docker-compose -f docker-compose.dev.yml down"
echo ""
echo "🔧 Your source code is mounted as a volume - changes will trigger auto-restart!" 
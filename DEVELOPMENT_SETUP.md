# Digital Bucket Development Setup

This document explains how to set up and use the development environment for Digital Bucket.

## Overview

The development environment provides:
- **Hot Reloading**: Changes to source code automatically restart the application
- **Volume Mounting**: Your local `src` folder is mounted into the container
- **Database Management**: MongoDB Express for easy database inspection
- **Debug Support**: Debug port exposed for IDE debugging
- **Isolated Environment**: Separate containers and volumes for development

## Quick Start

### Option 1: Using the Setup Script (Recommended)

```bash
# Run the development setup script
./dev-setup.sh
```

This script will:
1. Create a `.env.dev` file with development defaults
2. Create necessary directories
3. Build and start all services
4. Show you the available URLs

### Option 2: Manual Setup

1. **Create environment file**:
   ```bash
   cp .env.dev.example .env.dev  # If you have an example file
   # Or create .env.dev manually with the required variables
   ```

2. **Start development environment**:
   ```bash
   docker-compose --env-file .env.dev -f docker-compose.dev.yml up --build
   ```

## Development Environment Details

### Services

- **App**: NestJS application with hot reloading
  - Port: 3000
  - Debug Port: 9229 (for IDE debugging)
  - Auto-restarts on code changes

- **MongoDB**: Database with development-specific name
  - Port: 27017
  - Database: `digital-bucket-dev`

- **Redis**: Session and caching store
  - Port: 6379

- **MongoDB Express**: Database management UI
  - Port: 8081
  - Username: `admin`
  - Password: `pass`

### Volume Mounts

The following directories are mounted for live development:
- `./src` → `/app/src` (Source code - hot reloading)
- `./views` → `/app/views` (View templates)
- `./public` → `/app/public` (Static assets)
- `./uploads` → `/app/uploads` (File uploads)
- `./logs` → `/app/logs` (Application logs)

### Environment Variables

Key development environment variables:
- `NODE_ENV=development`
- `MONGODB_DATABASE=digital-bucket-dev`
- `JWT_SECRET=dev-jwt-secret-change-in-production`
- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=admin123`

## Development Workflow

1. **Start the environment**:
   ```bash
   ./dev-setup.sh
   ```

2. **Make changes** to your source code in the `src` directory

3. **Watch logs** to see the application restart:
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f app
   ```

4. **Access services**:
   - Application: http://localhost:3000
   - Database UI: http://localhost:8081
   - API Health: http://localhost:3000/health

## Useful Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f app
```

### Restart Services
```bash
# Restart all services
docker-compose -f docker-compose.dev.yml restart

# Restart specific service
docker-compose -f docker-compose.dev.yml restart app
```

### Stop Environment
```bash
docker-compose -f docker-compose.dev.yml down
```

### Clean Up (Remove volumes)
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### Rebuild After Dependencies Change
```bash
docker-compose -f docker-compose.dev.yml up --build
```

## IDE Setup

### VS Code Debugging

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Docker",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}/src",
      "remoteRoot": "/app/src",
      "protocol": "inspector"
    }
  ]
}
```

## Troubleshooting

### Port Conflicts
If ports are already in use, update the `.env.dev` file:
```bash
PORT=3001
MONGODB_PORT=27018
REDIS_PORT=6380
MONGO_EXPRESS_PORT=8082
```

### Permission Issues
If you encounter permission issues with volumes:
```bash
sudo chown -R $USER:$USER uploads logs
```

### Database Connection Issues
Check if MongoDB is running:
```bash
docker-compose -f docker-compose.dev.yml ps mongodb
```

### Hot Reload Not Working
Ensure the source code is properly mounted:
```bash
docker-compose -f docker-compose.dev.yml exec app ls -la /app/src
```

## Production vs Development

| Feature | Development | Production (Staging) |
|---------|-------------|---------------------|
| Dockerfile | `Dockerfile.dev` | `Dockerfile.staging` |
| Compose File | `docker-compose.dev.yml` | `docker-compose.staging.yml` |
| Source Code | Volume mounted | Copied into image |
| Database | `digital-bucket-dev` | `digital-bucket` |
| Hot Reload | ✅ Enabled | ❌ Disabled |
| Debug Port | ✅ Exposed | ❌ Not exposed |
| MongoDB Express | ✅ Always running | ❌ Profile-based |
| Build Process | Single-stage | Multi-stage | 
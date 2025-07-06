# REST API Testing Files

This folder contains comprehensive REST files for testing all API endpoints of the NestJS application. These files are designed to work with REST client extensions in VS Code or similar tools.

## Files Overview

- **`environment.rest`** - Contains environment variables and configuration
- **`auth.rest`** - Authentication endpoints (login, register, tokens)
- **`users.rest`** - User management and CRUD operations
- **`files.rest`** - File upload, download, and management
- **`webhooks.rest`** - Webhook creation, management, and testing
- **`admin.rest`** - Admin operations and system management
- **`apps.rest`** - Application and API key management
- **`health.rest`** - Health check and monitoring endpoints
- **`storage.rest`** - Storage and bucket management
- **`file-processing.rest`** - File processing and transformation operations

## Setup Instructions

### 1. Install REST Client Extension

If using VS Code, install the "REST Client" extension by Huachao Mao.

### 2. Configure Environment Variables

Edit `environment.rest` to match your setup:

```rest
@baseUrl = http://localhost:3000
@apiVersion = v1
@accessToken = your-actual-access-token
@adminToken = your-actual-admin-token
@apiKey = your-actual-api-key
```

### 3. Update Sample IDs

Replace the sample IDs in `environment.rest` with actual IDs from your database:

```rest
@userId = 507f1f77bcf86cd799439011
@fileId = 507f1f77bcf86cd799439012
@webhookId = 507f1f77bcf86cd799439013
```

## Usage Instructions

### Getting Started

1. **Start with Authentication**: Use `auth.rest` to register a user and get access tokens
2. **Set Tokens**: Copy the received tokens to `environment.rest`
3. **Test Endpoints**: Use any of the other REST files to test specific functionality

### Basic Workflow

```rest
# 1. Register a new user
POST {{baseUrl}}/auth/register

# 2. Login to get tokens
POST {{baseUrl}}/auth/login

# 3. Use the access token for authenticated requests
GET {{baseUrl}}/users/profile
Authorization: Bearer {{accessToken}}
```

### Testing Different Modules

#### User Management
```rest
# Get all users (admin only)
GET {{baseUrl}}/users
Authorization: Bearer {{adminToken}}

# Create a new user
POST {{baseUrl}}/users
Authorization: Bearer {{adminToken}}
```

#### File Operations
```rest
# Upload a file
POST {{baseUrl}}/files/upload
Authorization: Bearer {{accessToken}}

# Get file information
GET {{baseUrl}}/files/{{fileId}}
Authorization: Bearer {{accessToken}}
```

#### Webhook Management
```rest
# Create a webhook
POST {{baseUrl}}/webhooks
Authorization: Bearer {{accessToken}}

# Test webhook
POST {{baseUrl}}/webhooks/{{webhookId}}/test
Authorization: Bearer {{accessToken}}
```

## Authentication Types

### Bearer Token Authentication
Most endpoints require a Bearer token:
```rest
Authorization: Bearer {{accessToken}}
```

### API Key Authentication
Some endpoints support API key authentication:
```rest
Authorization: Bearer {{apiKey}}
```

### Admin Authentication
Admin endpoints require admin privileges:
```rest
Authorization: Bearer {{adminToken}}
```

## Common Request Patterns

### GET Requests with Pagination
```rest
GET {{baseUrl}}/users?page=1&limit=10&sort=createdAt&order=desc
Authorization: Bearer {{adminToken}}
```

### POST Requests with JSON Body
```rest
POST {{baseUrl}}/users
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

### File Upload Requests
```rest
POST {{baseUrl}}/files/upload
Authorization: Bearer {{accessToken}}
Content-Type: multipart/form-data

< ./path/to/your/file.txt
```

## Error Handling

The API returns standard HTTP status codes:
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

## Tips for Testing

1. **Start Simple**: Begin with basic endpoints before testing complex operations
2. **Check Dependencies**: Some endpoints require data from other endpoints (e.g., file operations need uploaded files)
3. **Use Variables**: Leverage the environment variables for consistent testing
4. **Test Error Cases**: Try invalid data to test error handling
5. **Monitor Logs**: Check application logs for debugging information

## File Upload Testing

For file upload testing, place test files in the `.rest` folder:
- `test-file.txt` - Simple text file
- `test-file1.txt` - First test file for multiple uploads
- `test-file2.txt` - Second test file for multiple uploads

## Environment-Specific Testing

### Development Environment
```rest
@baseUrl = http://localhost:3000
```

### Staging Environment
```rest
@baseUrl = https://staging-api.example.com
```

### Production Environment
```rest
@baseUrl = https://api.example.com
```

## Security Notes

1. **Never commit real tokens**: Use placeholder tokens in the repository
2. **Use HTTPS**: Always use HTTPS in production environments
3. **Rotate tokens**: Regularly rotate API keys and tokens
4. **Limit permissions**: Use the principle of least privilege for API keys

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check if your token is valid and not expired
2. **404 Not Found**: Verify the endpoint URL and API version
3. **400 Bad Request**: Check request body format and required fields
4. **403 Forbidden**: Ensure you have the required permissions

### Debugging Steps

1. Check the `environment.rest` file for correct variable values
2. Verify the server is running and accessible
3. Check application logs for error details
4. Test with a simple endpoint first (like health check)

## Contributing

When adding new endpoints:
1. Add the endpoint to the appropriate REST file
2. Include proper authentication headers
3. Add example request bodies
4. Update this README if needed
5. Test the endpoint thoroughly

## Support

For issues or questions about the API testing files:
1. Check the application documentation
2. Review the endpoint implementation
3. Test with simpler endpoints first
4. Check server logs for error details 
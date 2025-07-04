// MongoDB initialization script for Digital Bucket

// Switch to the application database
db = db.getSiblingDB('digital-bucket');

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('apps');
db.createCollection('files');
db.createCollection('folders');
db.createCollection('webhooks');
db.createCollection('webhook-events');

// Create indexes for better performance
print('Creating indexes...');

// User indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "apiKeys.key": 1 }, { sparse: true });
db.users.createIndex({ "createdAt": 1 });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "status": 1 });

// App indexes  
db.apps.createIndex({ "userId": 1 });
db.apps.createIndex({ "apiKeys.key": 1 }, { unique: true });
db.apps.createIndex({ "status": 1 });
db.apps.createIndex({ "createdAt": 1 });

// File indexes
db.files.createIndex({ "userId": 1 });
db.files.createIndex({ "appId": 1 });
db.files.createIndex({ "folderId": 1 });
db.files.createIndex({ "filename": 1 });
db.files.createIndex({ "mimeType": 1 });
db.files.createIndex({ "size": 1 });
db.files.createIndex({ "uploadedAt": 1 });
db.files.createIndex({ "path": 1 }, { unique: true });

// Folder indexes
db.folders.createIndex({ "userId": 1 });
db.folders.createIndex({ "parentId": 1 });
db.folders.createIndex({ "path": 1 }, { unique: true });

// Webhook indexes
db.webhooks.createIndex({ "appId": 1 });
db.webhooks.createIndex({ "url": 1 });
db.webhooks.createIndex({ "events": 1 });
db.webhooks.createIndex({ "active": 1 });

// Webhook event indexes
db['webhook-events'].createIndex({ "webhookId": 1 });
db['webhook-events'].createIndex({ "status": 1 });
db['webhook-events'].createIndex({ "createdAt": 1 });
db['webhook-events'].createIndex({ "scheduledFor": 1 });

print('Database initialization completed successfully!');
print('Created collections: users, apps, files, folders, webhooks, webhook-events');
print('Created performance indexes for all collections'); 
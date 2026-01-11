# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "role": "viewer",  // optional: viewer, editor, admin
  "organization": "default"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "viewer",
      "organization": "default"
    },
    "token": "jwt_token_here"
  }
}
```

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

### Videos

#### Upload Video
```http
POST /api/videos/upload
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `video` (file): Video file (required)
- `title` (string): Video title (required)
- `description` (string): Video description (optional)
- `category` (string): Category name (optional)
- `tags` (string): Comma-separated tags (optional)

**Response:**
```json
{
  "success": true,
  "message": "Video uploaded successfully. Processing started.",
  "data": {
    "video": {
      "_id": "...",
      "title": "My Video",
      "status": "processing",
      ...
    }
  }
}
```

**Required Role:** Editor or Admin

#### Get All Videos
```http
GET /api/videos
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status (uploading, processing, completed, failed, flagged, safe)
- `sensitivityStatus` (string): Filter by sensitivity (pending, safe, flagged)
- `category` (string): Filter by category
- `search` (string): Search in title, description, tags
- `minSize` (number): Minimum file size in bytes
- `maxSize` (number): Maximum file size in bytes
- `minDuration` (number): Minimum duration in seconds
- `maxDuration` (number): Maximum duration in seconds
- `startDate` (string): Start date (ISO format)
- `endDate` (string): End date (ISO format)
- `sortBy` (string): Sort field (uploadedAt, fileSize, duration)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

#### Get Single Video
```http
GET /api/videos/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "video": { ... }
  }
}
```

#### Stream Video
```http
GET /api/videos/:id/stream
```

**Headers:**
```
Authorization: Bearer <token>
Range: bytes=0-1023  // Optional, for range requests
```

**Response:**
- Video file stream with appropriate Content-Type and Content-Range headers

#### Update Video
```http
PUT /api/videos/:id
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "category": "new-category",
  "tags": "tag1, tag2, tag3"
}
```

**Required Role:** Editor or Admin (own videos) or Admin (any video)

#### Delete Video
```http
DELETE /api/videos/:id
```

**Required Role:** Editor or Admin (own videos) or Admin (any video)

#### Get Categories
```http
GET /api/videos/categories/list
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [ ... ]
  }
}
```

---

### Categories

#### Create Category
```http
POST /api/categories
```

**Request Body:**
```json
{
  "name": "Entertainment",
  "description": "Entertainment videos",
  "color": "#3B82F6"
}
```

**Required Role:** Editor or Admin

#### Get All Categories
```http
GET /api/categories
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [ ... ]
  }
}
```

#### Delete Category
```http
DELETE /api/categories/:id
```

**Required Role:** Editor or Admin

---

### Users

#### Get All Users (Admin Only)
```http
GET /api/users
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [ ... ]
  }
}
```

#### Get User Statistics
```http
GET /api/users/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalVideos": 25,
      "completedVideos": 20,
      "flaggedVideos": 2,
      "processingVideos": 3,
      "totalSize": 5242880000
    }
  }
}
```

#### Update User Role (Admin Only)
```http
PUT /api/users/:id/role
```

**Request Body:**
```json
{
  "role": "editor"  // viewer, editor, or admin
}
```

---

## WebSocket Events

### Connection
Connect to Socket.io server with authentication:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'jwt_token_here' }
});
```

### Subscribe to Video Updates
```javascript
socket.emit('subscribe:video', videoId);
```

### Listen to Progress Updates
```javascript
socket.on('video:progress', (data) => {
  console.log('Progress:', data.progress);
  console.log('Status:', data.status);
});
```

**Event Data:**
```json
{
  "videoId": "...",
  "progress": 45,
  "status": "processing",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Listen to Completion
```javascript
socket.on('video:complete', (data) => {
  console.log('Video processing complete:', data);
});
```

**Event Data:**
```json
{
  "videoId": "...",
  "status": "completed",
  "sensitivityStatus": "safe",
  "progress": 100,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]  // For validation errors
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production use.

---

## CORS

CORS is configured to allow requests from the frontend origin specified in `CORS_ORIGIN` environment variable.

---

## File Upload Limits

- **Maximum file size**: 500MB (configurable via `MAX_FILE_SIZE`)
- **Allowed formats**: MP4, MPEG, QuickTime, AVI, WebM, MKV
- **Storage**: Local filesystem (configurable for cloud storage)

---

## Video Processing

Videos undergo the following processing pipeline:

1. **Upload**: File is uploaded and stored
2. **Metadata Extraction**: Video metadata (duration, dimensions, etc.) is extracted
3. **Sensitivity Analysis**: Content is analyzed for sensitivity
4. **Compression**: Video is compressed and optimized for streaming
5. **Completion**: Video status is updated to "completed" or "flagged"

Processing progress is broadcast via WebSocket in real-time.

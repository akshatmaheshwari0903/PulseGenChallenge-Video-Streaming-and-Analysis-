# Architecture Overview

## System Architecture

PulseGen follows a modern full-stack architecture with clear separation between backend and frontend.

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   React Client  │◄───────►│  Express API   │◄───────►│    MongoDB      │
│   (Vite)        │  HTTP   │   (Node.js)     │         │   Database      │
│                 │         │                 │         │                 │
└────────┬────────┘         └────────┬────────┘         └─────────────────┘
         │                           │
         │                           │
         │                    ┌─────▼─────┐
         │                    │           │
         └───────────────────►│ Socket.io │
                    WebSocket │  Server   │
                              │           │
                              └───────────┘
```

## Backend Architecture

### Technology Stack
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-Time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Video Processing**: FFmpeg (fluent-ffmpeg)
- **Validation**: Express-validator

### Directory Structure
```
backend/
├── models/              # Database models
│   ├── User.js         # User schema with authentication
│   ├── Video.js        # Video metadata and processing status
│   └── Category.js     # Custom video categories
│
├── routes/              # API route handlers
│   ├── auth.js         # Authentication endpoints
│   ├── videos.js       # Video CRUD and streaming
│   ├── users.js        # User management
│   └── categories.js   # Category management
│
├── middleware/          # Express middleware
│   ├── auth.js         # JWT authentication & authorization
│   └── upload.js       # File upload handling
│
├── utils/              # Utility functions
│   ├── jwt.js          # JWT token generation/verification
│   └── videoProcessor.js # FFmpeg video processing
│
├── socket/              # Socket.io handlers
│   └── socketHandler.js # Real-time event management
│
└── server.js            # Application entry point
```

### Data Flow

#### Video Upload Flow
```
1. Client uploads video → POST /api/videos/upload
2. Multer saves file to disk
3. Video metadata extracted via FFmpeg
4. Video record created in MongoDB
5. Background processing starts:
   a. Sensitivity analysis
   b. Video compression
   c. Status updates via Socket.io
6. Processing complete → Video ready for streaming
```

#### Authentication Flow
```
1. User registers/logs in → POST /api/auth/register|login
2. JWT token generated
3. Token stored in localStorage (client)
4. Token sent in Authorization header for subsequent requests
5. Middleware validates token on protected routes
6. User data attached to request object
```

#### Multi-Tenant Isolation
```
1. User belongs to an organization
2. All queries filtered by organization
3. Socket.io rooms organized by organization
4. Users can only access their organization's data
```

## Frontend Architecture

### Technology Stack
- **Build Tool**: Vite
- **Framework**: React 18
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Real-Time**: Socket.io Client
- **Video Player**: React Player
- **Styling**: Tailwind CSS

### Directory Structure
```
frontend/
├── src/
│   ├── components/     # Reusable components
│   │   ├── Layout/
│   │   │   └── Navbar.jsx
│   │   └── PrivateRoute.jsx
│   │
│   ├── contexts/        # React contexts
│   │   ├── AuthContext.jsx    # Authentication state
│   │   └── SocketContext.jsx  # Socket.io connection
│   │
│   ├── pages/          # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── VideoLibrary.jsx
│   │   ├── VideoUpload.jsx
│   │   ├── VideoPlayer.jsx
│   │   ├── UserManagement.jsx
│   │   └── Categories.jsx
│   │
│   ├── utils/          # Utility functions
│   │   └── api.js     # Axios instance with interceptors
│   │
│   ├── App.jsx        # Main app component with routing
│   └── main.jsx       # Application entry point
│
└── index.html         # HTML template
```

### State Management

#### AuthContext
- Manages user authentication state
- Handles login, register, logout
- Provides user data to components
- Manages JWT token storage

#### SocketContext
- Manages Socket.io connection
- Handles authentication for socket
- Provides real-time event handlers
- Manages connection state

## Security Architecture

### Authentication & Authorization
1. **JWT Tokens**: Stateless authentication
2. **Password Hashing**: Bcrypt with salt rounds
3. **Role-Based Access Control**: Viewer, Editor, Admin roles
4. **Route Protection**: Middleware-based route guards

### Data Security
1. **Multi-Tenant Isolation**: Organization-based data segregation
2. **Input Validation**: Express-validator for all inputs
3. **File Validation**: Type and size checking
4. **CORS Configuration**: Restricted origins

### File Security
1. **Secure File Storage**: Local filesystem (can be extended to cloud)
2. **File Type Validation**: Strict MIME type checking
3. **Size Limits**: Configurable maximum file size
4. **Access Control**: Organization-based file access

## Video Processing Pipeline

### Stages
1. **Upload**: File received and stored
2. **Validation**: File type and size validation
3. **Metadata Extraction**: FFmpeg probes video for metadata
4. **Sensitivity Analysis**: Content screening (simplified for demo)
5. **Compression**: Video optimized for streaming
6. **Storage**: Processed video stored separately
7. **Status Update**: Final status set (completed/flagged)

### Real-Time Updates
- Progress updates via Socket.io
- Status changes broadcast to subscribed clients
- Processing completion notifications

## Database Schema

### User Collection
```javascript
{
  username: String (unique, required)
  email: String (unique, required)
  password: String (hashed, required)
  role: String (enum: viewer, editor, admin)
  organization: String (indexed, required)
  createdAt: Date
  updatedAt: Date
}
```

### Video Collection
```javascript
{
  title: String (required)
  filename: String (required)
  filePath: String (required)
  processedPath: String
  fileSize: Number (required)
  duration: Number
  status: String (enum: uploading, processing, completed, failed, flagged, safe)
  sensitivityStatus: String (enum: pending, safe, flagged)
  processingProgress: Number (0-100)
  uploadedBy: ObjectId (ref: User, indexed)
  organization: String (indexed, required)
  category: String (indexed)
  metadata: {
    width: Number
    height: Number
    bitrate: Number
    codec: String
    fps: Number
  }
  tags: [String]
  description: String
  uploadedAt: Date (indexed)
  processedAt: Date
}
```

### Category Collection
```javascript
{
  name: String (required, unique per organization)
  description: String
  color: String (hex color)
  createdBy: ObjectId (ref: User)
  organization: String (indexed, required)
  createdAt: Date
}
```

## API Design Principles

1. **RESTful**: Standard HTTP methods and status codes
2. **Consistent Responses**: Uniform response format
3. **Error Handling**: Comprehensive error messages
4. **Validation**: Input validation on all endpoints
5. **Pagination**: Paginated list endpoints
6. **Filtering**: Flexible query parameters

## Scalability Considerations

### Current Implementation
- Single server deployment
- Local file storage
- In-memory Socket.io connections

### Production Recommendations
1. **Horizontal Scaling**: Load balancer with multiple instances
2. **File Storage**: Cloud storage (AWS S3, Google Cloud Storage)
3. **Database**: MongoDB Atlas or replica set
4. **Caching**: Redis for session management
5. **CDN**: Content delivery network for video streaming
6. **Queue System**: Bull or similar for video processing jobs
7. **Monitoring**: Application performance monitoring
8. **Logging**: Centralized logging system

## Performance Optimizations

### Implemented
- Video compression for streaming
- HTTP range requests for video streaming
- Database indexing on frequently queried fields
- Pagination for large datasets
- Efficient file upload handling

### Future Optimizations
- Video thumbnail generation
- Multiple quality levels (adaptive streaming)
- CDN integration
- Caching layer for frequently accessed data
- Background job queue for processing
- Database query optimization

## Error Handling

### Backend
- Try-catch blocks in all async operations
- Centralized error middleware
- Validation error formatting
- User-friendly error messages

### Frontend
- Error boundaries (can be added)
- API error interceptors
- User-friendly error displays
- Loading states

## Testing Strategy

### Current State
- Manual testing recommended
- No automated tests included

### Recommended Testing
1. **Unit Tests**: Jest for backend utilities
2. **Integration Tests**: API endpoint testing
3. **E2E Tests**: Cypress or Playwright
4. **Load Testing**: Apache Bench or k6

## Deployment Considerations

### Environment Variables
- All sensitive data in environment variables
- Different configs for dev/staging/production
- Secure secret management

### Security Checklist
- [x] JWT authentication
- [x] Password hashing
- [x] Input validation
- [x] CORS configuration
- [ ] Rate limiting (recommended)
- [ ] HTTPS enforcement (recommended)
- [ ] Security headers (recommended)

---

This architecture provides a solid foundation for a video processing application with room for scaling and enhancement.

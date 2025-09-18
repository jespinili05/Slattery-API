const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const proposalApi = require('./api/proposalApi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
    timestamp: new Date().toISOString()
  }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/proposals', proposalApi);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Slattery Proposal Generator API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Slattery Proposal Generator API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      status: '/api/proposals/status',
      generate: 'POST /api/proposals/generate',
      generateFromFile: 'POST /api/proposals/generate-from-file',
      validateTemplates: 'POST /api/proposals/validate-templates',
      downloadFile: 'GET /api/proposals/download/:filename',
      listFiles: 'GET /api/proposals/files',
      templates: 'POST /api/proposals/templates',
      refineProposal: 'POST /api/proposals/:proposalId/refine'
    },
    documentation: 'See API routes for detailed usage'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    statusCode: 404,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    statusCode: 500,
    timestamp: new Date().toISOString()
  });
});

// Start server only if not in serverless environment (Vercel)
if (process.env.VERCEL !== '1' && require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Slattery Proposal Generator API`);
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📋 API Documentation:`);
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   Service Status: http://localhost:${PORT}/api/proposals/status`);
    console.log(`   Generate Proposal: POST http://localhost:${PORT}/api/proposals/generate`);
    console.log(`   Download Files: GET http://localhost:${PORT}/api/proposals/download/:filename`);
    console.log(`\n✅ Ready to generate proposals!`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
}

module.exports = app;
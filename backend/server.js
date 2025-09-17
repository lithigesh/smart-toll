const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database configuration
const { healthCheck } = require('./src/config/db');

// Import middleware
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Import routes
const authRoutes = require('./src/routes/auth');
const paymentRoutes = require('./src/routes/payment');
const tollRoutes = require('./src/routes/toll');
const walletRoutes = require('./src/routes/wallet');
const dashboardRoutes = require('./src/routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy headers (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow any origin
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, specify allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.FRONTEND_URL,
      'https://your-frontend-domain.com' // Replace with your actual frontend domain
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature']
};

app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Parse JSON for most routes
app.use('/api', express.json({ limit: '10mb' }));

// Raw body parsing for webhook endpoints (Razorpay signature verification)
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/toll', tollRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Smart Toll Backend API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      payment: '/api/payment',
      toll: '/api/toll',
      wallet: '/api/wallet',
      dashboard: '/api/dashboard'
    },
    docs: 'https://github.com/your-repo/smart-toll-backend' // Replace with actual docs URL
  });
});

// Handle 404 errors
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = () => {
  console.log('Received shutdown signal, shutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connections
    const { pool } = require('./src/config/db');
    pool.end(() => {
      console.log('Database connections closed');
      process.exit(0);
    });
  });

  // Force close server after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`
🚀 Smart Toll Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server URL: http://localhost:${PORT}
🏥 Health Check: http://localhost:${PORT}/health
📚 API Docs: http://localhost:${PORT}/
  `);
  
  // Test database connection on startup
  console.log('🔍 Testing database connection...');
  try {
    const dbHealth = await healthCheck();
    if (dbHealth.status === 'healthy') {
      console.log('✅ Database connected successfully!');
      console.log(`📊 Database timestamp: ${dbHealth.timestamp}`);
      console.log('🎯 Ready to process Smart Toll transactions!');
    } else {
      console.log('❌ Database connection failed!');
      console.log(`💥 Error: ${dbHealth.error}`);
      
      // Provide specific troubleshooting for DNS errors
      if (dbHealth.error.includes('ENOTFOUND')) {
        console.log('\n🔧 DNS Resolution Failed - Troubleshooting:');
        console.log('   1. Check if your Supabase project is active');
        console.log('   2. Verify the DATABASE_URL in your .env file');
        console.log('   3. Log in to Supabase dashboard and check project status');
        console.log('   4. Ensure your internet connection is working');
        console.log('   5. Try running: node test-db.js for detailed diagnosis');
      }
    }
  } catch (error) {
    console.log('❌ Database connection test failed!');
    console.log(`💥 Error: ${error.message}`);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n🚨 This appears to be a DNS/Network issue:');
      console.log('   • Your Supabase project may be paused or deleted');
      console.log('   • Check your Supabase dashboard');
      console.log('   • Verify your internet connection');
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

module.exports = app;
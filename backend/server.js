const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database configuration
const { healthCheck } = require('./src/db/connection');

// Import middleware
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Import routes
const authRoutes = require('./src/routes/auth');
const paymentRoutes = require('./src/routes/payment');
const tollRoutes = require('./src/routes/toll');
const walletRoutes = require('./src/routes/wallet');
const dashboardRoutes = require('./src/routes/dashboard');
const gpsRoutes = require('./src/routes/gps');
const distanceRoutes = require('./src/routes/distance');
const tollProcessingRoutes = require('./src/routes/toll-processing');
const notificationsRoutes = require('./src/routes/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy headers (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' ? true : [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature']
};

app.use(cors(corsOptions));

// Request logging and metrics middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  
  // Add response time tracking
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests (>1000ms)
    if (duration > 1000) {
      console.log(`⚠️  Slow request: ${req.method} ${req.url} took ${duration}ms`);
    }
    
    // Log errors
    if (res.statusCode >= 400) {
      console.log(`❌ ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });
  
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
      database: dbHealth,
      services: {
        geofencing: 'active',
        tollProcessing: 'active',
        distanceCalculation: 'active',
        paymentGateway: 'active'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        geofencing: 'unknown',
        tollProcessing: 'unknown', 
        distanceCalculation: 'unknown',
        paymentGateway: 'unknown'
      }
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/toll', tollRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/distance', distanceRoutes);
app.use('/api/toll-processing', tollProcessingRoutes);
app.use('/api/notifications', notificationsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Smart Toll Backend API',
    description: 'Automated toll collection system with GPS-based geofencing and real-time payment processing',
    version: process.env.npm_package_version || '1.0.0',
    documentation: {
      readme: 'See README.md for comprehensive API documentation',
      healthCheck: '/health',
      apiPrefix: '/api'
    },
    endpoints: {
      authentication: '/api/auth',
      payment: '/api/payment',
      toll: '/api/toll',
      wallet: '/api/wallet',
      dashboard: '/api/dashboard',
      gps: '/api/gps',
      distance: '/api/distance',
      tollProcessing: '/api/toll-processing',
      notifications: '/api/notifications'
    },
    features: {
      geofencing: 'Real-time zone detection and toll calculation',
      automation: 'Seamless toll collection without stopping',
      paymentGateway: 'Razorpay integration for wallet recharge',
      gpsTracking: 'Accurate distance measurement with PostGIS',
      notifications: 'Real-time updates and transaction alerts'
    }
  });
});

// Handle 404 errors
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Smart Toll Server - http://localhost:${PORT}`);
  
  // Test database connection
  try {
    const dbHealth = await healthCheck();
    if (dbHealth.status === 'healthy') {
      console.log('✅ Database connected successfully');
    } else {
      console.log('❌ Database connection failed:', dbHealth.error);
    }
  } catch (error) {
    console.log('❌ Database error:', error.message);
  }

  console.log('\nThe Server is running.....\n');

});

module.exports = app;
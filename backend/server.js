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

// Request logging middleware (optional - can be removed in production)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${req.method} ${req.url}`);
  }
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

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Smart Toll Server - http://localhost:${PORT}`);
  
  // Test database connection
  try {
    const dbHealth = await healthCheck();
    if (dbHealth.status === 'healthy') {
      console.log('✅ Database connected');
    } else {
      console.log('❌ Database failed:', dbHealth.error);
    }
  } catch (error) {
    console.log('❌ Database error:', error.message);
  }
  
  console.log('🎯 Ready!\n');
});

module.exports = app;
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database configuration
const { healthCheck } = require('./src/db/connection');

// Import middleware
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Import routes - SIMPLIFIED for ESP32 architecture
const authRoutes = require('./src/routes/auth');
const paymentRoutes = require('./src/routes/payment');
const walletRoutes = require('./src/routes/wallet');
const vehicleRoutes = require('./src/routes/vehicle');
const esp32TollRoutes = require('./src/routes/esp32-toll');

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
        esp32TollProcessing: 'active',
        paymentGateway: 'active',
        walletManagement: 'active'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        esp32TollProcessing: 'unknown',
        paymentGateway: 'unknown',
        walletManagement: 'unknown'
      }
    });
  }
});

// API Routes - SIMPLIFIED for ESP32 architecture
app.use('/api/auth', authRoutes);           // User authentication and signup
app.use('/api/payment', paymentRoutes);     // Razorpay wallet recharge
app.use('/api/wallet', walletRoutes);       // Wallet balance management
app.use('/api/vehicles', vehicleRoutes);    // Vehicle registration and management
app.use('/api/esp32-toll', esp32TollRoutes); // ESP32 device toll processing

// Root endpoint
app.get('/', (req, res) => {
  res.send('Server is running.............');
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
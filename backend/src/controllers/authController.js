const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { generateToken, generateRefreshToken } = require('../middleware/authMiddleware');
const { asyncErrorHandler, ConflictError, UnauthorizedError, ValidationError } = require('../middleware/errorHandler');

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = asyncErrorHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Create user using User model (handles password hashing and wallet creation)
  const user = await User.create({
    name,
    email,
    password,
    phone: phone || '0000000000' // Default phone if not provided
  });

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Return success response
  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      is_verified: user.is_verified,
      created_at: user.created_at
    },
    token,
    refreshToken
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncErrorHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findByEmail(email);
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Update last login timestamp (optional)
  // await User.updateLastLogin(user.id);

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    },
    token,
    refreshToken
  });
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getProfile = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user details
  const user = await User.findById(userId);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Get wallet balance
  const wallet = await Wallet.findByUserId(userId);
  const balance = wallet ? wallet.balance : 0;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at
    },
    wallet: {
      balance: parseFloat(balance),
      balance_formatted: `₹${balance}`
    }
  });
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, email, phone } = req.body;

  // Validate input
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (email !== undefined) {
    updates.email = email.toLowerCase().trim();
    
    // Check if new email is already taken by another user
    const existingUser = await User.findByEmail(updates.email);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictError('Email is already in use by another account');
    }
  }
  if (phone !== undefined) updates.phone = phone.trim();

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No valid fields provided for update');
  }

  // Update user
  const updatedUser = await User.update(userId, updates);
  if (!updatedUser) {
    throw new UnauthorizedError('User not found');
  }

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      created_at: updatedUser.created_at
    }
  });
});

/**
 * Change password
 * PUT /api/auth/password
 */
const changePassword = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters long');
  }

  // Get user with password hash
  const user = await User.findByEmail(req.user.email);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Hash new password
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password in database
  await user.update({ password: newPasswordHash });

  res.json({
    message: 'Password changed successfully'
  });
});

/**
 * Logout user (client-side token removal)
 * POST /api/auth/logout
 */
const logout = asyncErrorHandler(async (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // For enhanced security, you could implement token blacklisting here
  
  res.json({
    message: 'Logged out successfully'
  });
});

/**
 * Refresh token
 * POST /api/auth/refresh
 */
const refreshToken = asyncErrorHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new UnauthorizedError('Refresh token is required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
    throw error;
  }
});

/**
 * Forgot password (initiate password reset)
 * POST /api/auth/forgot-password
 */
const forgotPassword = asyncErrorHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError('Email is required');
  }

  const user = await User.findByEmail(email);
  
  // Always return success to prevent email enumeration
  res.json({
    message: 'If an account with this email exists, you will receive password reset instructions'
  });

  // If user exists, send password reset email (implement email service)
  if (user) {
    // TODO: Implement password reset token generation and email sending
    console.log(`Password reset requested for user: ${user.email}`);
  }
});

/**
 * Verify email (if email verification is implemented)
 * POST /api/auth/verify-email
 */
const verifyEmail = asyncErrorHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Verification token is required');
  }

  // TODO: Implement email verification logic
  res.json({
    message: 'Email verification feature not implemented'
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  forgotPassword,
  verifyEmail
};
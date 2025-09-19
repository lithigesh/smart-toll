const express = require('express');
const router = express.Router();
const DistanceCalculationService = require('../services/DistanceCalculationService');
const GpsLog = require('../models/GpsLog');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * POST /api/distance/calculate
 * Calculate distance between two GPS points
 */
router.post('/calculate', authMiddleware, async (req, res) => {
  try {
    const { point1, point2 } = req.body;

    if (!point1 || !point2 || !point1.latitude || !point1.longitude || !point2.latitude || !point2.longitude) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: point1 and point2 with latitude and longitude'
      });
    }

    // Validate coordinates
    if (!DistanceCalculationService.validateCoordinates(point1.latitude, point1.longitude) ||
        !DistanceCalculationService.validateCoordinates(point2.latitude, point2.longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GPS coordinates'
      });
    }

    const distance = await DistanceCalculationService.calculatePointDistance(point1, point2);

    res.json({
      success: true,
      data: {
        point1,
        point2,
        distance_km: distance
      }
    });

  } catch (error) {
    console.error('Error calculating distance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate distance'
    });
  }
});

/**
 * GET /api/distance/vehicle/:vehicle_id
 * Calculate distance traveled by a vehicle in a time period
 */
router.get('/vehicle/:vehicle_id', authMiddleware, async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { start_time, end_time, detailed = false } = req.query;

    if (!start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: start_time, end_time'
      });
    }

    const options = {
      maxSpeedKmh: req.query.max_speed ? parseInt(req.query.max_speed) : 200,
      minDistanceMeters: req.query.min_distance ? parseInt(req.query.min_distance) : 10,
      maxJumpKm: req.query.max_jump ? parseFloat(req.query.max_jump) : 5,
      smoothing: req.query.smoothing !== 'false'
    };

    const result = await DistanceCalculationService.calculateVehicleDistance(
      vehicle_id,
      start_time,
      end_time,
      options
    );

    res.json({
      success: true,
      data: {
        vehicle_id,
        start_time,
        end_time,
        ...result,
        detailed: detailed === 'true'
      }
    });

  } catch (error) {
    console.error('Error calculating vehicle distance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate vehicle distance'
    });
  }
});

/**
 * POST /api/distance/fare
 * Calculate fare based on distance and rate
 */
router.post('/fare', authMiddleware, async (req, res) => {
  try {
    const { distance_km, rate_per_km, options = {} } = req.body;

    if (!distance_km || !rate_per_km) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: distance_km, rate_per_km'
      });
    }

    if (distance_km < 0 || rate_per_km < 0) {
      return res.status(400).json({
        success: false,
        error: 'Distance and rate must be positive numbers'
      });
    }

    const fareCalculation = DistanceCalculationService.calculateFare(
      parseFloat(distance_km),
      parseFloat(rate_per_km),
      options
    );

    res.json({
      success: true,
      data: fareCalculation
    });

  } catch (error) {
    console.error('Error calculating fare:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate fare'
    });
  }
});

/**
 * POST /api/distance/fleet-stats
 * Get distance statistics for multiple vehicles
 */
router.post('/fleet-stats', authMiddleware, async (req, res) => {
  try {
    const { vehicle_ids, start_date, end_date } = req.body;

    if (!vehicle_ids || !Array.isArray(vehicle_ids) || vehicle_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid vehicle_ids array'
      });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: start_date, end_date'
      });
    }

    const stats = await DistanceCalculationService.getFleetDistanceStats(
      vehicle_ids,
      start_date,
      end_date
    );

    res.json({
      success: true,
      data: {
        start_date,
        end_date,
        vehicle_count: vehicle_ids.length,
        ...stats
      }
    });

  } catch (error) {
    console.error('Error calculating fleet distance stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate fleet distance statistics'
    });
  }
});

/**
 * POST /api/distance/eta
 * Calculate estimated time of arrival
 */
router.post('/eta', authMiddleware, async (req, res) => {
  try {
    const { distance_km, current_speed_kmh = 0, average_speed_kmh = 50 } = req.body;

    if (!distance_km) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: distance_km'
      });
    }

    if (distance_km < 0) {
      return res.status(400).json({
        success: false,
        error: 'Distance must be a positive number'
      });
    }

    const eta = DistanceCalculationService.calculateETA(
      parseFloat(distance_km),
      parseFloat(current_speed_kmh),
      parseFloat(average_speed_kmh)
    );

    res.json({
      success: true,
      data: eta
    });

  } catch (error) {
    console.error('Error calculating ETA:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate ETA'
    });
  }
});

/**
 * GET /api/distance/validate/:latitude/:longitude
 * Validate GPS coordinates
 */
router.get('/validate/:latitude/:longitude', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.params;

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    const isValid = DistanceCalculationService.validateCoordinates(lat, lon);

    res.json({
      success: true,
      data: {
        latitude: lat,
        longitude: lon,
        is_valid: isValid,
        errors: isValid ? [] : [
          lat < -90 || lat > 90 ? 'Latitude must be between -90 and 90' : null,
          lon < -180 || lon > 180 ? 'Longitude must be between -180 and 180' : null,
          isNaN(lat) ? 'Latitude must be a valid number' : null,
          isNaN(lon) ? 'Longitude must be a valid number' : null
        ].filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Error validating coordinates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate coordinates'
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const GpsLog = require('../models/GpsLog');
const Vehicle = require('../models/Vehicle');
const Journey = require('../models/Journey');
const GeofencingService = require('../services/GeofencingService');
const { authMiddleware } = require('../middleware/authMiddleware');
const { body, param, query } = require('express-validator');
const { asyncErrorHandler, ValidationError } = require('../middleware/errorHandler');

/**
 * POST /api/gps/log
 * Log GPS position for a vehicle and process geofencing
 * This is the main endpoint for vehicle GPS tracking
 */
router.post('/log', [
  authMiddleware,
  body('vehicle_id')
    .isUUID()
    .withMessage('Vehicle ID must be a valid UUID'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('speed')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Speed must be a positive number'),
  body('heading')
    .optional()
    .isFloat({ min: 0, max: 360 })
    .withMessage('Heading must be between 0 and 360 degrees'),
  body('accuracy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Accuracy must be a positive number')
], asyncErrorHandler(async (req, res) => {
  const { vehicle_id, latitude, longitude, speed, heading, accuracy } = req.body;
  const userId = req.user.id;

  console.log(`📍 GPS log received for vehicle ${vehicle_id}: ${latitude}, ${longitude}`);

  try {
    // 1. Verify vehicle belongs to user
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle || vehicle.user_id !== userId) {
      throw new ValidationError('Vehicle not found or access denied');
    }

    // 2. Log GPS position
    const gpsLog = await GpsLog.logPosition({
      vehicle_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: speed ? parseFloat(speed) : null,
      heading: heading ? parseFloat(heading) : null,
      accuracy: accuracy ? parseFloat(accuracy) : null
    });

    // 3. Process geofencing (zone entry/exit detection)
    const geofencingResult = await GeofencingService.processGpsPosition({
      vehicleId: vehicle_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      userId
    });

    console.log(`🎯 Geofencing result: ${geofencingResult.action}`);

    // 4. Prepare response
    const response = {
      success: true,
      message: 'GPS position logged and processed successfully',
      data: {
        gps_log: {
          id: gpsLog.id,
          timestamp: gpsLog.timestamp,
          latitude: gpsLog.latitude,
          longitude: gpsLog.longitude,
          speed: gpsLog.speed,
          accuracy: gpsLog.accuracy
        },
        geofencing: geofencingResult,
        vehicle: {
          id: vehicle.id,
          plate_number: vehicle.plate_number,
          vehicle_type: vehicle.vehicle_type
        }
      }
    };

    // Include additional context based on geofencing action
    if (geofencingResult.action === 'zone_entry' && geofencingResult.journey_entry) {
      response.data.toll_zone_entered = {
        journey_id: geofencingResult.journey_entry.journey_id,
        zone_name: geofencingResult.journey_entry.zone_name,
        road_name: geofencingResult.journey_entry.road_name,
        entry_time: geofencingResult.journey_entry.entry_time
      };
    }

    if (geofencingResult.action === 'zone_exit' && geofencingResult.journey_exit) {
      response.data.toll_calculated = {
        journey_id: geofencingResult.journey_exit.journey_id,
        transaction_id: geofencingResult.journey_exit.transaction_id,
        distance_km: geofencingResult.journey_exit.distance_km,
        fare_amount: geofencingResult.journey_exit.fare_amount,
        status: geofencingResult.journey_exit.status
      };
    }

    res.json(response);

  } catch (error) {
    console.error('Error processing GPS log:', error);
    throw error;
  }
}));

/**
 * GET /api/gps/history/:vehicle_id
 * Get GPS history for a vehicle
 */
router.get('/history/:vehicle_id', [
  authMiddleware,
  param('vehicle_id')
    .isUUID()
    .withMessage('Vehicle ID must be a valid UUID'),
  query('start_time')
    .optional()
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date'),
  query('end_time')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
], asyncErrorHandler(async (req, res) => {
  const { vehicle_id } = req.params;
  const { start_time, end_time, limit = 100 } = req.query;
  const userId = req.user.id;

  try {
    // Verify vehicle belongs to user
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle || vehicle.user_id !== userId) {
      throw new ValidationError('Vehicle not found or access denied');
    }

    // Get GPS history
    const history = await GpsLog.getVehicleHistory(vehicle_id, {
      start_time,
      end_time,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      message: `Retrieved ${history.length} GPS log entries`,
      data: {
        vehicle_id,
        history,
        query_params: {
          start_time,
          end_time,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting GPS history:', error);
    throw error;
  }
}));

/**
 * GET /api/gps/journey/:journey_id/path
 * Get GPS path for a specific journey
 */
router.get('/journey/:journey_id/path', [
  authMiddleware,
  param('journey_id')
    .isUUID()
    .withMessage('Journey ID must be a valid UUID')
], asyncErrorHandler(async (req, res) => {
  const { journey_id } = req.params;
  const userId = req.user.id;

  try {
    // Get journey details
    const journey = await Journey.findById(journey_id);
    if (!journey) {
      throw new ValidationError('Journey not found');
    }

    // Verify journey belongs to user's vehicle
    const vehicle = await Vehicle.findById(journey.vehicle_id);
    if (!vehicle || vehicle.user_id !== userId) {
      throw new ValidationError('Journey not found or access denied');
    }

    // Get GPS path for the journey
    const gpsPath = await GpsLog.getJourneyPath(journey_id, {
      start_time: journey.entry_time,
      end_time: journey.exit_time
    });

    res.json({
      success: true,
      message: `Retrieved GPS path with ${gpsPath.length} points`,
      data: {
        journey: {
          id: journey.id,
          vehicle_id: journey.vehicle_id,
          entry_time: journey.entry_time,
          exit_time: journey.exit_time,
          distance_km: journey.distance_km,
          status: journey.status
        },
        gps_path: gpsPath,
        path_statistics: {
          total_points: gpsPath.length,
          duration_minutes: journey.exit_time && journey.entry_time 
            ? Math.round((new Date(journey.exit_time) - new Date(journey.entry_time)) / 60000)
            : null
        }
      }
    });

  } catch (error) {
    console.error('Error getting journey GPS path:', error);
    throw error;
  }
}));

/**
 * GET /api/gps/current-location/:vehicle_id
 * Get current location of a vehicle
 */
router.get('/current-location/:vehicle_id', [
  authMiddleware,
  param('vehicle_id')
    .isUUID()
    .withMessage('Vehicle ID must be a valid UUID')
], asyncErrorHandler(async (req, res) => {
  const { vehicle_id } = req.params;
  const userId = req.user.id;

  try {
    // Verify vehicle belongs to user
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle || vehicle.user_id !== userId) {
      throw new ValidationError('Vehicle not found or access denied');
    }

    // Get latest GPS position
    const currentLocation = await GpsLog.getLatestPosition(vehicle_id);

    if (!currentLocation) {
      return res.json({
        success: true,
        message: 'No GPS data found for vehicle',
        data: {
          vehicle_id,
          current_location: null
        }
      });
    }

    // Check if vehicle has an active journey
    const activeJourney = await Journey.getActiveByVehicleId(vehicle_id);

    res.json({
      success: true,
      message: 'Current location retrieved successfully',
      data: {
        vehicle: {
          id: vehicle.id,
          plate_number: vehicle.plate_number,
          vehicle_type: vehicle.vehicle_type
        },
        current_location: currentLocation,
        active_journey: activeJourney ? {
          id: activeJourney.id,
          entry_time: activeJourney.entry_time,
          zone_name: activeJourney.zone_name,
          road_name: activeJourney.road_name
        } : null,
        location_age_minutes: Math.round(
          (new Date() - new Date(currentLocation.timestamp)) / 60000
        )
      }
    });

  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
}));

/**
 * POST /api/gps/manual-position
 * Manually set GPS position (for testing purposes)
 */
router.post('/manual-position', [
  authMiddleware,
  body('vehicle_id')
    .isUUID()
    .withMessage('Vehicle ID must be a valid UUID'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('simulate_movement')
    .optional()
    .isBoolean()
    .withMessage('Simulate movement must be a boolean')
], asyncErrorHandler(async (req, res) => {
  const { vehicle_id, latitude, longitude, simulate_movement = false } = req.body;
  const userId = req.user.id;

  console.log(`🧪 Manual GPS position for vehicle ${vehicle_id}: ${latitude}, ${longitude}`);

  try {
    // Verify vehicle belongs to user
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle || vehicle.user_id !== userId) {
      throw new ValidationError('Vehicle not found or access denied');
    }

    // Log manual position
    const gpsLog = await GpsLog.logPosition({
      vehicle_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: simulate_movement ? 40 : 0, // Simulate 40 km/h movement
      accuracy: 5 // High accuracy for manual positions
    });

    // Process geofencing
    const geofencingResult = await GeofencingService.processGpsPosition({
      vehicleId: vehicle_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      userId
    });

    res.json({
      success: true,
      message: 'Manual GPS position set and processed successfully',
      data: {
        gps_log: gpsLog,
        geofencing: geofencingResult,
        simulation_note: 'This was a manually set position for testing purposes'
      }
    });

  } catch (error) {
    console.error('Error setting manual GPS position:', error);
    throw error;
  }
}));

/**
 * GET /api/gps/stats/:vehicle_id
 * Get GPS tracking statistics for a vehicle
 */
router.get('/stats/:vehicle_id', [
  authMiddleware,
  param('vehicle_id')
    .isUUID()
    .withMessage('Vehicle ID must be a valid UUID'),
  query('days')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Days must be between 1 and 90')
], asyncErrorHandler(async (req, res) => {
  const { vehicle_id } = req.params;
  const { days = 7 } = req.query;
  const userId = req.user.id;

  try {
    // Verify vehicle belongs to user
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle || vehicle.user_id !== userId) {
      throw new ValidationError('Vehicle not found or access denied');
    }

    // Get GPS statistics
    const stats = await GpsLog.getVehicleStats(vehicle_id, parseInt(days));

    res.json({
      success: true,
      message: `GPS statistics for last ${days} days`,
      data: {
        vehicle: {
          id: vehicle.id,
          plate_number: vehicle.plate_number,
          vehicle_type: vehicle.vehicle_type
        },
        period_days: parseInt(days),
        statistics: stats
      }
    });

  } catch (error) {
    console.error('Error getting GPS stats:', error);
    throw error;
  }
}));

module.exports = router;
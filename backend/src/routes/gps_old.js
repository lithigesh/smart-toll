const express = require('express');
const router = express.Router();
const GpsLog = require('../models/GpsLog');
const TollRoadZone = require('../models/TollRoadZone');
const VehicleTollHistory = require('../models/VehicleTollHistory');
const Notifications = require('../models/Notifications');
const GeofencingService = require('../services/GeofencingService');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * POST /api/gps/log
 * Log GPS position for a vehicle
 */
router.post('/log', authMiddleware, async (req, res) => {
  try {
    const { vehicle_id, latitude, longitude, speed, heading, accuracy } = req.body;
    
    // Validate required fields
    if (!vehicle_id || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vehicle_id, latitude, longitude'
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude. Must be between -90 and 90'
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid longitude. Must be between -180 and 180'
      });
    }

    // Log the GPS position
    const gpsLog = await GpsLog.logPosition({
      vehicle_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: speed ? parseFloat(speed) : null,
      heading: heading ? parseFloat(heading) : null,
      accuracy: accuracy ? parseFloat(accuracy) : null
    });

    // Check for geofencing (toll zone entry/exit) using the service
    const geofencingResult = await GeofencingService.processVehiclePosition({
      vehicleId: vehicle_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      userId: req.user.id
    });

    res.json({
      success: true,
      data: {
        gpsLog,
        geofencing: geofencingResult
      },
      message: 'GPS position logged successfully'
    });

  } catch (error) {
    console.error('Error logging GPS position:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to log GPS position'
    });
  }
});

/**
 * GET /api/gps/recent/:vehicle_id
 * Get recent GPS positions for a vehicle
 */
router.get('/recent/:vehicle_id', authMiddleware, async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { limit = 50, minutes = 60 } = req.query;

    const positions = await GpsLog.getRecentPositions(vehicle_id, {
      limit: parseInt(limit),
      minutes: parseInt(minutes)
    });

    res.json({
      success: true,
      data: positions,
      count: positions.length
    });

  } catch (error) {
    console.error('Error fetching recent GPS positions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch GPS positions'
    });
  }
});

/**
 * GET /api/gps/trail/:vehicle_id
 * Get GPS trail for a vehicle within a time range
 */
router.get('/trail/:vehicle_id', authMiddleware, async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { start_time, end_time } = req.query;

    if (!start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: start_time, end_time'
      });
    }

    const trail = await GpsLog.getGpsTrail(vehicle_id, start_time, end_time);

    res.json({
      success: true,
      data: trail,
      count: trail.length
    });

  } catch (error) {
    console.error('Error fetching GPS trail:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch GPS trail'
    });
  }
});

/**
 * GET /api/gps/latest/:vehicle_id
 * Get latest GPS position for a vehicle
 */
router.get('/latest/:vehicle_id', authMiddleware, async (req, res) => {
  try {
    const { vehicle_id } = req.params;

    const position = await GpsLog.getLatestPosition(vehicle_id);

    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'No GPS position found for this vehicle'
      });
    }

    res.json({
      success: true,
      data: position
    });

  } catch (error) {
    console.error('Error fetching latest GPS position:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch latest GPS position'
    });
  }
});

/**
 * GET /api/gps/distance/:vehicle_id
 * Calculate distance traveled by a vehicle in a time period
 */
router.get('/distance/:vehicle_id', authMiddleware, async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { start_time, end_time } = req.query;

    if (!start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: start_time, end_time'
      });
    }

    const distance = await GpsLog.calculateDistanceTraveled(vehicle_id, start_time, end_time);

    res.json({
      success: true,
      data: {
        vehicle_id,
        start_time,
        end_time,
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
 * GET /api/gps/vehicles-in-area
 * Get vehicles currently within a geographical area
 */
router.get('/vehicles-in-area', authMiddleware, async (req, res) => {
  try {
    const { north, south, east, west, max_age_minutes = 10 } = req.query;

    if (!north || !south || !east || !west) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: north, south, east, west'
      });
    }

    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };

    const vehicles = await GpsLog.getVehiclesInArea(bounds, parseInt(max_age_minutes));

    res.json({
      success: true,
      data: vehicles,
      count: vehicles.length
    });

  } catch (error) {
    console.error('Error fetching vehicles in area:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch vehicles in area'
    });
  }
});

/**
 * GET /api/gps/stats/:vehicle_id
 * Get GPS statistics for a vehicle
 */
router.get('/stats/:vehicle_id', authMiddleware, async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: start_date, end_date'
      });
    }

    const stats = await GpsLog.getVehicleGpsStats(vehicle_id, start_date, end_date);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching GPS stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch GPS statistics'
    });
  }
});

/**
 * GET /api/gps/heatmap
 * Get GPS data for generating a heat map
 */
router.get('/heatmap', authMiddleware, async (req, res) => {
  try {
    const { north, south, east, west, start_date, end_date } = req.query;

    if (!north || !south || !east || !west || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: north, south, east, west, start_date, end_date'
      });
    }

    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };

    const heatmapData = await GpsLog.getHeatMapData(bounds, start_date, end_date);

    res.json({
      success: true,
      data: heatmapData,
      count: heatmapData.length
    });

  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch heatmap data'
    });
  }
});

/**
 * GET /api/gps/nearby-zones
 * Get toll zones near a location
 */
router.get('/nearby-zones', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: latitude, longitude'
      });
    }

    const zones = await GeofencingService.getNearbyTollZones(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    );

    res.json({
      success: true,
      data: zones,
      count: zones.length
    });

  } catch (error) {
    console.error('Error fetching nearby toll zones:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch nearby toll zones'
    });
  }
});

module.exports = router;
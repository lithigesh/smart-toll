const GpsLog = require('../models/GpsLog');
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

class DistanceCalculationService {
  /**
   * Calculate distance between two GPS points using PostGIS
   * @param {Object} point1 - First GPS point
   * @param {Object} point2 - Second GPS point
   * @returns {Promise<number>} - Distance in kilometers
   */
  static async calculatePointDistance(point1, point2) {
    try {
      const { data, error } = await supabase.rpc('calculate_point_distance', {
        lat1: point1.latitude,
        lon1: point1.longitude,
        lat2: point2.latitude,
        lon2: point2.longitude
      });

      if (error) {
        console.error('Error calculating point distance:', error);
        throw error;
      }

      return data || 0;

    } catch (error) {
      console.error('Error in distance calculation:', error);
      throw error;
    }
  }

  /**
   * Calculate total distance traveled by a vehicle in a time period
   * @param {string} vehicleId - Vehicle ID
   * @param {string} startTime - Start time (ISO string)
   * @param {string} endTime - End time (ISO string)
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} - Distance calculation result
   */
  static async calculateVehicleDistance(vehicleId, startTime, endTime, options = {}) {
    try {
      const {
        maxSpeedKmh = 200,           // Max realistic speed to filter GPS errors
        minDistanceMeters = 10,       // Minimum distance between points to consider
        maxJumpKm = 5,               // Maximum distance between consecutive points
        smoothing = true             // Apply smoothing to reduce GPS noise
      } = options;

      // Get GPS trail for the time period
      const gpsTrail = await GpsLog.getGpsTrail(vehicleId, startTime, endTime);

      if (gpsTrail.length < 2) {
        return {
          totalDistance: 0,
          pointCount: gpsTrail.length,
          validSegments: 0,
          filteredPoints: 0,
          averageSpeed: 0,
          maxSpeed: 0,
          segments: []
        };
      }

      let totalDistance = 0;
      let validSegments = 0;
      let filteredPoints = 0;
      let maxSpeed = 0;
      const segments = [];
      const speeds = [];

      for (let i = 1; i < gpsTrail.length; i++) {
        const prevPoint = gpsTrail[i - 1];
        const currPoint = gpsTrail[i];

        // Calculate time difference in hours
        const timeDiff = (new Date(currPoint.logged_at) - new Date(prevPoint.logged_at)) / (1000 * 60 * 60);

        if (timeDiff <= 0) {
          filteredPoints++;
          continue; // Skip if timestamps are same or reversed
        }

        // Calculate distance using PostGIS
        const segmentDistance = await this.calculatePointDistance(prevPoint, currPoint);

        // Filter out unrealistic jumps
        if (segmentDistance > maxJumpKm) {
          filteredPoints++;
          console.log(`Filtered GPS jump: ${segmentDistance}km between points`);
          continue;
        }

        // Filter out very small movements (GPS noise)
        if (segmentDistance * 1000 < minDistanceMeters) {
          filteredPoints++;
          continue;
        }

        // Calculate speed
        const speed = segmentDistance / timeDiff;

        // Filter out unrealistic speeds
        if (speed > maxSpeedKmh) {
          filteredPoints++;
          console.log(`Filtered unrealistic speed: ${speed}km/h`);
          continue;
        }

        // Valid segment
        totalDistance += segmentDistance;
        validSegments++;
        speeds.push(speed);
        maxSpeed = Math.max(maxSpeed, speed);

        segments.push({
          from: {
            latitude: prevPoint.latitude,
            longitude: prevPoint.longitude,
            timestamp: prevPoint.logged_at
          },
          to: {
            latitude: currPoint.latitude,
            longitude: currPoint.longitude,
            timestamp: currPoint.logged_at
          },
          distance: segmentDistance,
          speed: speed,
          timeDiff: timeDiff
        });
      }

      // Apply smoothing if requested
      if (smoothing && segments.length > 2) {
        totalDistance = this.applySmoothingFilter(segments);
      }

      const averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

      return {
        totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimal places
        pointCount: gpsTrail.length,
        validSegments,
        filteredPoints,
        averageSpeed: Math.round(averageSpeed * 100) / 100,
        maxSpeed: Math.round(maxSpeed * 100) / 100,
        segments: smoothing ? [] : segments // Don't return segments if smoothing is applied
      };

    } catch (error) {
      console.error('Error calculating vehicle distance:', error);
      throw error;
    }
  }

  /**
   * Apply smoothing filter to distance calculation
   * @param {Array} segments - Array of distance segments
   * @returns {number} - Smoothed total distance
   */
  static applySmoothingFilter(segments) {
    // Simple moving average smoothing
    const windowSize = 3;
    let smoothedDistance = 0;

    for (let i = 0; i < segments.length; i++) {
      let windowSum = 0;
      let windowCount = 0;

      // Get average of surrounding segments
      for (let j = Math.max(0, i - Math.floor(windowSize / 2)); 
           j <= Math.min(segments.length - 1, i + Math.floor(windowSize / 2)); 
           j++) {
        windowSum += segments[j].distance;
        windowCount++;
      }

      const smoothedSegmentDistance = windowSum / windowCount;
      smoothedDistance += smoothedSegmentDistance;
    }

    return smoothedDistance;
  }

  /**
   * Calculate fare based on distance and rate
   * @param {number} distanceKm - Distance in kilometers
   * @param {number} ratePerKm - Rate per kilometer
   * @param {Object} options - Fare calculation options
   * @returns {Object} - Fare calculation result
   */
  static calculateFare(distanceKm, ratePerKm, options = {}) {
    const {
      minimumFare = 5,              // Minimum fare in currency units
      roundingFactor = 0.5,         // Round to nearest 0.5
      taxPercentage = 0,            // Tax percentage (if applicable)
      discountPercentage = 0        // Discount percentage (if applicable)
    } = options;

    let baseFare = distanceKm * ratePerKm;
    
    // Apply minimum fare
    baseFare = Math.max(baseFare, minimumFare);

    // Apply discount
    if (discountPercentage > 0) {
      baseFare = baseFare * (1 - discountPercentage / 100);
    }

    // Apply tax
    let finalFare = baseFare;
    let taxAmount = 0;
    if (taxPercentage > 0) {
      taxAmount = baseFare * (taxPercentage / 100);
      finalFare = baseFare + taxAmount;
    }

    // Apply rounding
    if (roundingFactor > 0) {
      finalFare = Math.round(finalFare / roundingFactor) * roundingFactor;
    }

    return {
      distance: distanceKm,
      ratePerKm,
      baseFare: Math.round(baseFare * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      finalFare: Math.round(finalFare * 100) / 100,
      discount: discountPercentage,
      tax: taxPercentage
    };
  }

  /**
   * Get distance statistics for multiple vehicles
   * @param {Array} vehicleIds - Array of vehicle IDs
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Object>} - Distance statistics
   */
  static async getFleetDistanceStats(vehicleIds, startDate, endDate) {
    try {
      const stats = {
        totalDistance: 0,
        vehicleStats: [],
        averageDistance: 0,
        maxDistance: 0,
        minDistance: Infinity
      };

      for (const vehicleId of vehicleIds) {
        const vehicleDistance = await GpsLog.calculateDistanceTraveled(vehicleId, startDate, endDate);
        
        stats.totalDistance += vehicleDistance;
        stats.vehicleStats.push({
          vehicleId,
          distance: vehicleDistance
        });

        stats.maxDistance = Math.max(stats.maxDistance, vehicleDistance);
        stats.minDistance = Math.min(stats.minDistance, vehicleDistance);
      }

      stats.averageDistance = stats.totalDistance / vehicleIds.length;
      stats.minDistance = stats.minDistance === Infinity ? 0 : stats.minDistance;

      return stats;

    } catch (error) {
      console.error('Error calculating fleet distance stats:', error);
      throw error;
    }
  }

  /**
   * Validate GPS coordinates
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {boolean} - True if coordinates are valid
   */
  static validateCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !isNaN(latitude) && !isNaN(longitude)
    );
  }

  /**
   * Calculate estimated time of arrival based on current speed and distance
   * @param {number} distanceKm - Remaining distance in kilometers
   * @param {number} currentSpeedKmh - Current speed in km/h
   * @param {number} averageSpeedKmh - Average speed for fallback
   * @returns {Object} - ETA calculation result
   */
  static calculateETA(distanceKm, currentSpeedKmh = 0, averageSpeedKmh = 50) {
    const speedToUse = currentSpeedKmh > 5 ? currentSpeedKmh : averageSpeedKmh;
    const etaHours = distanceKm / speedToUse;
    const etaMinutes = etaHours * 60;

    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + etaMinutes);

    return {
      etaTimestamp: eta.toISOString(),
      etaMinutes: Math.round(etaMinutes),
      speedUsed: speedToUse,
      remainingDistance: distanceKm
    };
  }
}

module.exports = DistanceCalculationService;
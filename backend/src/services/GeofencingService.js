const TollRoadZone = require('../models/TollRoadZone');
const VehicleTollHistory = require('../models/VehicleTollHistory');
const GpsLog = require('../models/GpsLog');
const Notifications = require('../models/Notifications');
const TollProcessingService = require('./TollProcessingService');

class GeofencingService {
  /**
   * Process vehicle position and handle toll zone entry/exit
   * @param {Object} params - Parameters
   * @param {string} params.vehicleId - Vehicle ID
   * @param {number} params.latitude - Current latitude
   * @param {number} params.longitude - Current longitude
   * @param {string} params.userId - User ID for notifications
   * @param {Object} params.vehicleInfo - Vehicle information (optional)
   * @returns {Promise<Object>} - Geofencing result
   */
  static async processVehiclePosition({ vehicleId, latitude, longitude, userId, vehicleInfo = null }) {
    try {
      const result = {
        zoneAction: null, // 'entered', 'exited', 'continuing', 'none'
        tollEntry: null,
        tollExit: null,
        notifications: [],
        warnings: []
      };

      // Check if vehicle is within any toll zone
      const currentZone = await TollRoadZone.findZoneContainingPoint(latitude, longitude);
      
      // Check if vehicle has an active toll history entry
      const activeEntry = await VehicleTollHistory.getActiveEntry(vehicleId);

      if (currentZone && !activeEntry) {
        // Vehicle entered a toll zone
        result.zoneAction = 'entered';
        result.tollEntry = await this.handleZoneEntry({
          vehicleId,
          latitude,
          longitude,
          userId,
          zone: currentZone,
          vehicleInfo
        });
        
      } else if (!currentZone && activeEntry) {
        // Vehicle exited toll zone
        result.zoneAction = 'exited';
        result.tollExit = await this.handleZoneExit({
          vehicleId,
          latitude,
          longitude,
          userId,
          activeEntry
        });
        
      } else if (currentZone && activeEntry) {
        // Vehicle is continuing within a toll zone
        result.zoneAction = 'continuing';
        
        // Check if it's the same zone or a different one
        if (currentZone.id !== activeEntry.toll_road_zone_id) {
          // Vehicle moved to a different toll zone - exit previous, enter new
          result.tollExit = await this.handleZoneExit({
            vehicleId,
            latitude,
            longitude,
            userId,
            activeEntry
          });
          
          result.tollEntry = await this.handleZoneEntry({
            vehicleId,
            latitude,
            longitude,
            userId,
            zone: currentZone,
            vehicleInfo
          });
          
          result.zoneAction = 'zone_changed';
        }
        
      } else {
        // Vehicle is not in any toll zone
        result.zoneAction = 'none';
      }

      return result;

    } catch (error) {
      console.error('Error processing vehicle position:', error);
      throw error;
    }
  }

  /**
   * Handle vehicle entering a toll zone
   * @param {Object} params - Entry parameters
   * @returns {Promise<Object>} - Entry result
   */
  static async handleZoneEntry({ vehicleId, latitude, longitude, userId, zone, vehicleInfo }) {
    try {
      // Create toll history entry
      const tollEntry = await VehicleTollHistory.createEntry({
        vehicle_id: vehicleId,
        toll_road_zone_id: zone.id,
        entry_lat: latitude,
        entry_lon: longitude
      });

      // Send toll entry notification
      const notification = await Notifications.createTollEntryNotification(userId, {
        zoneId: zone.id,
        zoneName: zone.name,
        ratePerKm: zone.rate_per_km,
        entryTime: tollEntry.entry_time,
        vehicleId: vehicleId
      });

      console.log(`🚗 Vehicle ${vehicleId} entered toll zone: ${zone.name} at ${new Date().toISOString()}`);

      return {
        tollHistoryId: tollEntry.id,
        zone: zone,
        entryTime: tollEntry.entry_time,
        notification: notification
      };

    } catch (error) {
      console.error('Error handling zone entry:', error);
      throw error;
    }
  }

  /**
   * Handle vehicle exiting a toll zone
   * @param {Object} params - Exit parameters
   * @returns {Promise<Object>} - Exit result
   */
  static async handleZoneExit({ vehicleId, latitude, longitude, userId, activeEntry }) {
    try {
      // Calculate distance traveled within the toll zone
      const distance = await GpsLog.calculateDistanceTraveled(
        vehicleId, 
        activeEntry.entry_time, 
        new Date().toISOString()
      );

      // Calculate fare
      const ratePerKm = activeEntry.toll_road_zones?.rate_per_km || 10; // fallback rate
      const fareAmount = Math.max(distance * ratePerKm, 5); // Minimum fare of ₹5

      // Complete the toll entry
      const completedEntry = await VehicleTollHistory.completeExit(activeEntry.id, {
        exit_lat: latitude,
        exit_lon: longitude,
        distance_km: distance,
        fare_amount: fareAmount
      });

      // Process payment using TollProcessingService
      const paymentResult = await TollProcessingService.processTollCharge({
        tollHistoryId: completedEntry.id,
        userId,
        vehicleId,
        distanceKm: distance,
        ratePerKm,
        zoneInfo: {
          id: activeEntry.toll_road_zone_id,
          name: activeEntry.toll_road_zones?.name || 'Unknown Zone',
          minimum_fare: 5,
          tax_percentage: 0
        }
      });

      console.log(`🚗 Vehicle ${vehicleId} exited toll zone: ${activeEntry.toll_road_zones?.name}, Distance: ${distance}km, Fare: ₹${fareAmount}`);

      return {
        tollHistoryId: completedEntry.id,
        distance: distance,
        fareAmount: fareAmount,
        paymentResult: paymentResult,
        exitTime: completedEntry.exit_time
      };

    } catch (error) {
      console.error('Error handling zone exit:', error);
      throw error;
    }
  }

  /**
   * Get active toll zones near a location
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Promise<Array>} - Array of nearby toll zones
   */
  static async getNearbyTollZones(latitude, longitude, radiusKm = 5) {
    try {
      // Calculate bounding box for the search area
      const latDelta = radiusKm / 111; // Approximate degrees per km for latitude
      const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180)); // Adjust for longitude

      const bounds = {
        north: latitude + latDelta,
        south: latitude - latDelta,
        east: longitude + lonDelta,
        west: longitude - lonDelta
      };

      return await TollRoadZone.getZonesInBounds(bounds);

    } catch (error) {
      console.error('Error getting nearby toll zones:', error);
      throw error;
    }
  }

  /**
   * Check if a vehicle has been in a toll zone too long (for cleanup)
   * @param {string} vehicleId - Vehicle ID
   * @param {number} maxHours - Maximum hours to stay in a zone
   * @returns {Promise<Object|null>} - Stale entry if found
   */
  static async checkStaleEntry(vehicleId, maxHours = 24) {
    try {
      const activeEntry = await VehicleTollHistory.getActiveEntry(vehicleId);
      
      if (!activeEntry) {
        return null;
      }

      const entryTime = new Date(activeEntry.entry_time);
      const now = new Date();
      const hoursInZone = (now - entryTime) / (1000 * 60 * 60);

      if (hoursInZone > maxHours) {
        return {
          ...activeEntry,
          hoursInZone: Math.round(hoursInZone)
        };
      }

      return null;

    } catch (error) {
      console.error('Error checking stale entry:', error);
      throw error;
    }
  }

  /**
   * Force exit a vehicle from a toll zone (for cleanup/admin purposes)
   * @param {string} tollHistoryId - Toll history ID
   * @param {string} reason - Reason for forced exit
   * @returns {Promise<Object>} - Exit result
   */
  static async forceZoneExit(tollHistoryId, reason = 'System cleanup') {
    try {
      return await VehicleTollHistory.cancelEntry(tollHistoryId, reason);
    } catch (error) {
      console.error('Error forcing zone exit:', error);
      throw error;
    }
  }

  /**
   * Get geofencing statistics for monitoring
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} - Geofencing statistics
   */
  static async getGeofencingStats(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      // This would be implemented based on your specific analytics needs
      // For now, return basic structure
      return {
        totalEntries: 0,
        totalExits: 0,
        activeVehicles: 0,
        avgTimeInZone: 0,
        totalRevenue: 0
      };

    } catch (error) {
      console.error('Error getting geofencing stats:', error);
      throw error;
    }
  }
}

module.exports = GeofencingService;
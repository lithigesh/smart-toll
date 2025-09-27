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

class Journey {
  /**
   * Create a new journey when vehicle enters toll zone
   * @param {Object} journeyData - Journey data
   * @param {string} journeyData.vehicle_id - Vehicle ID
   * @param {string} journeyData.toll_road_id - Toll road ID
   * @param {string} journeyData.zone_id - Zone ID
   * @param {number} journeyData.entry_lat - Entry latitude
   * @param {number} journeyData.entry_lon - Entry longitude
   * @returns {Promise<Object>} - Created journey
   */
  static async create(journeyData) {
    try {
      // Generate new UUID for the journey
      const journeyId = require('crypto').randomUUID();
      
      const { data, error } = await supabase
        .from('journeys')
        .insert({
          id: journeyId,
          vehicle_id: journeyData.vehicle_id,
          toll_road_id: journeyData.toll_road_id,
          zone_id: journeyData.zone_id,
          entry_point: `POINT(${journeyData.entry_lon} ${journeyData.entry_lat})`,
          entry_time: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating journey:', error);
        throw error;
      }
      
      console.log('Journey created:', data);
      return data;
    } catch (err) {
      console.error('Error creating journey:', err);
      throw err;
    }
  }

  /**
   * Complete journey and calculate distance/fare with comprehensive pricing
   * @param {string} journeyId - Journey ID
   * @param {Object} exitData - Exit data
   * @param {number} exitData.exit_lat - Exit latitude
   * @param {number} exitData.exit_lon - Exit longitude
   * @param {boolean} exitData.use_path_distance - Use GPS path distance vs straight-line
   * @returns {Promise<Object>} - Completed journey with fare calculation
   */
  static async completeExit(journeyId, exitData) {
    try {
      console.log(`🏁 Starting comprehensive fare calculation for journey ${journeyId}`);
      
      // First get the journey with all related data
      const { data: journey, error: journeyError } = await supabase
        .from('journeys')
        .select(`
          *,
          toll_roads (
            id,
            name, 
            rate_per_km,
            minimum_fare,
            zone_id
          ),
          vehicles (
            id,
            vehicle_type,
            plate_number,
            user_id
          )
        `)
        .eq('id', journeyId)
        .eq('status', 'active')
        .single();
      
      if (journeyError) {
        console.error('Error fetching journey for exit:', journeyError);
        throw journeyError;
      }
      
      if (!journey) {
        throw new Error(`Active journey ${journeyId} not found`);
      }
      
      console.log(`📊 Processing journey for vehicle ${journey.vehicles.plate_number} (${journey.vehicles.vehicle_type})`);
      
      // Calculate comprehensive distance and fare
      const fareCalculation = await this.calculateComprehensiveFare({
        journey,
        exitData,
        vehicleType: journey.vehicles.vehicle_type
      });
      
      // Update the journey with exit info and calculated values
      const { data: updatedJourney, error: updateError } = await supabase
        .from('journeys')
        .update({
          exit_point: `POINT(${exitData.exit_lon} ${exitData.exit_lat})`,
          exit_time: new Date().toISOString(),
          total_distance_km: fareCalculation.distance_km,
          calculated_fare: fareCalculation.total_fare,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', journeyId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error completing journey exit:', updateError);
        throw updateError;
      }
      
      console.log(`💰 Comprehensive fare calculated: ${JSON.stringify(fareCalculation, null, 2)}`);
      
      // Return the result with all calculated values
      return {
        ...updatedJourney,
        distance_km: fareCalculation.distance_km,
        fare_amount: fareCalculation.total_fare,
        fare_breakdown: fareCalculation,
        exit_time: updatedJourney.exit_time,
        journey_duration_minutes: fareCalculation.duration_minutes
      };
      
    } catch (err) {
      console.error('Error in comprehensive fare calculation:', err);
      throw err;
    }
  }

  /**
   * Calculate simplified fare with basic pricing factors
   * @param {Object} params - Calculation parameters
   * @param {Object} params.journey - Journey data with toll road info
   * @param {Object} params.exitData - Exit coordinates and data
   * @param {string} params.vehicleType - Vehicle type (car, truck, motorcycle, etc.)
   * @returns {Promise<Object>} - Simplified fare calculation
   */
  static async calculateComprehensiveFare({ journey, exitData, vehicleType }) {
    const entryTime = new Date(journey.entry_time);
    const exitTime = new Date();
    const durationMinutes = Math.round((exitTime - entryTime) / 60000);
    
    console.log(`⏱️ Journey duration: ${durationMinutes} minutes`);
    
    // 1. DISTANCE CALCULATION
    let distance_km;
    if (exitData.use_path_distance) {
      // Use GPS path tracking for more accurate distance
      distance_km = await this.calculatePathDistance(journey.id, journey.entry_time, exitTime.toISOString());
    } else {
      // Use haversine formula for straight-line distance
      distance_km = this.calculateDistance(
        journey.entry_point.coordinates[1], // lat from entry point
        journey.entry_point.coordinates[0], // lon from entry point  
        exitData.exit_lat,
        exitData.exit_lon
      );
    }
    
    console.log(`📏 Distance calculated: ${distance_km} km (method: ${exitData.use_path_distance ? 'GPS path' : 'straight-line'})`);
    
    // 2. BASE TOLL RATES
    const tollRoad = journey.toll_roads;
    const baseRatePerKm = tollRoad?.rate_per_km || 8; // Default ₹8/km
    const minimumFare = tollRoad?.minimum_fare || 10;
    
    // 3. VEHICLE TYPE MULTIPLIERS (simplified)
    const vehicleMultipliers = {
      'motorcycle': 0.5,     // 50% discount
      'car': 1.0,           // Base rate
      'suv': 1.2,           // 20% premium
      'van': 1.5,           // 50% premium
      'truck': 2.0,         // 100% premium (commercial)
      'bus': 2.5,           // 150% premium (commercial + size)
      'trailer': 3.0        // 200% premium (heavy commercial)
    };
    
    const vehicleMultiplier = vehicleMultipliers[vehicleType.toLowerCase()] || 1.0;
    console.log(`🚗 Vehicle type: ${vehicleType}, multiplier: ${vehicleMultiplier}x`);
    
    // 7. SERVICE FEES (simplified)
    const serviceFee = Math.max(distance_km * 0.1, 1.0); // Min ₹1 service fee
    
    // 8. CALCULATE STEP BY STEP (simplified)
    const baseFare = minimumFare;
    const distanceCharge = distance_km * baseRatePerKm;
    const vehicleAdjustedFare = distanceCharge * vehicleMultiplier;
    const totalWithService = vehicleAdjustedFare + serviceFee;
    
    // Final fare with minimum fare check
    const finalFare = Math.max(totalWithService, baseFare);
    
    // Round to 2 decimal places
    const roundedFare = Math.round(finalFare * 100) / 100;
    
    console.log(`💰 Distance calculated: ${distance_km} km, Fare: ₹${roundedFare}`);
    
    return {
      // Distance and time
      distance_km: Math.round(distance_km * 100) / 100,
      duration_minutes: durationMinutes,
      
      // Base calculations
      base_fare: Math.round(baseFare * 100) / 100,
      distance_charge: Math.round(distanceCharge * 100) / 100,
      
      // Vehicle adjustment
      vehicle_type: vehicleType,
      vehicle_multiplier: vehicleMultiplier,
      
      // Service fee
      service_fee: Math.round(serviceFee * 100) / 100,
      
      // Totals (simplified)
      total_before_discounts: Math.round(totalWithService * 100) / 100,
      discount_type: 'none',
      discount_amount: 0,
      total_fare: roundedFare,
      
      // Metadata
      calculation_method: exitData.use_path_distance ? 'GPS_PATH' : 'STRAIGHT_LINE',
      toll_road_name: tollRoad?.name || 'Unknown Road',
      base_rate_per_km: baseRatePerKm
    };
  }

  /**
   * Calculate path distance using GPS logs (if available)
   * @param {string} journeyId - Journey ID
   * @param {string} startTime - Journey start time
   * @param {string} endTime - Journey end time  
   * @returns {Promise<number>} - Distance in kilometers
   */
  static async calculatePathDistance(journeyId, startTime, endTime) {
    try {
      // Get GPS logs for the journey period
      const { data: gpsLogs, error } = await supabase
        .from('gps_logs')
        .select('latitude, longitude, logged_at')
        .gte('logged_at', startTime)
        .lte('logged_at', endTime)
        .order('logged_at', { ascending: true });
      
      if (error || !gpsLogs || gpsLogs.length < 2) {
        console.log('⚠️ Insufficient GPS data for path calculation, using straight-line');
        return null; // Fall back to straight-line calculation
      }
      
      let totalDistance = 0;
      for (let i = 1; i < gpsLogs.length; i++) {
        const prev = gpsLogs[i - 1];
        const curr = gpsLogs[i];
        const segmentDistance = this.calculateDistance(
          prev.latitude, prev.longitude,
          curr.latitude, curr.longitude
        );
        totalDistance += segmentDistance;
      }
      
      console.log(`📍 Path distance from ${gpsLogs.length} GPS points: ${totalDistance} km`);
      return totalDistance;
      
    } catch (error) {
      console.error('Error calculating path distance:', error);
      return null; // Fall back to straight-line
    }
  }

  /*
   * Calculate congestion-based pricing (DISABLED - simplified pricing)
   * @param {string} zoneId - Toll zone ID
   * @param {Date} exitTime - Exit time
   * @returns {Promise<number>} - Congestion charge amount
   */
  /*
  static async calculateCongestionCharge(zoneId, exitTime) {
    try {
      // Count active journeys in the same zone (simple congestion indicator)
      const { data: activeJourneys, error } = await supabase
        .from('journeys')
        .select('id')
        .eq('zone_id', zoneId)
        .eq('status', 'active');
      
      if (error) {
        console.log('⚠️ Could not calculate congestion, using default');
        return 2.0; // Default congestion charge
      }
      
      const activeCount = activeJourneys?.length || 0;
      let congestionCharge = 0;
      
      if (activeCount > 10) {
        congestionCharge = 5.0; // High congestion
      } else if (activeCount > 5) {
        congestionCharge = 2.5; // Medium congestion
      } else {
        congestionCharge = 0.5; // Low/no congestion
      }
      
      console.log(`🚦 Congestion level: ${activeCount} active journeys, charge: ₹${congestionCharge}`);
      return congestionCharge;
      
    } catch (error) {
      console.error('Error calculating congestion:', error);
      return 1.0; // Default charge
    }
  }
  */

  /*
   * Calculate environmental fee (DISABLED - simplified pricing)
   * @param {string} vehicleType - Vehicle type
   * @param {number} distanceKm - Distance traveled
   * @returns {number} - Environmental fee
   */
  /*
  static calculateEnvironmentalFee(vehicleType, distanceKm) {
    const environmentalRates = {
      'motorcycle': 0.05,   // Very low emissions
      'car': 0.1,          // Standard emissions
      'suv': 0.15,         // Higher emissions
      'van': 0.2,          // Commercial emissions
      'truck': 0.5,        // High emissions
      'bus': 0.3,          // Public transport (reduced rate)
      'trailer': 0.7       // Highest emissions
    };
    
    const rate = environmentalRates[vehicleType.toLowerCase()] || 0.1;
    const fee = distanceKm * rate;
    
    console.log(`🌱 Environmental fee: ${vehicleType} @ ₹${rate}/km = ₹${fee.toFixed(2)}`);
    return fee;
  }
  */

  /*
   * Calculate user discounts (DISABLED - simplified pricing)
   * @param {string} userId - User ID
   * @param {number} fareAmount - Fare amount before discounts
   * @returns {Promise<Object>} - Discount information
   */
  /*
  static async calculateDiscounts(userId, fareAmount) {
    try {
      // Get user's journey count in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentJourneys, error } = await supabase
        .from('journeys')
        .select('id')
        .eq('vehicle_id', userId) // Note: This should be filtered by user's vehicles
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'completed');
      
      if (error) {
        console.log('⚠️ Could not calculate discounts');
        return { type: 'none', discount_amount: 0 };
      }
      
      const journeyCount = recentJourneys?.length || 0;
      let discountType = 'none';
      let discountPercentage = 0;
      
      if (journeyCount >= 20) {
        discountType = 'frequent_user';
        discountPercentage = 0.15; // 15% discount for frequent users
      } else if (journeyCount >= 10) {
        discountType = 'regular_user';
        discountPercentage = 0.10; // 10% discount for regular users
      } else if (journeyCount >= 5) {
        discountType = 'occasional_user';
        discountPercentage = 0.05; // 5% discount for occasional users
      }
      
      const discountAmount = fareAmount * discountPercentage;
      
      if (discountAmount > 0) {
        console.log(`🎁 Discount applied: ${discountType} (${journeyCount} journeys) = ${discountPercentage * 100}% off`);
      }
      
      return {
        type: discountType,
        discount_amount: discountAmount,
        qualifying_journeys: journeyCount
      };
      
    } catch (error) {
      console.error('Error calculating discounts:', error);
      return { type: 'none', discount_amount: 0 };
    }
  }
  */
  
  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Start latitude
   * @param {number} lon1 - Start longitude  
   * @param {number} lat2 - End latitude
   * @param {number} lon2 - End longitude
   * @returns {number} - Distance in kilometers
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get active journey for a vehicle (if any)
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<Object|null>} - Active journey or null
   */
  static async getActiveByVehicleId(vehicleId) {
    const { data, error } = await supabase
      .from('journeys')
      .select(`
        *,
        toll_roads!inner(
          id,
          name,
          rate_per_km,
          minimum_fare,
          zone_id,
          toll_road_zones!inner(
            id,
            name,
            zone_polygon
          )
        )
      `)
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
      .order('entry_time', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching active journey:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get journey by ID
   * @param {string} journeyId - Journey ID
   * @returns {Promise<Object|null>} - Journey or null
   */
  static async getById(journeyId) {
    const { data, error } = await supabase
      .from('journeys')
      .select(`
        *,
        vehicles!inner(
          id,
          plate_number,
          vehicle_type,
          user_id,
          users!inner(
            id,
            name,
            email
          )
        ),
        toll_roads!inner(
          id,
          name,
          rate_per_km,
          minimum_fare,
          toll_road_zones!inner(
            id,
            name
          )
        )
      `)
      .eq('id', journeyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching journey:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get recent journeys for a vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of journeys to return
   * @param {string} options.status - Filter by status (optional)
   * @returns {Promise<Array>} - Array of journeys
   */
  static async getByVehicleId(vehicleId, options = {}) {
    const { limit = 20, status } = options;
    
    let query = supabase
      .from('journeys')
      .select(`
        *,
        toll_roads!inner(
          id,
          name,
          rate_per_km,
          minimum_fare,
          toll_road_zones!inner(
            id,
            name
          )
        )
      `)
      .eq('vehicle_id', vehicleId)
      .order('entry_time', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicle journeys:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get journeys for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of journeys
   */
  static async getByUserId(userId, options = {}) {
    const { limit = 50, status, startDate, endDate } = options;
    
    let query = supabase
      .from('journeys')
      .select(`
        *,
        vehicles!inner(
          id,
          plate_number,
          vehicle_type
        ),
        toll_roads!inner(
          id,
          name,
          rate_per_km,
          minimum_fare,
          toll_road_zones!inner(
            id,
            name
          )
        )
      `)
      .eq('vehicles.user_id', userId)
      .order('entry_time', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('entry_time', startDate);
    }

    if (endDate) {
      query = query.lte('entry_time', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user journeys:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Mark journey as settled (toll paid)
   * @param {string} journeyId - Journey ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} - Updated journey
   */
  static async markAsSettled(journeyId, transactionId) {
    const { data, error } = await supabase
      .from('journeys')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', journeyId)
      .select()
      .single();

    if (error) {
      console.error('Error marking journey as settled:', error);
      throw error;
    }

    // Also update the transaction with journey reference
    await supabase
      .from('transactions')
      .update({
        journey_id: journeyId,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    return data;
  }

  /**
   * Cancel journey
   * @param {string} journeyId - Journey ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} - Cancelled journey
   */
  static async cancel(journeyId, reason = 'Cancelled') {
    const { data, error } = await supabase
      .from('journeys')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', journeyId)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling journey:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get pending toll journeys for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of journeys with calculated fares but unpaid
   */
  static async getPendingTollsByUserId(userId) {
    const { data, error } = await supabase
      .from('journeys')
      .select(`
        *,
        vehicles!inner(
          id,
          plate_number,
          vehicle_type
        ),
        toll_roads!inner(
          id,
          name,
          minimum_fare,
          toll_road_zones!inner(
            id,
            name
          )
        )
      `)
      .eq('vehicles.user_id', userId)
      .eq('status', 'completed')
      .not('calculated_fare', 'is', null)
      .is('transactions.journey_id', null) // No payment transaction exists
      .order('exit_time', { ascending: false });

    if (error) {
      console.error('Error fetching pending toll journeys:', error);
      throw error;
    }

    return data || [];
  }
}

module.exports = Journey;
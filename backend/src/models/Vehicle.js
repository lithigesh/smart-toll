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

class Vehicle {
  static async create({ user_id, vehicle_number, vehicle_type, device_id }) {
    try {
      // Validate required fields
      if (!device_id || device_id.trim() === '') {
        throw new Error('Device ID is required for ESP32 vehicle registration');
      }

      // Validate vehicle type exists in vehicle_types table
      const { data: typeData, error: typeError } = await supabase
        .from('vehicle_types')
        .select('type_name')
        .eq('type_name', vehicle_type)
        .single();

      if (typeError) {
        throw new Error(`Invalid vehicle type: ${vehicle_type}`);
      }

      const vehicle = {
        user_id,
        vehicle_number: vehicle_number.toUpperCase(),
        vehicle_type,
        device_id: device_id.trim(),
        is_active: true
      };

      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicle)
        .select()
        .single();

      if (error) {
        console.error('Error creating vehicle:', error);
        if (error.code === '23505') {
          if (error.message.includes('device_id')) {
            throw new Error('Device ID is already registered with another vehicle');
          }
          if (error.message.includes('vehicle_number')) {
            throw new Error('Vehicle number is already registered');
          }
        }
        throw new Error(`Failed to create vehicle: ${error.message}`);
      }

      console.log(`✅ Vehicle created: ${data.vehicle_number} with ESP32 device ${data.device_id}`);
      return data;
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  static async findByDeviceId(deviceId) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('device_id', deviceId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding vehicle by device ID:', error);
        throw new Error(`Failed to find vehicle: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Error in findByDeviceId:', error);
      throw error;
    }
  }

  static async findByVehicleNumber(vehicleNumber) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          users:user_id (
            name,
            email
          )
        `)
        .eq('vehicle_number', vehicleNumber.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching vehicle by number:', error);
        throw new Error(`Failed to fetch vehicle: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return {
        ...data,
        owner_name: data.users?.name,
        owner_email: data.users?.email,
        users: undefined
      };
    } catch (error) {
      console.error('Error in findByVehicleNumber:', error);
      throw error;
    }
  }

  static async findById(vehicleId) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          users:user_id (
            name,
            email
          )
        `)
        .eq('id', vehicleId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching vehicle by ID:', error);
        throw new Error(`Failed to fetch vehicle: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return {
        ...data,
        owner_name: data.users?.name,
        owner_email: data.users?.email,
        users: undefined
      };
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user vehicles:', error);
        throw new Error(`Failed to fetch user vehicles: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in findByUserId:', error);
      throw error;
    }
  }

  static async update(vehicleId, userId, updates) {
    try {
      const allowedFields = ['vehicle_number', 'vehicle_type', 'device_id'];
      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Validate vehicle type if provided
      if (updates.vehicle_type) {
        const { data: typeData, error: typeError } = await supabase
          .from('vehicle_types')
          .select('type_name')
          .eq('type_name', updates.vehicle_type)
          .single();

        if (typeError) {
          throw new Error(`Invalid vehicle type: ${updates.vehicle_type}`);
        }
      }

      // If updating vehicle_number, normalize it
      if (updates.vehicle_number) {
        updates.vehicle_number = updates.vehicle_number.toUpperCase();
      }

      const updateData = {};
      updateFields.forEach(field => {
        updateData[field] = updates[field];
      });
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicleId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .select()
        .single();

      if (error) {
        console.error('Error updating vehicle:', error);
        if (error.code === '23505') {
          if (error.message.includes('device_id')) {
            throw new Error('Device ID is already registered with another vehicle');
          }
          if (error.message.includes('vehicle_number')) {
            throw new Error('Vehicle number is already registered');
          }
        }
        throw new Error(`Failed to update vehicle: ${error.message}`);
      }

      if (!data) {
        throw new Error('Vehicle not found or access denied');
      }

      console.log(`✅ Vehicle updated: ${data.vehicle_number}`);
      return data;
      
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  static async delete(vehicleId, userId) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update({ is_active: false })
        .eq('id', vehicleId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error deactivating vehicle:', error);
        throw new Error(`Failed to delete vehicle: ${error.message}`);
      }

      console.log(`✅ Vehicle deactivated: ${vehicleId}`);
      return data && data.length > 0;
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }


}

module.exports = Vehicle;
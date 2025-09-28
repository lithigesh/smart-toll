const Vehicle = require('../models/Vehicle');
const { asyncErrorHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');

/**
 * Get user's vehicles
 * GET /api/vehicles/user
 */
const getUserVehicles = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;

  console.log(`Fetching vehicles for user ${userId}`);

  const vehicles = await Vehicle.findByUserId(userId);

  console.log(`Found ${vehicles.length} vehicles for user ${userId}`);

  res.json({
    success: true,
    vehicles,
    count: vehicles.length
  });
});

/**
 * Get vehicle by ID
 * GET /api/vehicles/:id
 */
const getVehicleById = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const vehicle = await Vehicle.findById(id);

  if (!vehicle || vehicle.user_id !== userId) {
    throw new NotFoundError('Vehicle not found');
  }

  res.json({
    success: true,
    vehicle
  });
});

/**
 * Add new vehicle
 * POST /api/vehicles
 */
const addVehicle = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Map frontend fields to model fields
  const vehicleData = {
    user_id: userId,
    plate_number: req.body.license_plate,
    vehicle_type: req.body.vehicle_type || 'car',
    model: req.body.model ? `${req.body.make} ${req.body.model}`.trim() : req.body.make,
    device_id: req.body.device_id || `QR-${Math.random().toString(36).substr(2, 10).toUpperCase()}`
  };

  console.log('Adding vehicle:', vehicleData);

  // Check if license plate already exists
  const existingVehicle = await Vehicle.findByPlateNumber(vehicleData.plate_number);
  if (existingVehicle) {
    throw new ValidationError('A vehicle with this license plate already exists');
  }

  const vehicle = await Vehicle.create(vehicleData);

  console.log('Vehicle added successfully:', vehicle);

  res.status(201).json({
    success: true,
    message: 'Vehicle added successfully',
    vehicle
  });
});

/**
 * Update vehicle
 * PUT /api/vehicles/:id
 */
const updateVehicle = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updateData = req.body;

  console.log(`Updating vehicle ${id} for user ${userId}:`, updateData);

  // Check if vehicle exists and belongs to user
  const existingVehicle = await Vehicle.findById(id);
  if (!existingVehicle || existingVehicle.user_id !== userId) {
    throw new NotFoundError('Vehicle not found');
  }

  // Map frontend fields to model fields
  const mappedUpdates = {};
  if (updateData.license_plate) mappedUpdates.plate_number = updateData.license_plate;
  if (updateData.vehicle_type) mappedUpdates.vehicle_type = updateData.vehicle_type;
  if (updateData.model || updateData.make) {
    mappedUpdates.model = updateData.model ? `${updateData.make || ''} ${updateData.model}`.trim() : updateData.make;
  }
  if (updateData.device_id) mappedUpdates.device_id = updateData.device_id;

  // Check if license plate already exists for another vehicle
  if (mappedUpdates.plate_number && mappedUpdates.plate_number !== existingVehicle.plate_number) {
    const duplicateVehicle = await Vehicle.findByPlateNumber(mappedUpdates.plate_number);
    if (duplicateVehicle && duplicateVehicle.id !== parseInt(id)) {
      throw new ValidationError('A vehicle with this license plate already exists');
    }
  }

  const vehicle = await Vehicle.update(id, userId, mappedUpdates);

  console.log('Vehicle updated successfully:', vehicle);

  res.json({
    success: true,
    message: 'Vehicle updated successfully',
    vehicle
  });
});

/**
 * Delete vehicle
 * DELETE /api/vehicles/:id
 */
const deleteVehicle = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  console.log(`Deleting vehicle ${id} for user ${userId}`);

  // Check if vehicle exists and belongs to user
  const existingVehicle = await Vehicle.findById(id);
  if (!existingVehicle || existingVehicle.user_id !== userId) {
    throw new NotFoundError('Vehicle not found');
  }

  await Vehicle.delete(id, userId);

  console.log('Vehicle deleted successfully');

  res.json({
    success: true,
    message: 'Vehicle deleted successfully'
  });
});

module.exports = {
  getUserVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle
};
const Vehicle = require('../models/Vehicle');
const { asyncErrorHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');

const getUserVehicles = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  console.log(`Fetching vehicles for user ${userId}`);
  const vehicles = await Vehicle.findByUserId(userId);
  console.log(`Found ${vehicles.length} vehicles for user ${userId}`);
  res.json({
    success: true,
    vehicles
  });
});

const getVehicleById = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  console.log(`Fetching vehicle ${id} for user ${userId}`);
  const vehicle = await Vehicle.findById(id);
  if (!vehicle) {
    throw new NotFoundError('Vehicle not found');
  }
  if (vehicle.user_id !== userId) {
    throw new NotFoundError('Vehicle not found');
  }
  console.log(`Vehicle ${id} found:`, vehicle);
  res.json({
    success: true,
    vehicle
  });
});

const addVehicle = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const vehicleData = {
    user_id: userId,
    vehicle_number: req.body.license_plate,
    vehicle_type: req.body.vehicle_type || 'car',
    model: req.body.model ? `${req.body.make} ${req.body.model}`.trim() : req.body.make,
    device_id: req.body.device_id || `QR-${Math.random().toString(36).substr(2, 10).toUpperCase()}`
  };

  console.log('Adding vehicle:', vehicleData);
  const existingVehicle = await Vehicle.findByVehicleNumber(vehicleData.vehicle_number);
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

const updateVehicle = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updateData = req.body;
  console.log(`Updating vehicle ${id} for user ${userId}:`, updateData);
  const existingVehicle = await Vehicle.findById(id);
  if (!existingVehicle || existingVehicle.user_id !== userId) {
    throw new NotFoundError('Vehicle not found');
  }
  const mappedUpdates = {};
  if (updateData.license_plate) mappedUpdates.vehicle_number = updateData.license_plate;
  if (updateData.vehicle_type) mappedUpdates.vehicle_type = updateData.vehicle_type;
  if (updateData.model || updateData.make) {
    mappedUpdates.model = updateData.model ? `${updateData.make || ''} ${updateData.model}`.trim() : updateData.make;
  }
  if (updateData.device_id) mappedUpdates.device_id = updateData.device_id;
  if (mappedUpdates.vehicle_number && mappedUpdates.vehicle_number !== existingVehicle.vehicle_number) {
    const duplicateVehicle = await Vehicle.findByVehicleNumber(mappedUpdates.vehicle_number);
    if (duplicateVehicle && duplicateVehicle.id !== parseInt(id)) {
      throw new ValidationError('A vehicle with this license plate already exists');
    }
  }
  const updatedVehicle = await Vehicle.update(id, userId, mappedUpdates);
  console.log(`Vehicle ${id} updated successfully:`, updatedVehicle);
  res.json({
    success: true,
    message: 'Vehicle updated successfully',
    vehicle: updatedVehicle
  });
});

const deleteVehicle = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  console.log(`Deleting vehicle ${id} for user ${userId}`);
  const existingVehicle = await Vehicle.findById(id);
  if (!existingVehicle || existingVehicle.user_id !== userId) {
    throw new NotFoundError('Vehicle not found');
  }
  const deleted = await Vehicle.delete(id, userId);
  if (!deleted) {
    throw new NotFoundError('Vehicle not found or could not be deleted');
  }
  console.log(`Vehicle ${id} deleted successfully`);
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

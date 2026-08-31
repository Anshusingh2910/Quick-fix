const Vehicle = require("../model/vehicleModel");
const ApiError = require("../utilities/ApiError");
const Notification = require("../model/notificationModel");
const { deleteFromCloudinary } = require("../config/cloudinary")
const { createNotification } = require("../middleware/authmiddleware");

const addVehicle = async (req, res, next) => {
    try {
        const {
            vehicleType,
            fuelType,
            company,
            model,
            variant,
            year,
            registrationNumber,
        } = req.body;
        const vehicleNumber = registrationNumber?.trim().toUpperCase();
        if (!vehicleNumber) {
            throw new ApiError(400, "Registration number is required.");
        }

        const existingVehicle = await Vehicle.findOne({
            registrationNumber: vehicleNumber,
        });

        if (existingVehicle) {
            throw new ApiError(400, "Vehicle already exists.");
        }

        const vehicle = await Vehicle.create({
            user: req.user._id,
            vehicleType,
            fuelType,
            company: company.trim(),
            model: model.trim(),
            variant: variant,
            year: year,
            registrationNumber: vehicleNumber,

        });
        await createNotification({
            user: req.user._id,
            title: "Vehicle Added",
            message: `${vehicle.company} ${vehicle.model} has been added successfully.`,
            type: "vehicle",
        });
        return res.status(201).json({
            status: true,
            message: "Vehicle added successfully.",
            data: {
                _id: vehicle._id,
                vehicleType: vehicle.vehicleType,
                fuelType: vehicle.fuelType,
                brand: vehicle.brand,
                model: vehicle.model,
                variant: vehicle.variant,
                year: vehicle.year,
                registrationNumber: vehicle.registrationNumber,
                createdAt: vehicle.createdAt,
            },
        });

    } catch (err) {
        next(err);
    }
};
const getMyVehicles = async (req, res, next) => {
    try {

        const vehicles = await Vehicle.find({
            user: req.user._id,
        }).sort({
            createdAt: -1,
        });

        if (vehicles.length === 0) {
            throw new ApiError(404, "No vehicles found.");
        }

        return res.status(200).json({
            status: true,
            message: "Vehicles fetched successfully.",
            totalVehicles: vehicles.length,
            data: vehicles,
        });

    } catch (err) {
        next(err);
    }
};
const getVehicleById = async (req, res, next) => {
    try {

        const { vehicleId } = req.params;

        const vehicle = await Vehicle.findOne({
            _id: vehicleId,
            user: req.user._id,
        });

        if (!vehicle) {
            throw new ApiError(404, "Vehicle not found.");
        }

        return res.status(200).json({
            status: true,
            message: "Vehicle fetched successfully.",
            data: vehicle,
        });

    } catch (err) {
        next(err);
    }
};
const updateVehicle = async (req, res, next) => {
    try {

        const { vehicleId } = req.params;

        const vehicle = await Vehicle.findOne({
            _id: vehicleId,
            user: req.user._id,
        });

        if (!vehicle) {
            throw new ApiError(404, "Vehicle not found.");
        }

        const {
            vehicleType,
            fuelType,
            brand,
            model,
            year,
        } = req.body;

        if (vehicleType)
            vehicle.vehicleType = vehicleType;

        if (fuelType)
            vehicle.fuelType = fuelType;

        if (brand)
            vehicle.brand = brand.trim();

        if (model)
            vehicle.model = model.trim();

        if (year)
            vehicle.year = Number(year);

        if (req.file) {

            vehicle.image = {
                public_id: req.file.filename,
                url: req.file.path,
            };

        }

        await vehicle.save();

        return res.status(200).json({
            status: true,
            message: "Vehicle updated successfully.",
            data: vehicle,
        });

    } catch (err) {
        next(err);
    }
};

const deleteVehicle = async (req, res, next) => {
    try {
        const { vehicleId } = req.params;
        const vehicle = await Vehicle.findOne({
            _id: vehicleId,
            user: req.user._id,
        });

        if (!vehicle) {
            throw new ApiError(404, "Vehicle not found.");
        }

        if (vehicle.image?.public_id) {
            await deleteFromCloudinary(
                vehicle.image.public_id
            );
        }
        await vehicle.deleteOne();
        return res.status(200).json({
            status: true,
            message: "Vehicle deleted successfully.",
        });
    } catch (err) {

        next(err);

    }
};

module.exports = {
    addVehicle,
    getMyVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
};
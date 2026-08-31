const User = require("../model/userModel");
const Vehicle = require("../model/vehicleModel");
const Booking = require("../model/bookingModel");

const ApiError = require("../utilities/ApiError");

const {
    chatWithAI,
} = require("../middleware/AImiddleware");

const chat = async (req, res, next) => {
    try {
        // 1. Message validate
        const message = req.body?.message?.trim();

        if (!message) {
            throw new ApiError(
                400,
                "Message is required."
            );
        }

        // 2. Logged-in user
        const user = await User.findById(req.user._id)
            .select("-password -refreshToken");

        if (!user) {
            throw new ApiError(
                404,
                "User not found."
            );
        }

        // 3. User vehicles
        const vehicles = await Vehicle.find({
            user: req.user._id,
        }).lean();

        // 4. Recent booking history
        const bookingHistory = await Booking.find({
            user: req.user._id,
        })
            .populate(
                "vehicle",
                "company model registrationNumber fuelType vehicleType"
            )
            .sort({
                createdAt: -1,
            })
            .limit(5)
            .lean();

        // 5. AI
        const result = await chatWithAI({
            user,
            vehicles,
            bookingHistory,
            message,
        });

        // 6. Response
        return res.status(200).json({
            status: true,
            message: "AI response generated successfully.",
            data: result,
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    chat,
};
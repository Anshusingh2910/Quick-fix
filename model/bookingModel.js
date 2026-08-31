const mongoose = require("mongoose")

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
            required: true,
        },

        mechanic: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Mechanic",
            default: null,
        },

        serviceType: {
            type: String,
            enum: [
                "battery",
                "puncture",
                "repair",
                "towing",
                "fuel",
                "charging",
            ],
            required: true,
        },

        status: {
            type: String,
            enum: [
                "pending",
                "accepted",
                "rejected",
                "cancelled",
                "completed",
            ],
            default: "pending",
        },

        estimatedPrice: {
            type: Number,
            default: 0,
        },

        paymentStatus: {
            type: String,
            enum: [
                "pending",
                "paid",
                "failed",
            ],
            default: "pending",
        },

        otp: {
            type: String,
            default: null,
        },

        otpVerified: {
            type: Boolean,
            default: false,
        },

        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },

            coordinates: {
                type: [Number],
                required: true,
            },
        },

        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

bookingSchema.index({
    location: "2dsphere",
});

module.exports = mongoose.model("Booking", bookingSchema);
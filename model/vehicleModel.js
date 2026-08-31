const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        vehicleType: {
            type: String,
            enum: [
                "bike",
                "car",
                "scooter",
                "truck",
                "van",
            ],
            required: true,
        },

        fuelType: {
            type: String,
            enum: [
                "petrol",
                "diesel",
                "cng",
                "electric",
            ],
            required: true,
        },
        company: {
            type: String,
            required: true,
            trim: true,
        },

        model: {
            type: String,
            required: true,
            trim: true,
        },

        year: {
            type: Number,
        },
        registrationNumber: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            unique: true,
        },
    },
    {
        timestamps: true,
    }
);
module.exports = mongoose.model(
    "Vehicle",
    vehicleSchema
);
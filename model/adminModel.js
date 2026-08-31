const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },

        designation: {
            type: String,
            default: "Admin",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Admin", adminSchema);
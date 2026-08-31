const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.CONNECTION_STRING);
        console.log(" Database Connected");
    } catch (err) {
        console.log(" Database Error:", err.message);
    }
};

module.exports = connectDB;

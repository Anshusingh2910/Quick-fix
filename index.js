const express = require("express");
const dns = require("dns");
const cors = require("cors");
require("dotenv").config();
require("dns").setDefaultResultOrder("ipv4first");
const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const mechanicRoutes = require("./routes/mechanicRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiRoutes = require("./routes/aiRoutes");

const errorMiddleware = require("./middleware/errorMiddleware");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

connectDB();

const app = express();

app.set("trust proxy", 1);

app.use(
    cors({
        origin: [
            "https://anshusingh2910.github.io",
            "http://localhost:5173",
        ],
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
        ],
        credentials: true,
    })
);


// ===============================
// BODY PARSER
// ===============================

app.use(express.json());


// ===============================
// HEALTH CHECK
// ===============================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "QuickFix Backend is running",
    });
});

app.get("/test-smtp", async (req, res) => {
    try {
        const transporter = require("./config/transporter");

        await transporter.verify();

        res.status(200).json({
            status: true,
            message: "SMTP connection successful",
        });

    } catch (error) {
        console.error("SMTP VERIFY ERROR:", error);

        res.status(500).json({
            status: false,
            message: error.message,
            code: error.code,
            command: error.command,
        });
    }
});

// ===============================
// API ROUTES
// ===============================

app.use("/user", userRoutes);
app.use("/mechanic", mechanicRoutes);
app.use("/vehicle", vehicleRoutes);
app.use("/booking", bookingRoutes);
app.use("/admin", adminRoutes);
app.use("/ai", aiRoutes);


// ===============================
// ERROR HANDLER
// ===============================

app.use(errorMiddleware);


// ===============================
// SERVER
// ===============================

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
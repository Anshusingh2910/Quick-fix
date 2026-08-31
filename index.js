const express = require("express");
const dns = require("dns");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const mechanicRoutes = require("./routes/mechanicRoutes")
const errorMiddleware = require("./middleware/errorMiddleware")
const vehicleRoutes = require("./routes/vehicleRoutes")
const bookingRoutes = require("./routes/bookingRoutes")
const adminRoutes = require("./routes/adminRoutes")
const aiRoutes = require("./routes/aiRoutes");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
connectDB();
const app = express();

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json());
app.use("/user", userRoutes);
app.use("/mechanic", mechanicRoutes)
app.use("/vehicle", vehicleRoutes)
app.use("/booking", bookingRoutes)
app.use("/admin", adminRoutes)
app.use("/ai", aiRoutes);
app.use(errorMiddleware);



const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
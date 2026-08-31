const express = require("express");
const Validator = require("../middleware/validatorMiddleware");
const { registerSchema, loginSchema, forgotPasswordSchema, verifyOTPSchema, resetPasswordSchema } = require("../validation/validationJoi");
const { register, login, profile, forgotPassword, verifyOTP, resetPassword, resendOTP, refreshAccessToken, updateProfile, logout, deleteAccount, completeProfile, getDashboard, getMechanicBookings, startBooking, submitKYC, updateBankDetails, startKYC } = require("../controller/mechanicController");
const { auth, upload } = require("../middleware/authmiddleware");
const { loginLimiter, registerLimiter, forgotPasswordLimiter, verifyOTPLimiter, resendOTPLimiter, resetPasswordLimiter } = require("../middleware/Security");

const app = express.Router();

app.post("/register", Validator(registerSchema), registerLimiter, register);
app.post("/login", Validator(loginSchema), loginLimiter, login);
app.post("/forgot-password", Validator(forgotPasswordSchema), forgotPasswordLimiter, forgotPassword);
app.post("/verify-otp", verifyOTPLimiter, verifyOTP);
app.put("/reset-password", Validator(resetPasswordSchema), resetPasswordLimiter, resetPassword);
app.post("/resend-otp", resendOTPLimiter, resendOTP);
app.post("/refresh-token", refreshAccessToken);
app.get("/profile", auth, profile)
app.put("/updateProfile", auth, upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "shopImage", maxCount: 1 },
]),
    updateProfile
);
app.put("/submitKYC", auth, upload.fields([
    {
        name: "aadhaar",
        maxCount: 1,
    },
    {
        name: "drivingLicense",
        maxCount: 1,
    },
]),
    submitKYC
);
app.post(
    "/startKYC",
    auth,
    startKYC
);
app.post("/updateBankDetails", auth, updateBankDetails);
app.get("/bookings", auth, getMechanicBookings);
app.put("/bookings/:bookingId/start", auth, startBooking);
app.post("/logout", auth, logout)
app.delete("/delete", auth, deleteAccount)
app.get("/dashboard", auth, getDashboard);
app.put("/complete-profile", auth, upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "shopImage", maxCount: 1 },
]),
    completeProfile
);

module.exports = app;

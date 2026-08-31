const express = require("express");
const Validator = require("../middleware/validatorMiddleware");
const { registerSchema, loginSchema, forgotPasswordSchema, verifyOTPSchema, resetPasswordSchema } = require("../validation/validationJoi");
const { auth } = require("../middleware/authMiddleware");
const { loginLimiter, registerLimiter, forgotPasswordLimiter, resendOTPLimiter, verifyOTPLimiter, resetPasswordLimiter } = require("../middleware/Security")

const app = express.Router();

const {
    register,
    login,
    refreshAccessToken,
    forgotPassword,
    resendOTP,
    resetPassword,
    verifyOTP,
    getDashboard,
    getAllUsers,
    getUserById,
    getAllMechanics,
    getMechanicById,
} = require("../controller/adminController");


app.post("/register", Validator(registerSchema), registerLimiter, register);
app.post("/login", Validator(loginSchema), loginLimiter, login);
app.post("/forgot-password", Validator(forgotPasswordSchema), forgotPasswordLimiter, forgotPassword);
app.post("/verify-otp", Validator(verifyOTPSchema), verifyOTPLimiter, verifyOTP);
app.put("/reset-password", Validator(resetPasswordSchema), resetPasswordLimiter, resetPassword);
app.post("/resend-otp", resendOTPLimiter, resendOTP);
app.post("/refresh-token", refreshAccessToken);
app.get("/dashboard", auth, getDashboard);
app.get("/users", auth, getAllUsers);
app.get("/users/:userId", auth, getUserById);
app.get("/mechanics", auth, getAllMechanics);
app.get("/mechanics/:mechanicId", auth, getMechanicById);

module.exports = app;
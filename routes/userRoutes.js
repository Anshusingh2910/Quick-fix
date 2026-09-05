const express = require("express");
const Validator = require("../middleware/validatorMiddleware");
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require("../validation/validationJoi");
const { register, login, profile, completeAddress, forgotPassword, verifyOTP, resetPassword, resendOTP, refreshAccessToken, logout } = require("../controller/userController");
const { auth, upload } = require("../middleware/authmiddleware");
const { loginLimiter, registerLimiter, forgotPasswordLimiter, verifyOTPLimiter, resendOTPLimiter, resetPasswordLimiter } = require("../middleware/Security")

const app = express.Router();

app.post("/register", Validator(registerSchema), registerLimiter, register);
app.post("/login", Validator(loginSchema), loginLimiter, login);
app.post("/forgot-password", Validator(forgotPasswordSchema), forgotPasswordLimiter, forgotPassword);
app.post("/verify-otp", verifyOTPLimiter, verifyOTP);
app.put("/reset-password", Validator(resetPasswordSchema), resetPasswordLimiter, resetPassword);
app.put("/complete-profile", auth, upload.single("profileImage"), completeAddress);
app.get("/profile", auth, profile)
app.post("/resend-otp", resendOTPLimiter, resendOTP);
app.post("/refresh-token", refreshAccessToken);
app.post("/logout", auth, logout)
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

module.exports = app;

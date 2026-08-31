const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        status: false,
        message: "Too many login attempts. Please try again after 15 minutes.",
    },
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 7,
    message: {
        status: false,
        message: "Registration limit exceeded. Please wait for 1 hour before trying again.",
    },
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: {
        status: false,
        message: "Too many forgot password requests. Please try again after 15 minutes.",
    },
});

const resendOTPLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: {
        status: false,
        message: "Too many OTP resend requests. Please try again after 10 minutes.",
    },
});

const verifyOTPLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: {
        status: false,
        message: "Too many OTP verification attempts. Please try again after 10 minutes.",
    },
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        status: false,
        message: "Too many password reset attempts. Please try again after 15 minutes.",
    },
});


module.exports = {
    loginLimiter,
    registerLimiter,
    forgotPasswordLimiter,
    resendOTPLimiter,
    verifyOTPLimiter,
    resetPasswordLimiter
};
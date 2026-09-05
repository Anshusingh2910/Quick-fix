const jwt = require("jsonwebtoken");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const User = require("../model/userModel");
const mechanic = require("../model/mechanicModel")
const bcrypt = require("bcrypt")
const ApiError = require("../utilities/ApiError");
const multer = require("multer");
const { cloudinary } = require("../config/cloudinary");
const emailTemplate = require("../templates/emailTemplates");
const { AccessToken, RefreshToken, verificationToken, } = require("../config/token");
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
const { Resend } = require("resend");
const Notification = require("../model/notificationModel");

const auth = async (req, res, next) => {
    try {
        const token = req.header("Authorization");

        if (!token) {
            throw new ApiError(401, "Token is required");
        }

        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                throw new ApiError(401, "Token has expired. Please login again.");
            }

            throw new ApiError(401, "Invalid token");
        }

        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        req.user = user;

        next();
    } catch (err) {
        next(err);
    }
};

const roleAuth = (...roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                throw new ApiError(401, "Unauthorized. Please login first.");
            }

            const user = req.user;

            if (!roles.includes(user.role)) {
                throw new ApiError(403, `Only ${roles.join(" / ")} can access this route.`);
            }

            if (user.role === "mechanic") {
                const Mechanic = await mechanic.findOne({
                    user: user._id,
                });

                if (!mechanic) {
                    throw new ApiError(404, "Mechanic profile not found.");
                }

                req.mechanic = mechanic;
            }

            req.user = user;
            next();
        } catch (err) {
            next(err);
        }
    };
};

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(
                new ApiError(
                    400,
                    "Only JPG, JPEG, PNG and WEBP images are allowed."
                )
            );
        }

        cb(null, true);
    },
});

const adminTokenAuth = (req, res, next) => {
    try {
        const token = req.header("AdminToken");

        if (!token) {
            throw new ApiError(401, "Admin Token is required.");
        }

        if (token !== process.env.ADMIN_TOKEN) {
            throw new ApiError(403, "Invalid Admin Token.");
        }

        next();
    } catch (err) {
        next(err);
    }
};

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: "QuickFix <noreply@polenx.com>",
            to: [to],
            subject,
            html,
        });

        if (error) {
            console.error("❌ RESEND ERROR:", error);
            throw new Error(error.message);
        }

        console.log("✅ EMAIL SENT:", data?.id);

        return data;

    } catch (error) {
        console.error("❌ EMAIL SEND ERROR:", error.message);
        throw error;
    }
};

module.exports = sendEmail;


const refreshTokenService = async (token, role) => {
    if (!token) {
        throw new ApiError(401, "Refresh token is required.");
    }
    let decoded;
    try {
        decoded = jwt.verify(
            token, process.env.REFRESH_JWT_SECRET
        );
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            throw new ApiError(401, "Refresh token has expired.");
        }
        throw new ApiError(401, "Invalid refresh token.");
    }

    if (decoded.role !== role) {
        throw new ApiError(403, "Unauthorized access.");
    }

    const user = await User.findById(decoded.id);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }
    if (!user.refreshToken) {
        throw new ApiError(401, "Please login again.");
    }
    if (user.refreshToken !== token) {
        throw new ApiError(401, "Invalid refresh token.");
    }
    const accessToken = AccessToken(user);
    return accessToken;
};

const forgotPasswordService = async (email, role) => {
    const user = await User.findOne({
        email: email.toLowerCase(),
        role,
    });

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    if (!user.isVerified) {
        throw new ApiError(403, "Please verify your email before resetting your password.");
    }

    const otp = generateOTP();

    const hashedOTP = await bcrypt.hash(otp, 10);

    user.otp = hashedOTP;
    user.otpExpire = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    const token = verificationToken(user, "reset-password");

    await sendEmail({
        to: user.email,
        subject: "Password Reset OTP - Quickfix",
        html: emailTemplate({
            heading: `Hello ${user.name}`,
            message: `
        We received a request to reset your password.
        <br><br>
        Your Password Reset OTP is:
        <h2 style="letter-spacing:5px;">${otp}</h2>
        This OTP is valid for <b>5 minutes</b>.
        <br><br>
        If you didn't request this password reset, you can safely ignore this email.
        <br><br>
        Regards,<br>
        <b>Quickfix Team ❤️</b>
      `,
        }),
    });
    return token;
};

const verifyOTPService = async (token, otp, role) => {
    if (!token) {
        throw new ApiError(401, "Verification token is required.");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET
        );

        if (
            decoded.type !== "verify-email" &&
            decoded.type !== "reset-password"
        ) {
            throw new ApiError(400, "Invalid token type.");
        }

        if (decoded.role !== role) {
            throw new ApiError(403, "You are not authorized to perform this action.");
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        if (user.role !== role) {
            throw new ApiError(403, "Invalid user role.");
        }

        if (
            decoded.type === "verify-email" &&
            user.isVerified
        ) {
            throw new ApiError(400, "Email is already verified.");
        }

        if (!user.otp) {
            throw new ApiError(400, "OTP has already been used. Please request a new OTP.");
        }
        if (
            !user.otpExpire ||
            user.otpExpire < Date.now()
        ) {
            throw new ApiError(400, "OTP has expired.");
        }

        const isMatch = await bcrypt.compare(otp, user.otp);

        if (!isMatch) {
            throw new ApiError(400, "Invalid OTP.");
        }

        if (decoded.type === "verify-email") {
            user.isVerified = true;
        }

        if (decoded.type === "reset-password") {
            user.resetVerified = true;
        }
        user.otp = null;
        user.otpExpire = null;

        await user.save();
        return user;
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            throw new ApiError(401, "Verification token has expired.");
        }
        if (err.name === "JsonWebTokenError") {
            throw new ApiError(401, "Invalid verification token.");
        }
        throw err;
    }
};

const resendOTPService = async (token, role) => {
    if (!token) {
        throw new ApiError(401, "Verification token is required.");
    }
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            throw new ApiError(401, "Verification token has expired.");
        }
        throw new ApiError(401, "Invalid verification token.");
    }

    if (
        decoded.type !== "verify-email" &&
        decoded.type !== "reset-password"
    ) {
        throw new ApiError(400, "Invalid token type.");
    }

    if (decoded.role !== role) {
        throw new ApiError(403, "You are not authorized to perform this action.");
    }

    const user = await User.findById(decoded.id);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    if (user.role !== role) {
        throw new ApiError(403, "Invalid user role."
        );
    }

    if (
        decoded.type === "verify-email" &&
        user.isVerified
    ) {
        throw new ApiError(400, "Email is already verified.");
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);
    user.otp = hashedOTP;
    user.otpExpire = new Date(
        Date.now() + 5 * 60 * 1000
    );
    await user.save();
    let subject = "";
    let message = "";
    if (decoded.type === "verify-email") {
        subject = "Email Verification OTP - Polenx";
        message = `
            Your new Email Verification OTP is:
            <h2 style="letter-spacing:5px;">${otp}</h2>
            This OTP is valid for <b>5 minutes</b>.
        `;
    }
    if (decoded.type === "reset-password") {
        subject = "Password Reset OTP - Polenx";
        message = `
            Your new Password Reset OTP is:
            <h2 style="letter-spacing:5px;">${otp}</h2>
            This OTP is valid for <b>5 minutes</b>.
        `;
    }
    await sendEmail({
        to: user.email,
        subject,
        html: emailTemplate({
            heading: `Hello ${user.name}`,
            message,
        }),
    });

    return true;
};

const resetPasswordService = async (token, password, role) => {
    if (!token) {
        throw new ApiError(401, "Reset password token is required.");
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            throw new ApiError(401, "Reset password token has expired.");
        }

        throw new ApiError(401, "Invalid reset password token.");
    }

    if (decoded.type !== "reset-password") {
        throw new ApiError(400, "Invalid reset password token.");
    }

    if (decoded.role !== role) {
        throw new ApiError(403, "You are not authorized to perform this action.");
    }

    const user = await User.findById(decoded.id);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }
    if (!user.resetVerified) {
        throw new ApiError(400, "Please verify OTP first.");
    }
    if (user.role !== role) {
        throw new ApiError(403, "Invalid user role.");
    }

    const isSamePassword = await bcrypt.compare(
        password,
        user.password
    );

    if (isSamePassword) {
        throw new ApiError(400, "New password cannot be the same as the old password.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;

    user.otp = null;
    user.otpExpire = null;
    user.resetVerified = false;

    user.refreshToken = null;
    await user.save();
    await sendEmail({
        to: user.email,
        subject: "Password Changed Successfully",
        html: emailTemplate({
            heading: `Hello ${user.name}`,
            message: `
        Your password has been changed successfully.
        <br><br>
        If you did not perform this action, please change your password immediately or contact Polenx Support.
        <br><br>
        Regards,<br>
        <b>Polenx Team ❤️</b>
      `,
        }),
    });

    return true;
};
const createNotification = async ({
    user,
    title,
    message,
    type,
}) => {
    try {
        const notification = await Notification.create({
            user,
            title,
            message,
            type,
        });
        return notification;
    } catch (err) {
        throw new ApiError(500, "Failed to create notification.");
    }
};

module.exports = {
    auth,
    roleAuth,
    upload,
    createNotification,
    adminTokenAuth,
    forgotPasswordService,
    refreshTokenService,
    verifyOTPService,
    resendOTPService,
    resetPasswordService,
    sendEmail,
};


const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const admin = require("../model/adminModel");
const Mechanic = require("../model/mechanicModel")
const Booking = require("../model/bookingModel")
const Vehicle = require("../model/vehicleModel")
const ApiError = require("../utilities/ApiError");
const emailTemplate = require("../templates/emailTemplates");
const { AccessToken, RefreshToken, verificationToken } = require("../config/token")
const { forgotPasswordService, refreshTokenService, verifyOTPService, resendOTPService, resetPasswordService, sendEmail } = require("../middleware/authmiddleware");

const register = async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password || !phone) {
            throw new ApiError(400, "All fields are required.");
        }

        if (name.length < 3 || name.length > 50) {
            throw new ApiError(400, "Name must be between 3 and 50 characters.");
        }

        const emailRegex =
            /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

        if (!emailRegex.test(email)) {
            throw new ApiError(400, "Invalid email address.");
        }
        const phoneRegex = /^[6-9]\d{9}$/;

        if (!phoneRegex.test(phone)) {
            throw new ApiError(400, "Invalid phone number.");
        }

        if (password.length < 8) {
            throw new ApiError(400, "Password must be at least 8 characters.");
        }
        const existingEmail = await User.findOne({
            email,
        });

        if (existingEmail) {
            throw new ApiError(400, "Email already registered.");
        }

        const existingPhone = await User.findOne({
            phone,
        });

        if (existingPhone) {
            throw new ApiError(400, "Phone number already registered.");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();;
        const hashedOTP = await bcrypt.hash(otp, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: "admin",
            otp: hashedOTP,
            otpExpire: new Date(
                Date.now() + 5 * 60 * 1000
            ),
            isVerified: false,
        });

        await admin.create({
            user: user._id,
        });
        const token = verificationToken(user, "verify-email");
        await sendEmail({
            to: user.email,
            subject: "Verify Your Mechanic Account - QuickFix",
            html: emailTemplate({
                heading: `Hello ${user.name}`,
                message: `
          Welcome to <b>QuickFix 🚗🔧</b>.
          <br><br>
          Thank you for registering as a <b>Mechanic Partner</b>.
          <br><br>
          Your Verification OTP is
          <h2 style="letter-spacing:5px;">
            ${otp}
          </h2>
          This OTP will expire in
          <b>5 minutes</b>.
          <br><br>
          Please do not share this OTP with anyone.
          <br><br>
          Regards,
          <br>
          <b>QuickFix Team ❤️</b>
        `,
            }),
        });

        res.status(201).json({
            status: true,
            message:
                "OTP sent successfully. Please verify your email.",
            verificationToken: token,
        });

    } catch (err) {
        next(err);
    }
};
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({
            email: email.toLowerCase(),
        });

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        if (user.role !== "admin") {
            throw new ApiError(403, "This account is not a user account.");
        }

        if (!user.isVerified) {
            throw new ApiError(403, "Please verify your email before logging in.");
        }

        if (user.isBlocked) {
            throw new ApiError(403, "Your account has been blocked. Please contact support.")
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            throw new ApiError(401, "Invalid email or password.");
        }
        const accessToken = AccessToken(user);
        const refreshToken = RefreshToken(user);
        user.refreshToken = refreshToken;
        await user.save();

        await sendEmail({
            to: user.email,
            subject: "New Login Alert - QuickFix",
            html: emailTemplate({
                heading: `Hello ${user.name}`,
                message: `
      We noticed a successful login to your <b>QuickFix 🚗🔧</b> account.
      <br><br>
      If this was you, no further action is required.
      <br><br>
      <b>Account Details:</b>
      <br>
      📧 Email: ${user.email}
      <br>
      🕒 Login Time: ${new Date().toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                })}
      <br><br>
      If you did <b>NOT</b> log in to your account, please reset your password immediately and contact the QuickFix Support Team.
      <br><br>
      Your account security is our top priority.
      <br><br>
      Regards,<br>
      <b>QuickFix Team ❤️</b>
    `,
            }),
        });

        res.status(200).json({
            status: true,
            message: "Login successful.",
            accessToken,
            refreshToken,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        next(err);
    }
};
const refreshAccessToken = async (req, res, next) => {
    try {
        const token = req.header("Authorization");
        if (!token) {
            throw new ApiError(401, "Refresh token is required.");
        }
        const accessToken = await refreshTokenService(token, "admin");
        return res.status(200).json({
            status: true,
            message: "Admin access token refreshed successfully.",
            accessToken,
        });

    } catch (err) {
        next(err);
    }
};
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new ApiError(400, "Email is required.");
        }

        const token = await forgotPasswordService(
            email,
            "user"
        );

        return res.status(200).json({
            status: true,
            message: "OTP sent successfully.",
            token,
        });
    } catch (err) {
        next(err);
    }
};
const verifyOTP = async (req, res, next) => {
    try {
        const token = req.header("Authorization");

        if (!token) {
            throw new ApiError(401, "Verification token is required.");
        }

        const { otp } = req.body;
        const user = await verifyOTPService(token, otp, "admin");
        res.status(200).json({
            status: true,
            message: user.resetVerified
                ? "Password reset OTP verified successfully."
                : "Admin account verified successfully.",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
            },
        });
    } catch (err) {
        next(err);
    }
};
const resendOTP = async (req, res, next) => {
    try {
        const token = req.header("Authorization");

        if (!token) {
            throw new ApiError(401, "Verification token is required.");
        }

        await resendOTPService(token, "admin");

        res.status(200).json({
            status: true,
            message: "New OTP sent successfully.",
        });
    } catch (err) {
        next(err);
    }
};
const resetPassword = async (req, res, next) => {
    try {
        const token = req.header("Authorization");
        if (!token) {
            throw new ApiError(401, "Reset password token is required.");
        }
        const { password } = req.body;
        await resetPasswordService(token, password, "admin");
        res.status(200).json({
            status: true,
            message: "Password reset successfully.",
        });
    } catch (err) {
        next(err);
    }
};
const getDashboard = async (req, res, next) => {
    try {
        const [
            totalUsers,
            totalMechanics,
            totalVehicles,
            totalBookings,
            pendingBookings,
            acceptedBookings,
            completedBookings,
            cancelledBookings,
            pendingMechanics,
            approvedMechanics,
        ] = await Promise.all([
            User.countDocuments({
                role: "user",
            }),
            Mechanic.countDocuments(),
            Vehicle.countDocuments(),
            Booking.countDocuments(),
            Booking.countDocuments({
                status: "pending",
            }),
            Booking.countDocuments({
                status: "accepted",
            }),
            Booking.countDocuments({
                status: "completed",
            }),
            Booking.countDocuments({
                status: "cancelled",
            }),
            Mechanic.countDocuments({
                isApproved: false,
            }),
            Mechanic.countDocuments({
                isApproved: true,
            }),
        ]);
        return res.status(200).json({
            status: true,
            message: "Dashboard fetched successfully.",
            data: {
                users: totalUsers,
                mechanics: {
                    total: totalMechanics,
                    approved: approvedMechanics,
                    pending: pendingMechanics,
                },
                vehicles: totalVehicles,
                bookings: {
                    total: totalBookings,
                    pending: pendingBookings,
                    accepted: acceptedBookings,
                    completed: completedBookings,
                    cancelled: cancelledBookings,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};
const getAllUsers = async (req, res, next) => {
    try {

        const users = await User.find({
            role: "user",
        })
            .select("-password -refreshToken -otp -otpExpiry -__v")
            .sort({ createdAt: -1 });

        if (users.length === 0) {
            throw new ApiError(404, "No users found.");
        }

        return res.status(200).json({
            status: true,
            totalUsers: users.length,
            message: "Users fetched successfully.",
            data: users,
        });

    } catch (err) {
        next(err);
    }
};
const getUserById = async (req, res, next) => {
    try {

        const { userId } = req.params;

        const user = await User.findOne({
            _id: userId,
            role: "user",
        }).select(
            "-password -refreshToken -otp -otpExpiry -__v"
        );

        if (!user) {
            throw new ApiError(404, "User not found."
            );
        }

        return res.status(200).json({
            status: true,
            message: "User fetched successfully.",
            data: user,
        });

    } catch (err) {
        next(err);
    }
};
const getAllMechanics = async (req, res, next) => {
    try {

        const mechanics = await Mechanic.find()
            .populate(
                "user",
                "name email phone address isVerified isBlocked"
            )
            .sort({ createdAt: -1 });

        if (mechanics.length === 0) {
            throw new ApiError(404, "No mechanics found.");
        }

        return res.status(200).json({
            status: true,
            totalMechanics: mechanics.length,
            message: "Mechanics fetched successfully.",
            data: mechanics,
        });

    } catch (err) {
        next(err);
    }
};
const getMechanicById = async (req, res, next) => {
    try {

        const { mechanicId } = req.params;

        const mechanic = await Mechanic.findById(mechanicId)
            .populate(
                "user",
                "name email phone address isVerified isBlocked"
            );

        if (!mechanic) {
            throw new ApiError(404, "Mechanic not found."
            );
        }
        return res.status(200).json({
            status: true,
            message: "Mechanic fetched successfully.",
            data: mechanic,
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {
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
}
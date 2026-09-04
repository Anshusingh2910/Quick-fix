const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../model/userModel");
const ApiError = require("../utilities/ApiError");
const { cloudinary } = require("../config/cloudinary");
const { AccessToken, RefreshToken, verificationToken } = require("../config/token")
const emailTemplate = require("../templates/emailTemplates");
const { forgotPasswordService, refreshTokenService, verifyOTPService, resendOTPService, resetPasswordService, sendEmail } = require("../middleware/authmiddleware");

const register = async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;

        const normalizedEmail = email.toLowerCase().trim();

        // =========================================
        // 1. Check existing user
        // =========================================

        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {

            // Already verified account
            if (existingUser.isVerified) {
                throw new ApiError(
                    400,
                    "Email already registered. Please login."
                );
            }

            // =========================================
            // Existing account is NOT verified
            // Delete it so user can register again
            // =========================================

            await User.deleteOne({
                _id: existingUser._id,
            });
        }

        // =========================================
        // 2. Hash password
        // =========================================

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // =========================================
        // 3. Generate OTP
        // =========================================

        const otp = generateOTP();

        console.log("REGISTER OTP:", otp);

        const hashedOTP = await bcrypt.hash(
            otp,
            10
        );

        // =========================================
        // 4. Create user
        // =========================================

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            phone,
            role: "user",

            otp: hashedOTP,

            otpExpire: new Date(
                Date.now() + 5 * 60 * 1000
            ),

            isVerified: false,
            resetVerified: false,
        });

        // =========================================
        // 5. Generate verification token
        // =========================================

        const verification = verificationToken(
            user,
            "verify-email"
        );

        // =========================================
        // 6. SEND OTP EMAIL
        // =========================================

        try {

            await sendEmail({
                to: user.email,

                subject:
                    "Verify Your Email - QuickFix",

                html: emailTemplate({
                    heading: `Hello ${user.name}`,

                    message: `
                        Welcome to <b>QuickFix 🚗🔧</b>.
                        <br><br>

                        Thank you for registering with QuickFix.
                        <br><br>

                        Your Email Verification OTP is:

                        <h2
                            style="
                                letter-spacing:5px;
                                color:#2563eb;
                            "
                        >
                            ${otp}
                        </h2>

                        This OTP is valid for
                        <b>5 minutes</b>.

                        <br><br>

                        Please do not share this OTP
                        with anyone.

                        <br><br>

                        Regards,<br>
                        <b>QuickFix Team ❤️</b>
                    `,
                }),
            });

        } catch (emailError) {

            console.error(
                "❌ REGISTER OTP EMAIL FAILED:",
                emailError?.message || emailError
            );

            // =========================================
            // IMPORTANT
            // Email failed → DELETE CREATED USER
            // =========================================

            await User.deleteOne({
                _id: user._id,
            });

            throw new ApiError(
                503,
                "Unable to send OTP. Please try again."
            );
        }

        // =========================================
        // 7. SUCCESS
        // =========================================

        return res.status(201).json({
            status: true,

            message:
                "OTP sent successfully. Please verify your email.",

            verificationToken: verification,
        });

    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const normalizedEmail = email
            .toLowerCase()
            .trim();

        // =========================================
        // Find user
        // =========================================

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            throw new ApiError(
                404,
                "User not found."
            );
        }

        // =========================================
        // Check role
        // =========================================

        if (user.role !== "user") {
            throw new ApiError(
                403,
                "This account is not a user account."
            );
        }

        // =========================================
        // Email verification
        // =========================================

        if (!user.isVerified) {
            throw new ApiError(
                403,
                "Please verify your email before logging in."
            );
        }

        // =========================================
        // Block check
        // =========================================

        if (user.isBlocked) {
            throw new ApiError(
                403,
                "Your account has been blocked. Please contact support."
            );
        }

        // =========================================
        // Password
        // =========================================

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            throw new ApiError(
                401,
                "Invalid email or password."
            );
        }

        // =========================================
        // Generate tokens
        // =========================================

        const accessToken = AccessToken(user);

        const refreshToken = RefreshToken(user);

        user.refreshToken = refreshToken;

        await user.save();

        // =========================================
        // LOGIN EMAIL
        // Don't block login if email fails
        // =========================================

        sendEmail({
            to: user.email,

            subject:
                "New Login Alert - QuickFix",

            html: emailTemplate({
                heading: `Hello ${user.name}`,

                message: `
                    We noticed a successful login
                    to your <b>QuickFix 🚗🔧</b> account.

                    <br><br>

                    If this was you,
                    no further action is required.
                `,
            }),
        }).catch((emailError) => {
            console.error(
                "⚠️ LOGIN ALERT EMAIL FAILED:",
                emailError?.message || emailError
            );
        });

        // =========================================
        // RESPONSE
        // =========================================

        return res.status(200).json({
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
        const accessToken = await refreshTokenService(token, "user");
        return res.status(200).json({
            status: true,
            message: "User access token refreshed successfully.",
            accessToken,
        });
    } catch (err) {
        next(err);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const token = await forgotPasswordService(
            req.body.email,
            "user"
        );
        res.status(200).json({
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
        console.log(otp, "Verify otp")
        const user = await verifyOTPService(token, otp, "user");
        res.status(200).json({
            status: true,
            message: user.resetVerified
                ? "Password reset OTP verified successfully."
                : "User account verified successfully.",
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
const completeAddress = async (req, res, next) => {
    try {
        const {
            name,
            phone,
            address,
        } = req.body;

        console.log("=================================");
        console.log("PROFILE UPDATE");
        console.log("BODY:", req.body);
        console.log("FILE:", req.file);
        console.log("=================================");

        // =====================================================
        // FIND USER
        // =====================================================

        const user = await User.findById(req.user._id);

        if (!user) {
            throw new ApiError(
                404,
                "User not found."
            );
        }

        // =====================================================
        // NAME
        // =====================================================

        if (name !== undefined) {
            const cleanName = String(name).trim();

            if (!cleanName) {
                throw new ApiError(
                    400,
                    "Name is required."
                );
            }

            user.name = cleanName;
        }

        // =====================================================
        // PHONE
        // =====================================================

        if (phone !== undefined) {
            const cleanPhone = String(phone).trim();

            if (!cleanPhone) {
                throw new ApiError(
                    400,
                    "Phone number is required."
                );
            }

            if (!/^[0-9]{10}$/.test(cleanPhone)) {
                throw new ApiError(
                    400,
                    "Phone number must be 10 digits."
                );
            }

            user.phone = cleanPhone;
        }

        // =====================================================
        // ADDRESS REQUIRED
        // =====================================================

        if (!address) {
            throw new ApiError(
                400,
                "Address is required."
            );
        }

        // =====================================================
        // PARSE ADDRESS
        // =====================================================

        let parsedAddress = address;

        if (typeof address === "string") {
            try {
                parsedAddress = JSON.parse(address);
            } catch (error) {
                throw new ApiError(
                    400,
                    "Invalid address format."
                );
            }
        }

        if (
            !parsedAddress ||
            typeof parsedAddress !== "object"
        ) {
            throw new ApiError(
                400,
                "Invalid address."
            );
        }

        // =====================================================
        // ADDRESS FIELDS
        // =====================================================

        const {
            fullName,
            houseNo,
            area,
            city,
            state,
            country,
            pincode,
        } = parsedAddress;

        const cleanFullName = String(
            fullName || ""
        ).trim();

        const cleanHouseNo = String(
            houseNo || ""
        ).trim();

        const cleanArea = String(
            area || ""
        ).trim();

        const cleanCity = String(
            city || ""
        ).trim();

        const cleanState = String(
            state || ""
        ).trim();

        const cleanCountry = String(
            country || "India"
        ).trim();

        const cleanPincode = String(
            pincode || ""
        ).trim();

        // =====================================================
        // VALIDATION
        // =====================================================

        if (!cleanFullName) {
            throw new ApiError(
                400,
                "Address full name is required."
            );
        }

        if (!cleanHouseNo) {
            throw new ApiError(
                400,
                "House / Flat number is required."
            );
        }

        if (!cleanArea) {
            throw new ApiError(
                400,
                "Area is required."
            );
        }

        if (!cleanCity) {
            throw new ApiError(
                400,
                "City is required."
            );
        }

        if (!cleanState) {
            throw new ApiError(
                400,
                "State is required."
            );
        }

        if (!cleanPincode) {
            throw new ApiError(
                400,
                "Pincode is required."
            );
        }

        if (!/^[0-9]{6}$/.test(cleanPincode)) {
            throw new ApiError(
                400,
                "Pincode must be 6 digits."
            );
        }

        // =====================================================
        // IMAGE UPLOAD
        // =====================================================

        if (req.file) {
            console.log(
                "Uploading profile image to Cloudinary..."
            );

            // ---------------------------------------------
            // DELETE OLD IMAGE FIRST
            // ---------------------------------------------

            if (user.profileImage?.publicId) {
                try {
                    await cloudinary.uploader.destroy(
                        user.profileImage.publicId,
                        {
                            resource_type: "image",
                        }
                    );

                    console.log(
                        "Old image deleted:",
                        user.profileImage.publicId
                    );

                } catch (error) {
                    console.error(
                        "Old image delete failed:",
                        error.message
                    );
                }
            }

            // ---------------------------------------------
            // UPLOAD NEW IMAGE
            // ---------------------------------------------

            const uploadResult =
                await new Promise(
                    (resolve, reject) => {

                        const uploadStream =
                            cloudinary.uploader.upload_stream(
                                {
                                    folder:
                                        "quickfix/profile-images",
                                    resource_type: "image",
                                },
                                (
                                    error,
                                    result
                                ) => {

                                    if (error) {
                                        reject(error);
                                    } else {
                                        resolve(result);
                                    }
                                }
                            );

                        uploadStream.end(
                            req.file.buffer
                        );
                    }
                );

            console.log(
                "Cloudinary Upload Result:",
                uploadResult
            );

            // ---------------------------------------------
            // SAVE CLOUDINARY DATA IN MONGODB
            // ---------------------------------------------

            user.profileImage = {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
            };
        }

        // =====================================================
        // SAVE ADDRESS
        // =====================================================

        user.address = {
            fullName: cleanFullName,
            houseNo: cleanHouseNo,
            area: cleanArea,
            city: cleanCity,
            state: cleanState,
            country: cleanCountry,
            pincode: cleanPincode,
        };

        // =====================================================
        // SAVE USER
        // =====================================================

        await user.save();

        console.log(
            "PROFILE SAVED:",
            user.profileImage
        );

        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(200).json({
            status: true,
            message: "Profile updated successfully.",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,

                profileImage:
                    user.profileImage || null,

                address:
                    user.address || null,
            },
        });

    } catch (error) {
        next(error);
    }
};
const profile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        res.status(200).json({
            status: true,
            data: user,
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

        await resendOTPService(token, "user");

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

        await resetPasswordService(token, password, "user");

        res.status(200).json({
            status: true,
            message: "Password reset successfully.",
        });
    } catch (err) {
        next(err);
    }
};
const logout = async (req, res, next) => {
    try {

        const user = await User.findById(req.user._id);

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        user.refreshToken = "";

        await user.save();

        res.status(200).json({
            status: true,
            message: "Logged out successfully.",
        });

    } catch (err) {
        next(err);
    }
};
module.exports = {
    register,
    login,
    refreshAccessToken,
    profile,
    resendOTP,
    completeAddress,
    forgotPassword,
    verifyOTP,
    resetPassword,
    logout,
};

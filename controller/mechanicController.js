const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const Mechanic = require("../model/mechanicModel");
const { cloudinary } = require("../config/cloudinary");
const ApiError = require("../utilities/ApiError");
const { generateKYCLink } = require("../config/cashfreeService")
const Booking = require("../model/bookingModel")
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
            role: "mechanic",
            otp: hashedOTP,
            otpExpire: new Date(
                Date.now() + 5 * 60 * 1000
            ),
            isVerified: false,
        });

        await Mechanic.create({
            user: user._id,
        });
        const token = verificationToken(
            user,
            "verify-email"
        );
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

        if (user.role !== "mechanic") {
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
        const accessToken = await refreshTokenService(token, "mechanic");
        return res.status(200).json({
            status: true,
            message: "Mechanic access token refreshed successfully.",
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
            "mechanic"
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
            throw new ApiError(
                401,
                "Verification token is required."
            );
        }

        const { otp } = req.body;

        if (!otp) {
            throw new ApiError(
                400,
                "OTP is required."
            );
        }

        const user = await verifyOTPService(
            token,
            otp,
            "mechanic"
        );

        res.status(200).json({
            status: true,
            message: user.resetVerified
                ? "Password reset OTP verified successfully."
                : "Mechanic account verified successfully.",
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
}; const resendOTP = async (req, res, next) => {
    try {
        const token = req.header("Authorization");

        if (!token) {
            throw new ApiError(401, "Verification token is required.");
        }

        await resendOTPService(token, "mechanic");

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

        await resetPasswordService(token, password, "mechanic");

        res.status(200).json({
            status: true,
            message: "Password reset successfully.",
        });
    } catch (err) {
        next(err);
    }
};
const completeProfile = async (req, res, next) => {
    try {
        const {
            shopName,
            experience,
            specialization,
            description,
            serviceArea,

            fullName,
            houseNo,
            area,
            city,
            state,
            country,
            pincode,

            latitude,
            longitude,
        } = req.body;

        if (!shopName?.trim()) {
            throw new ApiError(400, "Shop name is required.");
        }

        if (
            experience === undefined ||
            experience === null ||
            experience === ""
        ) {
            throw new ApiError(400, "Experience is required.");
        }

        const experienceNumber = Number(experience);

        if (
            !Number.isFinite(experienceNumber) ||
            experienceNumber < 0
        ) {
            throw new ApiError(400, "Invalid experience.");
        }

        if (!description?.trim()) {
            throw new ApiError(400, "Description is required.");
        }

        if (!fullName?.trim()) {
            throw new ApiError(400, "Full name is required.");
        }

        if (!houseNo?.trim()) {
            throw new ApiError(400, "House number is required.");
        }

        if (!area?.trim()) {
            throw new ApiError(400, "Area is required.");
        }

        if (!city?.trim()) {
            throw new ApiError(400, "City is required.");
        }

        if (!state?.trim()) {
            throw new ApiError(400, "State is required.");
        }

        if (!country?.trim()) {
            throw new ApiError(400, "Country is required.");
        }

        if (!pincode?.trim()) {
            throw new ApiError(400, "Pincode is required.");
        }

        if (!/^[0-9]{6}$/.test(String(pincode).trim())) {
            throw new ApiError(400, "Invalid pincode.");
        }
        const lat = Number(latitude);
        const lng = Number(longitude);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {
            throw new ApiError(
                400,
                "Valid GPS location is required."
            );
        }

        if (lat < -90 || lat > 90) {
            throw new ApiError(400, "Invalid latitude.");
        }

        if (lng < -180 || lng > 180) {
            throw new ApiError(400, "Invalid longitude.");
        }

        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });

        if (!mechanic) {
            throw new ApiError(
                404,
                "Mechanic profile not found."
            );
        }

        if (mechanic.shopName) {
            throw new ApiError(
                400,
                "Profile already completed."
            );
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            throw new ApiError(
                404,
                "User not found."
            );
        }
        mechanic.shopName = shopName.trim();

        mechanic.experience = experienceNumber;

        mechanic.description = description.trim();

        const serviceAreaNumber =
            serviceArea === undefined ||
                serviceArea === null ||
                serviceArea === ""
                ? 10
                : Number(serviceArea);

        if (
            !Number.isFinite(serviceAreaNumber) ||
            serviceAreaNumber <= 0
        ) {
            throw new ApiError(
                400,
                "Invalid service area."
            );
        }

        mechanic.serviceArea = serviceAreaNumber;
        if (Array.isArray(specialization)) {
            mechanic.specialization =
                specialization
                    .map((item) =>
                        String(item).trim()
                    )
                    .filter(Boolean);
        } else if (
            typeof specialization === "string"
        ) {
            mechanic.specialization =
                specialization
                    .split(",")
                    .map((item) =>
                        item.trim()
                    )
                    .filter(Boolean);
        } else {
            mechanic.specialization = [];
        }

        mechanic.location = {
            type: "Point",
            coordinates: [
                lng,
                lat,
            ],
        };
        user.address = {
            fullName: fullName.trim(),
            houseNo: houseNo.trim(),
            area: area.trim(),
            city: city.trim(),
            state: state.trim(),
            country: country.trim(),
            pincode: pincode.trim(),
        };
        if (req.files?.profileImage?.[0]) {
            const file =
                req.files.profileImage[0];

            mechanic.documents.profileImage = {
                public_id: file.filename,
                url: file.path,
            };
        }


        if (req.files?.shopImage?.[0]) {
            const file =
                req.files.shopImage[0];

            mechanic.documents.shopImage = {
                public_id: file.filename,
                url: file.path,
            };
        }

        await user.save();
        await mechanic.save();

        return res.status(200).json({
            status: true,
            message: "Mechanic profile completed successfully.",
            data: {
                mechanic,
                address: user.address,
                location: {
                    latitude: lat,
                    longitude: lng,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

const profile = async (req, res, next) => {
    try {
        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        }).populate(
            "user",
            "-password -otp -otpExpire -refreshToken"
        );

        if (!mechanic) {
            throw new ApiError(
                404,
                "Mechanic not found."
            );
        }

        return res.status(200).json({
            status: true,
            message: "Mechanic profile fetched successfully.",
            data: mechanic,
        });
    } catch (err) {
        next(err);
    }
};
const updateProfile = async (req, res, next) => {
    try {
        const {
            name,
            phone,

            fullName,
            houseNo,
            area,
            city,
            state,
            country,
            pincode,

            shopName,
            experience,
            specialization,
            description,
            serviceArea,
        } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });

        if (!mechanic) {
            throw new ApiError(404, "Mechanic profile not found."
            );
        }
        if (name !== undefined) {
            const cleanName = String(name).trim();

            if (!cleanName) {
                throw new ApiError(
                    400,
                    "Name cannot be empty."
                );
            }

            if (
                cleanName.length < 3 ||
                cleanName.length > 50
            ) {
                throw new ApiError(
                    400,
                    "Name must be between 3 and 50 characters."
                );
            }

            user.name = cleanName;
        }

        if (phone !== undefined) {
            const cleanPhone = String(phone).trim();

            if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
                throw new ApiError(
                    400,
                    "Invalid phone number."
                );
            }

            const existingPhone =
                await User.findOne({
                    phone: cleanPhone,
                    _id: { $ne: user._id },
                });

            if (existingPhone) {
                throw new ApiError(
                    400,
                    "Phone number already registered."
                );
            }

            user.phone = cleanPhone;
        }
        user.address = {
            fullName:
                fullName !== undefined
                    ? String(fullName).trim()
                    : user.address?.fullName || user.name,

            houseNo:
                houseNo !== undefined
                    ? String(houseNo).trim()
                    : user.address?.houseNo || "",

            area:
                area !== undefined
                    ? String(area).trim()
                    : user.address?.area || "",

            city:
                city !== undefined
                    ? String(city).trim()
                    : user.address?.city || "",

            state:
                state !== undefined
                    ? String(state).trim()
                    : user.address?.state || "",

            country:
                country !== undefined
                    ? String(country).trim()
                    : user.address?.country || "India",

            pincode:
                pincode !== undefined
                    ? String(pincode).trim()
                    : user.address?.pincode || "",
        };
        if (shopName !== undefined) {
            const cleanShopName =
                String(shopName).trim();

            if (!cleanShopName) {
                throw new ApiError(
                    400,
                    "Shop name cannot be empty."
                );
            }

            mechanic.shopName = cleanShopName;
        }

        if (
            experience !== undefined &&
            experience !== null &&
            experience !== ""
        ) {
            const experienceNumber =
                Number(experience);

            if (
                !Number.isFinite(
                    experienceNumber
                ) ||
                experienceNumber < 0
            ) {
                throw new ApiError(
                    400,
                    "Invalid experience."
                );
            }

            mechanic.experience =
                experienceNumber;
        }
        if (specialization !== undefined) {

            if (Array.isArray(specialization)) {

                mechanic.specialization =
                    specialization
                        .map((item) =>
                            String(item).trim()
                        )
                        .filter(Boolean);

            } else {

                mechanic.specialization =
                    String(specialization)
                        .split(",")
                        .map((item) =>
                            item.trim()
                        )
                        .filter(Boolean);
            }
        }

        if (description !== undefined) {
            const cleanDescription =
                String(description).trim();

            if (!cleanDescription) {
                throw new ApiError(
                    400,
                    "Description cannot be empty."
                );
            }

            mechanic.description =
                cleanDescription;
        }
        if (
            serviceArea !== undefined &&
            serviceArea !== null &&
            serviceArea !== ""
        ) {
            const serviceAreaNumber =
                Number(serviceArea);

            if (
                !Number.isFinite(
                    serviceAreaNumber
                ) ||
                serviceAreaNumber <= 0
            ) {
                throw new ApiError(
                    400,
                    "Invalid service area."
                );
            }

            mechanic.serviceArea =
                serviceAreaNumber;
        }
        const uploadBufferToCloudinary = (
            buffer,
            folder
        ) => {
            return new Promise(
                (resolve, reject) => {

                    const uploadStream =
                        cloudinary.uploader.upload_stream(
                            {
                                folder,
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

                    uploadStream.end(buffer);
                }
            );
        };
        if (req.files?.profileImage?.[0]) {

            const file =
                req.files.profileImage[0];

            if (
                mechanic.documents
                    ?.profileImage
                    ?.public_id
            ) {
                try {
                    await cloudinary.uploader.destroy(
                        mechanic.documents
                            .profileImage
                            .public_id,
                        {
                            resource_type: "image",
                        }
                    );
                } catch (error) {
                    console.error(
                        "Old profile image delete failed:",
                        error.message
                    );
                }
            }

            const uploadResult =
                await uploadBufferToCloudinary(
                    file.buffer,
                    "QuickFix/Profile"
                );

            mechanic.documents.profileImage = {
                public_id:
                    uploadResult.public_id,

                url:
                    uploadResult.secure_url,
            };
        }

        if (req.files?.shopImage?.[0]) {

            const file =
                req.files.shopImage[0];

            if (
                mechanic.documents
                    ?.shopImage
                    ?.public_id
            ) {
                try {
                    await cloudinary.uploader.destroy(
                        mechanic.documents
                            .shopImage
                            .public_id,
                        {
                            resource_type: "image",
                        }
                    );
                } catch (error) {
                    console.error(
                        "Old shop image delete failed:",
                        error.message
                    );
                }
            }

            const uploadResult =
                await uploadBufferToCloudinary(
                    file.buffer,
                    "QuickFix/Shop"
                );

            mechanic.documents.shopImage = {
                public_id:
                    uploadResult.public_id,

                url:
                    uploadResult.secure_url,
            };
        }

        await user.save();
        await mechanic.save();

        const updatedMechanic =
            await Mechanic.findById(
                mechanic._id
            ).populate(
                "user",
                "-password -otp -otpExpire -refreshToken"
            );

        return res.status(200).json({
            status: true,
            message: "Profile updated successfully.",
            data: updatedMechanic,
        });
    } catch (error) {
        console.error("MECHANIC UPDATE PROFILE ERROR:",
            error
        );
        next(error);
    }
};
const startKYC = async (req, res, next) => {
    try {
        // 1. Logged-in mechanic find karo
        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });

        if (!mechanic) {
            throw new ApiError(
                404,
                "Mechanic profile not found."
            );
        }

        // 2. Already verified hai to dobara KYC start mat karo
        if (mechanic.kyc?.status === "verified") {
            throw new ApiError(
                400,
                "Your KYC is already verified."
            );
        }

        // 3. User details nikalo
        const user = await User.findById(req.user._id);

        if (!user) {
            throw new ApiError(
                404,
                "User not found."
            );
        }

        // 4. Required details check
        if (!user.name) {
            throw new ApiError(
                400,
                "User name is required for KYC."
            );
        }

        if (!user.phone) {
            throw new ApiError(
                400,
                "Phone number is required for KYC."
            );
        }

        // 5. Unique Cashfree verification ID
        const verificationId = `QF_KYC_${mechanic._id}_${Date.now()}`;
        // 6. Cashfree KYC Link generate
        const cashfreeResponse =
            await generateKYCLink({
                phone: user.phone,
                name: user.name,
                email: user.email || "",
                verificationId,
            });

        mechanic.kyc = {
            aadhaar: {
                public_id:
                    mechanic.kyc?.aadhaar?.public_id || "",
                url:
                    mechanic.kyc?.aadhaar?.url || "",
            },

            drivingLicense: {
                public_id:
                    mechanic.kyc?.drivingLicense?.public_id || "",
                url:
                    mechanic.kyc?.drivingLicense?.url || "",
            },

            provider:
                mechanic.kyc?.provider || "cashfree",

            verificationId:
                cashfreeResponse.verification_id ||
                verificationId,

            status: "verification_started",

            verifiedAt: null,

            rejectionReason: "",
        };

        // KYC complete hone tak mechanic active nahi hoga
        mechanic.isApproved = false;
        mechanic.status = "pending";

        await mechanic.save();

        // 8. Frontend ko Cashfree link return
        return res.status(200).json({
            status: true,
            message: "KYC started successfully.",

            data: {
                verificationId:
                    mechanic.kyc.verificationId,

                formLink:
                    cashfreeResponse.form_link,

                kycStatus:
                    mechanic.kyc.status,

                isApproved:
                    mechanic.isApproved,

                mechanicStatus:
                    mechanic.status,
            },
        });
    } catch (error) {
        next(error);
    }
};
const submitKYC = async (req, res, next) => {
    try {
        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });
        if (!mechanic) {
            throw new ApiError(404, "Mechanic profile not found."
            );
        }

        if (!req.files?.aadhaar?.[0]) {
            throw new ApiError(400, "Aadhaar document is required."
            );
        }
        if (!req.files?.drivingLicense?.[0]) {
            throw new ApiError(400, "Driving license is required."
            );
        }
        const uploadBufferToCloudinary = (
            buffer,
            folder
        ) => {
            return new Promise((resolve, reject) => {
                const uploadStream =
                    cloudinary.uploader.upload_stream(
                        {
                            folder,
                            resource_type: "image",
                        },
                        (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        }
                    );

                uploadStream.end(buffer);
            });
        };

        const aadhaarResult =
            await uploadBufferToCloudinary(
                req.files.aadhaar[0].buffer,
                "QuickFix/KYC/Aadhaar"
            );

        const drivingLicenseResult =
            await uploadBufferToCloudinary(
                req.files.drivingLicense[0].buffer,
                "QuickFix/KYC/DrivingLicense"
            );
        mechanic.kyc = {
            aadhaar: {
                public_id: aadhaarResult.public_id,
                url: aadhaarResult.secure_url,
            },

            drivingLicense: {
                public_id: drivingLicenseResult.public_id,
                url: drivingLicenseResult.secure_url,
            },

            provider: mechanic.kyc?.provider || "",
            verificationId: mechanic.kyc?.verificationId || "",

            status: "documents_submitted",

            verifiedAt: null,
            rejectionReason: "",
        };

        mechanic.isApproved = false;
        mechanic.status = "pending";

        await mechanic.save();
        return res.status(200).json({
            status: true,
            message: "KYC documents submitted successfully. Verification is pending.",
            data: {
                kyc: {
                    provider:
                        mechanic.kyc.provider,
                    verificationId:
                        mechanic.kyc.verificationId,
                    status:
                        mechanic.kyc.status,
                    verifiedAt:
                        mechanic.kyc.verifiedAt,
                    rejectionReason:
                        mechanic.kyc.rejectionReason,
                },
                isApproved:
                    mechanic.isApproved,

                status:
                    mechanic.status,
            },
        });

    } catch (error) {
        next(error);
    }
};
const getMechanicBookings = async (req, res, next) => {
    try {
        // --------------------------------------------------
        // FIND LOGGED-IN MECHANIC
        // --------------------------------------------------

        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });

        if (!mechanic) {
            throw new ApiError(
                404,
                "Mechanic profile not found."
            );
        }

        // --------------------------------------------------
        // TEMPORARILY REMOVE:
        // isApproved
        // isOnline
        // isAvailable
        //
        // Because assigned booking should be visible
        // even if mechanic status changes.
        // --------------------------------------------------

        // --------------------------------------------------
        // FIND ASSIGNED BOOKINGS
        // --------------------------------------------------

        const bookings = await Booking.find({
            mechanic: mechanic._id,
        })
            .populate(
                "user",
                "name email phone"
            )
            .populate("vehicle")
            .sort({
                createdAt: -1,
            });

        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        return res.status(200).json({
            status: true,
            message:
                "Mechanic bookings fetched successfully.",
            data: bookings,
            count: bookings.length,
        });

    } catch (error) {
        next(error);
    }
};
const getDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId)
            .select(
                "name email phone address role isVerified"
            );

        if (!user) {
            throw new ApiError(
                404,
                "User not found."
            );
        }
        const mechanic = await Mechanic.findOne({
            user: userId,
        }).select("-__v");

        if (!mechanic) {
            throw new ApiError(
                404,
                "Mechanic profile not found."
            );
        }

        const totalBookings =
            await Booking.countDocuments({
                mechanic: mechanic._id,
            });

        const pendingBookings =
            await Booking.countDocuments({
                mechanic: mechanic._id,
                status: "pending",
            });

        const acceptedBookings =
            await Booking.countDocuments({
                mechanic: mechanic._id,
                status: "accepted",
            });

        const ongoingBookings =
            await Booking.countDocuments({
                mechanic: mechanic._id,
                status: {
                    $in: [
                        "ongoing",
                        "in_progress",
                        "started",
                    ],
                },
            });

        const completedBookings =
            await Booking.countDocuments({
                mechanic: mechanic._id,
                status: "completed",
            });

        const cancelledBookings =
            await Booking.countDocuments({
                mechanic: mechanic._id,
                status: {
                    $in: [
                        "cancelled",
                        "rejected",
                    ],
                },
            });

        const recentBookings =
            await Booking.find({
                mechanic: mechanic._id,
            })
                .sort({
                    createdAt: -1,
                })
                .limit(5)
                .populate(
                    "user",
                    "name email phone"
                )
                .populate("vehicle")
                .lean();

        const startOfDay = new Date();
        startOfDay.setHours(
            0,
            0,
            0,
            0
        );
        const endOfDay = new Date();
        endOfDay.setHours(
            23,
            59,
            59,
            999
        );

        const todayBookings =
            await Booking.countDocuments({
                mechanic: mechanic._id,
                createdAt: {
                    $gte: startOfDay,
                    $lte: endOfDay,
                },
            });
        const earningsResult =
            await Booking.aggregate([
                {
                    $match: {
                        mechanic: mechanic._id,
                        status: "completed",
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $ifNull: [
                                    "$totalAmount",
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]);

        const totalEarnings =
            earningsResult[0]?.total || 0;
        let profileCompletion = 0;

        if (mechanic.shopName?.trim()) {
            profileCompletion += 15;
        }

        if (
            mechanic.experience !== undefined &&
            mechanic.experience !== null
        ) {
            profileCompletion += 15;
        }

        if (
            Array.isArray(
                mechanic.specialization
            ) &&
            mechanic.specialization.length > 0
        ) {
            profileCompletion += 15;
        }

        if (mechanic.description?.trim()) {
            profileCompletion += 10;
        }

        if (
            mechanic.serviceArea &&
            mechanic.serviceArea > 0
        ) {
            profileCompletion += 10;
        }

        if (
            mechanic.documents?.profileImage?.url
        ) {
            profileCompletion += 10;
        }

        if (
            mechanic.documents?.shopImage?.url
        ) {
            profileCompletion += 10;
        }

        if (
            user.address?.city &&
            user.address?.pincode
        ) {
            profileCompletion += 5;
        }
        profileCompletion = Math.min(
            profileCompletion,
            100
        );

        return res.status(200).json({
            status: true,
            message: "Mechanic dashboard fetched successfully.",
            data: {
                mechanic: {
                    id: mechanic._id,
                    userId: mechanic.user,
                    shopName:
                        mechanic.shopName || "",
                    experience:
                        mechanic.experience || 0,
                    specialization:
                        mechanic.specialization || [],
                    description:
                        mechanic.description || "",
                    serviceArea:
                        mechanic.serviceArea || 5,
                    status:
                        mechanic.status,
                    isApproved:
                        mechanic.isApproved,
                    isOnline:
                        mechanic.isOnline,
                    isAvailable:
                        mechanic.isAvailable,
                    profileCompleted:
                        mechanic.profileCompleted,

                    profileCompletedAt:
                        mechanic.profileCompletedAt,

                    location:
                        mechanic.location || null,

                    documents: {
                        profileImage:
                            mechanic.documents
                                ?.profileImage || {},

                        shopImage:
                            mechanic.documents
                                ?.shopImage || {},
                    },

                    kyc: {
                        status:
                            mechanic.kyc?.status ||
                            "not_started",

                        provider:
                            mechanic.kyc?.provider ||
                            "",

                        verificationId:
                            mechanic.kyc
                                ?.verificationId ||
                            "",
                        verifiedAt:
                            mechanic.kyc
                                ?.verifiedAt ||
                            null,
                        rejectionReason:
                            mechanic.kyc
                                ?.rejectionReason ||
                            "",
                    },
                    bankDetails: {
                        accountHolderName:
                            mechanic.bankDetails
                                ?.accountHolderName ||
                            "",
                        bankName:
                            mechanic.bankDetails
                                ?.bankName ||
                            "",
                        ifscCode:
                            mechanic.bankDetails
                                ?.ifscCode ||
                            "",
                        isVerified:
                            mechanic.bankDetails
                                ?.isVerified ||
                            false,
                    },
                },
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    isVerified:
                        user.isVerified,
                    address:
                        user.address || null,
                },

                statistics: {
                    totalBookings,
                    todayBookings,
                    pendingBookings,
                    acceptedBookings,
                    ongoingBookings,
                    completedBookings,
                    cancelledBookings,
                    totalEarnings,
                },
                profile: {
                    completion:
                        profileCompletion,
                },
                recentBookings,
            },
        });
    } catch (error) {
        next(error);
    }
};
const updateBankDetails = async (req, res, next) => {
    try {
        const {
            accountHolderName,
            accountNumber,
            ifscCode,
            branchName,
            bankName,
            upiId,
        } = req.body || {};

        if (!accountHolderName?.trim()) {
            throw new ApiError(
                400,
                "Account holder name is required."
            );
        }

        if (!accountNumber?.trim()) {
            throw new ApiError(
                400,
                "Account number is required."
            );
        }

        if (!ifscCode?.trim()) {
            throw new ApiError(
                400,
                "IFSC code is required."
            );
        }

        if (!bankName?.trim()) {
            throw new ApiError(
                400,
                "Bank name is required."
            );
        }

        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });

        if (!mechanic) {
            throw new ApiError(
                404,
                "Mechanic profile not found."
            );
        }

        mechanic.bankDetails = {
            accountHolderName:
                accountHolderName.trim(),

            accountNumber:
                accountNumber.trim(),

            ifscCode:
                ifscCode.trim().toUpperCase(),

            bankName:
                bankName.trim(),

            branchName:
                branchName?.trim() || "",

            upiId:
                upiId?.trim() || "",

            isVerified: false,
            verifiedAt: null,
            verificationId: "",
        };

        await mechanic.save();

        return res.status(200).json({
            status: true,
            message: "Bank details submitted successfully. Verification is pending.",
            data: {
                accountHolderName:
                    mechanic.bankDetails.accountHolderName,

                accountNumber:
                    mechanic.bankDetails.accountNumber,

                ifscCode:
                    mechanic.bankDetails.ifscCode,

                bankName:
                    mechanic.bankDetails.bankName,

                branchName:
                    mechanic.bankDetails.branchName,

                upiId:
                    mechanic.bankDetails.upiId,

                isVerified:
                    mechanic.bankDetails.isVerified,

                verifiedAt:
                    mechanic.bankDetails.verifiedAt,

                verificationId:
                    mechanic.bankDetails.verificationId,
            },
        });
    } catch (error) {
        next(error);
    }
};
const startBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });

        if (!mechanic) {
            throw new ApiError(
                404,
                "Mechanic profile not found."
            );
        }

        const booking = await Booking.findOne({
            _id: bookingId,
            mechanic: mechanic._id,
        });

        if (!booking) {
            throw new ApiError(
                404,
                "Booking not found."
            );
        }
        if (booking.status !== "accepted") {
            throw new ApiError(
                400,
                "Only accepted bookings can be started."
            );
        }
        booking.status = "in_progress";
        await booking.save();

        return res.status(200).json({
            status: true,
            message: "Booking started successfully.",
            data: booking,
        });
    } catch (error) {
        next(error);
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
const deleteAccount = async (req, res, next) => {
    try {

        const user = await User.findById(req.user._id);

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        await Mechanic.findOneAndDelete({
            user: user._id,
        });

        await User.findByIdAndDelete(user._id);

        res.status(200).json({
            status: true,
            message: "Account deleted successfully.",
        });

    } catch (err) {
        next(err);
    }
};
module.exports = {
    register,
    login,
    refreshAccessToken,
    resendOTP,
    forgotPassword,
    verifyOTP,
    getMechanicBookings,
    updateBankDetails,
    startKYC,
    submitKYC,
    resetPassword,
    startBooking,
    profile,
    completeProfile,
    updateProfile,
    logout,
    getDashboard,
    deleteAccount,
};
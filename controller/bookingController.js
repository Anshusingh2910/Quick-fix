const Booking = require("../model/bookingModel");
const Vehicle = require("../model/vehicleModel");
const ApiError = require("../utilities/ApiError");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const Mechanic = require("../model/mechanicModel")
const emailTemplate = require("../templates/emailTemplates");
const { sendEmail } = require("../middleware/authmiddleware")

const createBooking = async (req, res, next) => {
    try {
        const {
            vehicle,
            serviceType,
            notes,
            latitude,
            longitude,
        } = req.body;

        console.log("CREATE BOOKING");
        console.log("BODY:", req.body);
        console.log("USER:", req.user?._id);

        const lat = Number(latitude);
        const lng = Number(longitude);

        if (!Number.isFinite(lat)) {
            throw new ApiError(400, "Latitude is required.");
        }
        if (!Number.isFinite(lng)) {
            throw new ApiError(400, "Longitude is required.");
        }
        if (lat < -90 || lat > 90) {
            throw new ApiError(400, "Invalid latitude.");
        }
        if (lng < -180 || lng > 180) {
            throw new ApiError(400, "Invalid longitude.");
        }

        const allowedServiceTypes = [
            "battery",
            "puncture",
            "repair",
            "towing",
            "fuel",
            "charging",
        ];
        if (!allowedServiceTypes.includes(serviceType)) {
            throw new ApiError(400, "Invalid service type.");
        }
        const vehicleData = await Vehicle.findOne({
            _id: vehicle,
            user: req.user._id,
        });
        if (!vehicleData) {
            throw new ApiError(404, "Vehicle not found.");
        }
        const booking = await Booking.create({
            user: req.user._id,
            vehicle: vehicleData._id,
            mechanic: null,
            serviceType,
            status: "pending",
            estimatedPrice: 0,
            paymentStatus: "pending",
            notes: notes?.trim() || "",
            location: {
                type: "Point",
                coordinates: [
                    lng,
                    lat,
                ],
            },
        });
        console.log("BOOKING CREATED:", booking._id);
        console.log("BOOKING LOCATION:", booking.location);
        const populatedBooking =
            await Booking.findById(
                booking._id
            )
                .populate("vehicle"
                )
                .populate("user", "name email phone"
                );
        const user = populatedBooking.user;
        if (user?.email) {
            await sendEmail({
                to: user.email,
                subject: "Booking Confirmed - QuickFix 🚗🔧",
                html: emailTemplate({
                    title: "Booking Confirmed - QuickFix",
                    heading: `Hello ${user.name || "there"},`,
                    message: `
                            <p>
                                Your service booking has been
                                successfully created on
                                <b>QuickFix 🚗🔧</b>.
                            </p>
                            <p>
                                Our system will now look for an
                                available mechanic near your
                                location.
                            </p>
                            <br>
                            <div style="
                                background:#f8fafc;
                                border:1px solid #e2e8f0;
                                border-radius:12px;
                                padding:20px;
                            ">
                                <h3 style="
                                    margin-top:0;
                                    color:#0f172a;
                                ">
                                    Booking Details
                                </h3>
                                <p>
                                    <b>Booking ID:</b>
                                    ${booking._id}
                                </p>

                                <p>
                                    <b>Service:</b>
                                    ${serviceType
                            .charAt(0)
                            .toUpperCase() +
                        serviceType.slice(1)}
                                </p>

                                <p>
                                    <b>Vehicle:</b>
                                    ${vehicleData.company ||
                        vehicleData.brand ||
                        ""
                        }
                                    ${vehicleData.model ||
                        ""
                        }
                                </p>

                                <p>
                                    <b>Registration Number:</b>
                                    ${vehicleData.registrationNumber ||
                        "N/A"
                        }
                               </p>

                                <p>
                                    <b>Status:</b>
                                    <span style="
                                        color:#ea580c;
                                        font-weight:bold;
                                    ">
                                        Finding Mechanic
                                    </span>
                                </p>
                            </div>
                            <br>
                            <p>
                                📍 Your service location has been
                                successfully recorded.
                            </p>
                            <p>
                                🔧 We are searching for an
                                approved and available mechanic
                                near you.
                            </p>
                            <p>
                                You can track your booking from
                                your QuickFix account.
                            </p>
                            <br>
                            <p>
                                Thank you for choosing
                                <b>QuickFix ❤️</b>
                            </p>
                            <p>
                                Regards,<br>
                                <b>QuickFix Team</b>
                            </p>
                        `,
                }),
            });
        }
        return res.status(201).json({
            status: true,
            message: "Booking created successfully.",
            data: populatedBooking,
        });

    } catch (error) {
        next(error);
    }
};
const getMyBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({
            user: req.user._id,
        })
            .populate({
                path: "vehicle",
                select: "-createdAt -updatedAt -__v",
            })
            .populate({
                path: "mechanic",
                select: "shopName experience specialization documents.profileImage",
            })
            .sort({ createdAt: -1, });

        if (bookings.length === 0) {
            throw new ApiError(404, "No bookings found.");
        }
        return res.status(200).json({
            status: true,
            totalBookings: bookings.length,
            message: "Bookings fetched successfully.",
            data: bookings,
        });
    } catch (err) {
        next(err);
    }
};
const getBookingById = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findOne({
            _id: bookingId,
            user: req.user._id,
        })
            .populate({
                path: "vehicle",
                select: "-createdAt -updatedAt -__v",
            })
            .populate({
                path: "mechanic",
                select: "shopName experience specialization documents.profileImage",
            });

        if (!booking) {
            throw new ApiError(404, "Booking not found.");
        }

        return res.status(200).json({
            status: true,
            message: "Booking fetched successfully.",
            data: booking,
        });

    } catch (err) {
        next(err);
    }
};
const cancelBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findOne({
            _id: bookingId,
            user: req.user._id,
        });

        if (!booking) {
            throw new ApiError(404, "Booking not found.");
        }

        if (booking.status === "completed") {
            throw new ApiError(400, "Completed booking cannot be cancelled.");
        }

        if (booking.status === "cancelled") {
            throw new ApiError(400, "Booking is already cancelled.");
        }

        booking.status = "cancelled";
        await booking.save();
        return res.status(200).json({
            status: true,
            message: "Booking cancelled successfully.",
            data: booking,
        });

    } catch (err) {
        next(err);
    }
};
const acceptBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });
        if (!mechanic) {
            throw new ApiError(404, "Mechanic profile not found.");
        }

        if (!mechanic.isApproved) {
            throw new ApiError(403, "Mechanic is not approved.");
        }
        if (!mechanic.isOnline) {
            throw new ApiError(400, "You are offline.");
        }
        if (!mechanic.isAvailable) {
            throw new ApiError(400, "You are currently unavailable.");
        }
        const booking =
            await Booking.findOneAndUpdate(
                {
                    _id: bookingId,
                    status: "pending",
                    mechanic: null,
                },
                {
                    $set: {
                        mechanic:
                            mechanic._id,
                        status:
                            "accepted",
                    },
                },
                {
                    new: true,
                }
            )
                .populate("vehicle")
                .populate("user", "name email phone"
                )
                .populate("mechanic");
        if (!booking) {
            throw new ApiError(400, "This booking has already been accepted or is no longer available.");
        }
        mechanic.isAvailable = false;
        await mechanic.save();
        return res.status(200).json({
            status: true,
            message: "Booking accepted successfully.",
            data: booking,
        });
    } catch (error) {
        next(error);
    }
};
const rejectBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });

        if (!mechanic) {
            throw new ApiError(404, "Mechanic profile not found.");
        }
        const booking =
            await Booking.findOneAndUpdate(
                {
                    _id: bookingId,
                    status: "pending",
                    mechanic: null,
                },
                {
                    $addToSet: {
                        rejectedMechanics:
                            mechanic._id,
                    },
                },
                {
                    new: true,
                }
            );
        return res.status(200).json({
            status: true,
            message: "Booking rejected.",
            data: booking,
        });
    } catch (error) {
        next(error);
    }
};
const verifyBookingOTP = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { otp } = req.body;
        if (!otp) {
            throw new ApiError(400, "OTP is required.");
        }
        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });

        if (!mechanic) {
            throw new ApiError(404, "Mechanic profile not found.");
        }
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            throw new ApiError(404, "Booking not found.");
        }
        if (
            !booking.mechanic ||
            booking.mechanic.toString() !== mechanic._id.toString()
        ) {
            throw new ApiError(403, "You are not assigned to this booking.");
        }
        if (booking.otpVerified) {
            throw new ApiError(400, "OTP already verified.");
        }
        const isMatch = await bcrypt.compare(otp, booking.otp);
        if (!isMatch) {
            throw new ApiError(400, "Invalid OTP.");
        }
        booking.otpVerified = true;
        booking.otp = null;
        await booking.save();

        return res.status(200).json({
            status: true,
            message: "OTP verified successfully.",
            data: booking,
        });

    } catch (err) {
        next(err);
    }
};
const completeBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const mechanic = await Mechanic.findOne({
            user: req.user._id,
        });

        if (!mechanic) {
            throw new ApiError(404, "Mechanic profile not found.");
        }

        const booking = await Booking.findById(
            bookingId
        );

        if (!booking) {
            throw new ApiError(404, "Booking not found.");
        }

        if (
            !booking.mechanic ||
            booking.mechanic.toString() !== mechanic._id.toString()
        ) {
            throw new ApiError(403, "You are not assigned to this booking.");
        }
        if (
            booking.status !== "ongoing" &&
            booking.status !== "in_progress" &&
            booking.status !== "started"
        ) {
            throw new ApiError(400, "Booking is not currently in progress.");
        }
        if (!booking.otpVerified) {
            throw new ApiError(400, "Please verify OTP before completing the booking.");
        }
        booking.status = "completed";
        booking.completedAt = new Date();
        await booking.save();
        return res.status(200).json({
            status: true,
            message: "Booking completed successfully.",
            data: booking,
        });

    } catch (err) {
        next(err);
    }
};
const findMechanic = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        const {
            latitude,
            longitude,
        } = req.body || {};
        if (!bookingId) {
            throw new ApiError(400, "Booking ID is required.");
        }

        if (
            latitude === undefined ||
            longitude === undefined
        ) {
            throw new ApiError(400, "Live latitude and longitude are required.");
        }
        const lat = Number(latitude);
        const lng = Number(longitude);

        if (
            Number.isNaN(lat) ||
            Number.isNaN(lng)
        ) {
            throw new ApiError(400, "Invalid latitude or longitude.");
        }

        if (lat < -90 || lat > 90) {
            throw new ApiError(400, "Invalid latitude.");
        }
        if (lng < -180 || lng > 180) {
            throw new ApiError(400, "Invalid longitude.");
        }

        const booking = await Booking.findById(
            bookingId
        );

        if (!booking) {
            throw new ApiError(404, "Booking not found.");
        }
        if (
            booking.user.toString() !==
            req.user._id.toString()
        ) {
            throw new ApiError(403, "You are not allowed to modify this booking.");
        }

        if (booking.status !== "pending") {
            throw new ApiError(400, `Mechanic cannot be searched for a ${booking.status} booking.`);
        }
        booking.location = {
            type: "Point",
            coordinates: [lng, lat,],
        };

        await booking.save();

        const mechanics = await Mechanic.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [
                            lng,
                            lat,
                        ],
                    },
                    $maxDistance: 5000,
                },
            },
        })
            .sort({ rating: -1, })
            .limit(10)
            .select("user shopName experience specialization description serviceArea rating totalReviews location documents");

        if (!mechanics.length) {
            return res.status(200).json({
                status: true,
                found: false,
                message: "No available mechanic found near your location.",
                data: {
                    bookingId:
                        booking._id,
                    mechanics: [],
                },
            });
        }
        return res.status(200).json({
            status: true,
            found: true,
            message: "Nearby mechanics found. Waiting for mechanic acceptance.",
            data: {
                bookingId:
                    booking._id,
                mechanics:
                    mechanics.map(
                        (mechanic) => ({
                            _id:
                                mechanic._id,
                            user:
                                mechanic.user,
                            shopName:
                                mechanic.shopName,
                            experience:
                                mechanic.experience,
                            specialization:
                                mechanic.specialization,
                            description:
                                mechanic.description,
                            serviceArea:
                                mechanic.serviceArea,
                            rating:
                                mechanic.rating,
                            totalReviews:
                                mechanic.totalReviews,
                            location:
                                mechanic.location,
                            profileImage:
                                mechanic.documents
                                    ?.profileImage
                                    ?.url || "",
                        })
                    ),
            },
        });
    } catch (error) {
        next(error);
    }
};
const assignMechanic = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { mechanicId } = req.body;

        if (!bookingId) {
            throw new ApiError(
                400,
                "Booking ID is required."
            );
        }

        if (!mechanicId) {
            throw new ApiError(
                400,
                "Mechanic ID is required."
            );
        }

        const booking = await Booking.findById(
            bookingId
        );

        if (!booking) {
            throw new ApiError(
                404,
                "Booking not found."
            );
        }

        // Only booking owner can assign mechanic
        if (
            booking.user.toString() !==
            req.user._id.toString()
        ) {
            throw new ApiError(
                403,
                "You are not allowed to assign a mechanic."
            );
        }

        if (booking.status !== "pending") {
            throw new ApiError(
                400,
                `Mechanic cannot be assigned for a ${booking.status} booking.`
            );
        }

        if (booking.mechanic) {
            throw new ApiError(
                400,
                "A mechanic is already assigned to this booking."
            );
        }

        const mechanic =
            await Mechanic.findById(
                mechanicId
            );

        if (!mechanic) {
            throw new ApiError(
                404,
                "Mechanic not found."
            );
        }

        // // Mechanic must be approved
        // if (!mechanic.isApproved) {
        //     throw new ApiError(
        //         400,
        //         "This mechanic is not approved."
        //     );
        // }

        // // Mechanic must be online
        // if (!mechanic.isOnline) {
        //     throw new ApiError(
        //         400,
        //         "This mechanic is currently offline."
        //     );
        // }

        // // Mechanic must be available
        // if (!mechanic.isAvailable) {
        //     throw new ApiError(
        //         400,
        //         "This mechanic is currently unavailable."
        //     );
        // }

        // Assign mechanic
        booking.mechanic =
            mechanic._id;

        await booking.save();

        const assignedBooking =
            await Booking.findById(
                booking._id
            )
                .populate(
                    "mechanic",
                    "user shopName experience specialization description serviceArea rating totalReviews location documents"
                )
                .populate(
                    "vehicle"
                );

        return res.status(200).json({
            status: true,
            message:
                "Mechanic assigned successfully.",
            data: {
                booking:
                    assignedBooking,
                mechanic: {
                    _id:
                        mechanic._id,

                    user:
                        mechanic.user,

                    shopName:
                        mechanic.shopName,

                    experience:
                        mechanic.experience,

                    specialization:
                        mechanic.specialization,

                    rating:
                        mechanic.rating,

                    totalReviews:
                        mechanic.totalReviews,

                    location:
                        mechanic.location,

                    profileImage:
                        mechanic.documents
                            ?.profileImage
                            ?.url || "",
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
module.exports = {
    createBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
    findMechanic,
    assignMechanic,
    acceptBooking,
    rejectBooking,
    verifyBookingOTP,
    completeBooking
};
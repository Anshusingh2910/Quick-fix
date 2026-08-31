const mongoose = require("mongoose");
const mechanicSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        shopName: {
            type: String,
            trim: true,
            default: "",
        },
        experience: {
            type: Number,
            min: 0,
            default: 0,
        },
        specialization: [
            {
                type: String,
                trim: true,
            },
        ],

        description: {
            type: String,
            trim: true,
            default: "",
        },

        serviceArea: {
            type: Number,
            min: 1,
            default: 5,
        },

        documents: {
            profileImage: {
                public_id: {
                    type: String,
                    default: "",
                },
                url: {
                    type: String,
                    default: "",
                },
            },
            shopImage: {
                public_id: {
                    type: String,
                    default: "",
                },
                url: {
                    type: String,
                    default: "",
                },
            },
        },

        kyc: {
            aadhaar: {
                public_id: {
                    type: String,
                    default: "",
                },
                url: {
                    type: String,
                    default: "",
                },
            },

            drivingLicense: {
                public_id: {
                    type: String,
                    default: "",
                },
                url: {
                    type: String,
                    default: "",
                },
            },

            provider: {
                type: String,
                default: "",
            },

            verificationId: {
                type: String,
                default: "",
            },

            status: {
                type: String,
                enum: [
                    "not_started",
                    "documents_submitted",
                    "verification_started",
                    "pending",
                    "verified",
                    "failed",
                ],
                default: "not_started",
            },

            verifiedAt: {
                type: Date,
                default: null,
            },

            rejectionReason: {
                type: String,
                default: "",
                trim: true,
            },
        },
        bankDetails: {
            accountHolderName: {
                type: String,
                trim: true,
                default: "",
            },

            accountNumber: {
                type: String,
                trim: true,
                default: "",
            },

            ifscCode: {
                type: String,
                trim: true,
                uppercase: true,
                default: "",
            },

            bankName: {
                type: String,
                trim: true,
                default: "",
            },

            branchName: {
                type: String,
                trim: true,
                default: "",
            },

            upiId: {
                type: String,
                trim: true,
                default: "",
            },

            isVerified: {
                type: Boolean,
                default: false,
            },

            verifiedAt: {
                type: Date,
                default: null,
            },

            verificationId: {
                type: String,
                default: "",
            },
        },

        payout: {
            provider: {
                type: String,
                default: "",
            },

            beneficiaryId: {
                type: String,
                default: "",
            },

            status: {
                type: String,
                enum: [
                    "not_created",
                    "pending",
                    "active",
                    "blocked",
                ],
                default: "not_created",
            },

            activatedAt: {
                type: Date,
                default: null,
            },
        },
        isOnline: {
            type: Boolean,
            default: false,
        },

        isAvailable: {
            type: Boolean,
            default: false,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected",
                "suspended",
            ],
            default: "pending",
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },

            coordinates: {
                type: [Number],
                default: [0, 0],

                validate: {
                    validator: function (value) {
                        return (
                            Array.isArray(value) &&
                            value.length === 2
                        );
                    },

                    message:
                        "Location coordinates must contain [longitude, latitude].",
                },
            },
        },

        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },

        totalReviews: {
            type: Number,
            min: 0,
            default: 0,
        },

        completedJobs: {
            type: Number,
            min: 0,
            default: 0,
        },

        cancelledJobs: {
            type: Number,
            min: 0,
            default: 0,
        },

        rejectedJobs: {
            type: Number,
            min: 0,
            default: 0,
        },
        earnings: {
            total: {
                type: Number,
                min: 0,
                default: 0,
            },

            pending: {
                type: Number,
                min: 0,
                default: 0,
            },

            paid: {
                type: Number,
                min: 0,
                default: 0,
            },
        },

        profileCompleted: {
            type: Boolean,
            default: false,
        },

        profileCompletedAt: {
            type: Date,
            default: null,
        },
    },

    {
        timestamps: true,
    }
);
mechanicSchema.index({
    location: "2dsphere",
});

mechanicSchema.index({
    isApproved: 1,
    isOnline: 1,
    isAvailable: 1,
});

mechanicSchema.index({
    "kyc.status": 1,
});

mechanicSchema.index({
    status: 1,
});

module.exports = mongoose.model("Mechanic", mechanicSchema);
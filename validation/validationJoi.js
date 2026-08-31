const Joi = require("Joi");

const registerSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(16).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(16).required(),
});
const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
});


const resetPasswordSchema = Joi.object({
    password: Joi.string().min(6).max(16).required(),
});


const mechanicSchema = Joi.object({
    shopName: Joi.string().trim().required(),
    experience: Joi.number().integer().min(0).max(60).required(),
    specialization: Joi.string().required(),
    description: Joi.string().trim().min(10).max(1000).required(),
    serviceArea: Joi.number().min(1).max(20).required(),
});
const vehicleSchema = Joi.object({
    vehicleType: Joi.string()
        .valid(
            "bike",
            "car",
            "scooter",
            "truck",
            "van"
        )
        .required(),

    fuelType: Joi.string()
        .valid(
            "petrol",
            "diesel",
            "cng",
            "electric",
        )
        .required(),
    company: Joi.string().trim().min(2).max(50).required(),
    model: Joi.string().trim().min(1).max(50).required(),
    year: Joi.number().integer().optional(),
    registrationNumber: Joi.string().trim().uppercase().optional(),
});

const bookingSchema = Joi.object({
    vehicle: Joi.string().trim().required(),
    serviceType: Joi.string()
        .valid(
            "battery",
            "puncture",
            "repair",
            "towing",
            "fuel",
            "charging"
        ).required(),
    notes: Joi.string().trim().max(100).optional(),
    latitude: Joi.number()
        .min(-90)
        .max(90)
        .required(),

    longitude: Joi.number()
        .min(-180)
        .max(180)

});

module.exports = {
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    loginSchema,
    vehicleSchema,
    bookingSchema,
};
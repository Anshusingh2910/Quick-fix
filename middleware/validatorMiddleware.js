const ApiError = require("../utilities/ApiError");

const Validator = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        return next(
            new ApiError(400, error.details.map((err) => err.message).join(", "))
        );
    }
    req.body = value;
    next();
};
module.exports = Validator;

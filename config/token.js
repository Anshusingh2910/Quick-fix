const jwt = require("jsonwebtoken");

const AccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "15m",
        }
    );
};

const RefreshToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
        },
        process.env.REFRESH_JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );
};

const verificationToken = (user, type) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            type,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "20m",
        }
    );
};

module.exports = {
    AccessToken,
    RefreshToken,
    verificationToken,
};
const errorMiddleware = (err, req, res, next) => {
    let status = err.statusCode || 500;
    let message = err.message || "Something went wrong";

    if (err.code === 11000) {
        status = 400;
        message = "Data already exists with the given input";
    }

    if (err.name === "JsonWebTokenError") {
        status = 401;
        message = "Invalid token";
    }

    if (err.name === "TokenExpiredError") {
        status = 401;
        message = "Token expired. Please login again";
    }

    if (err.name === "CastError") {
        status = 400;
        message = "Invalid ID";
    }

    if (err.name === "ValidationError") {
        status = 400;

        message = Object.values(err.errors)
            .map((item) => item.message)
            .join(", ");
    }

    console.log(
        "status: ", status,
        "message: ", message,
        "timestamp: ",
        new Date(),
        "path: ",
        req.path,
    );

    res.status(status).json({
        status: false,
        message,
        timestamp: new Date(),
        path: req.path,
    });
};

module.exports = errorMiddleware;

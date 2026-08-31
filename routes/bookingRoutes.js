const express = require("express");
const {
    createBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
    acceptBooking,
    findMechanic,
    rejectBooking,
    completeBooking,
    assignMechanic,
    verifyBookingOTP,
} = require("../controller/bookingController");
const { auth } = require("../middleware/authmiddleware");
const Validator = require("../middleware/validatorMiddleware");
const { bookingSchema } = require("../validation/validationJoi");

const app = express.Router();
app.post("/create", auth, Validator(bookingSchema), createBooking);
app.get("/my-bookings", auth, getMyBookings);
app.get("/:bookingId", auth, getBookingById);
app.put("/find-mechanic/:bookingId", auth, findMechanic);
app.post("/assignMechanic/:bookingId", auth, assignMechanic);
app.put("/cancel/:bookingId", auth, cancelBooking);
app.put("/accept/:bookingId", auth, acceptBooking);
app.put("/reject/:bookingId", auth, rejectBooking);
app.put("/verifyOtp/:bookingId", auth, verifyBookingOTP);
app.put("/complete/:bookingId", auth, completeBooking);

module.exports = app;
const express = require("express");
const { auth, upload } = require("../middleware/authmiddleware");
const Validator = require("../middleware/validatorMiddleware");
const { vehicleSchema } = require("../validation/validationJoi");
const { addVehicle, getMyVehicles, getVehicleById, updateVehicle, deleteVehicle,} = require("../controller/vehicleController")

const app = express.Router();

app.post("/add", auth, Validator(vehicleSchema), addVehicle);
app.get("/my", auth, getMyVehicles);
app.get("/:vehicleId", auth, getVehicleById);
app.put("/update/:vehicleId", auth, Validator(vehicleSchema), updateVehicle);
app.delete("/delete/:vehicleId", auth, deleteVehicle)
module.exports = app;
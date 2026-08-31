const express = require("express");
const { auth } = require("../middleware/authmiddleware");
const { chat } = require("../controller/aiController");

const app = express.Router();

app.post("/chat", auth, chat);

module.exports = app;
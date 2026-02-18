/** @format */

const { Schema, model } = require("mongoose");
const Service = require("./Service");

const vehicleSchema = new Schema({
  //This is the name of the vehicle
  vehicleTitle: {
    type: String,
    required: true,
    allowNull: false,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  mileage: {
    type: Number,
    min: 0,
    default: 0,
  },
  service: [{ type: Schema.Types.ObjectId, ref: "Service" }],
});

const Vehicle = model("Vehicle", vehicleSchema);

module.exports = Vehicle;

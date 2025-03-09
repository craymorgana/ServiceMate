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
  service: [{ type: Schema.Types.ObjectId, ref: "Service" }],
});

const Vehicle = model("Vehicle", vehicleSchema);

module.exports = Vehicle;

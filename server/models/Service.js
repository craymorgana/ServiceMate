/** @format */

const { Schema, model } = require("mongoose");

const serviceSchema = new Schema({
  serviceType: {
    type: String,
    required: true,
    minlength: 1,
  },
  serviceDescription: {
    type: String,
    required: true,
  },
  mileage: {
    type: Number,
    required: true,
  },
  columnId: {
    type: String,
    required: true,
  },
  vehicleId: {
    type: Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
  },
});

const Service = model("Service", serviceSchema);

module.exports = Service;

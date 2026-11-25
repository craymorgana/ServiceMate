const { Schema, model } = require("mongoose");
const { SERVICE_COLUMNS } = require("../utils/columns");

const serviceSchema = new Schema(
	{
		serviceType: {
			type: String,
			required: true,
			trim: true,
			minlength: [1, "Service title is required"],
			maxlength: [120, "Service title must be at most 120 characters"],
		},
		serviceDescription: {
			type: String,
			required: true,
			trim: true,
			minlength: [1, "Service details are required"],
			maxlength: [2000, "Service details must be at most 2000 characters"],
		},
		mileage: {
			type: Number,
			required: true,
			min: [0, "Mileage must be a non-negative value"],
		},
		columnId: {
			type: String,
			required: true,
			enum: SERVICE_COLUMNS,
		},
		vehicleId: {
			type: Schema.Types.ObjectId,
			ref: "Vehicle",
			required: true,
		},
	},
	{ timestamps: true }
);

serviceSchema.index({ vehicleId: 1, _id: 1 });

const Service = model("Service", serviceSchema);

module.exports = Service;

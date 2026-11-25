const { Schema, model } = require("mongoose");

const vehicleSchema = new Schema(
	{
		vehicleTitle: {
			type: String,
			required: true,
			trim: true,
			minlength: [1, "Vehicle title is required"],
			maxlength: [120, "Vehicle title must be at most 120 characters"],
		},
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		mileage: {
			type: Number,
			min: 0,
			default: 0,
		},
		service: [{ type: Schema.Types.ObjectId, ref: "Service" }],
	},
	{ timestamps: true }
);

const Vehicle = model("Vehicle", vehicleSchema);

module.exports = Vehicle;

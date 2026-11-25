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
		year: { type: Number, min: 1886, max: 2100 },
		make: { type: String, trim: true },
		model: { type: String, trim: true },
		trim: { type: String, trim: true },
		vin: { type: String, trim: true, uppercase: true },
		plate: { type: String, trim: true },
		nickname: { type: String, trim: true },
		status: { type: String, enum: ["active", "sold"], default: "active" },
		source: { type: String, trim: true },
		service: [{ type: Schema.Types.ObjectId, ref: "Service" }],
	},
	{ timestamps: true }
);

vehicleSchema.index(
	{ userId: 1, vin: 1 },
	{ unique: true, partialFilterExpression: { vin: { $type: "string" } } }
);

const Vehicle = model("Vehicle", vehicleSchema);

module.exports = Vehicle;

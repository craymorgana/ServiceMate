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
			maxlength: [8000, "Service details must be at most 8000 characters"],
		},
		description: { type: String, trim: true, maxlength: 8000 },
		mileage: {
			type: Number,
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
		date: { type: Date },
		vendor: { type: String, trim: true },
		category: {
			type: String,
			enum: ["parts", "service", "tires", "fluids", "insurance", "registration", "other"],
		},
		items: [
			{
				name: { type: String, trim: true },
				partNumber: { type: String, trim: true },
				qty: { type: Number },
				unitPrice: { type: Number },
			},
		],
		total: { type: Number },
		currency: { type: String, trim: true, default: "USD" },
		orderNumber: { type: String, trim: true },
		source: { type: String, trim: true },
		emailId: { type: String, trim: true },
		emailSubject: { type: String, trim: true },
		emailReceivedAt: { type: Date },
		dedupeKey: { type: String, trim: true },
	},
	{ timestamps: true }
);

serviceSchema.index({ vehicleId: 1, date: -1, _id: -1 });
serviceSchema.index(
	{ emailId: 1 },
	{ unique: true, partialFilterExpression: { emailId: { $type: "string" } } }
);
serviceSchema.index(
	{ dedupeKey: 1 },
	{ unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } }
);

const Service = model("Service", serviceSchema);

module.exports = Service;

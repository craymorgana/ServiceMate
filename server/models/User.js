const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new Schema(
	{
		username: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			minlength: [1, "Username is required"],
			maxlength: [40, "Username must be at most 40 characters"],
		},
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
			match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email is invalid"],
		},
		password: {
			type: String,
			required: true,
			minlength: [8, "Password must be at least 8 characters"],
		},
		vehicles: [{ type: Schema.Types.ObjectId, ref: "Vehicle" }],
	},
	{ timestamps: true }
);

userSchema.pre("save", async function () {
	if (this.isNew || this.isModified("password")) {
		const saltRounds = 10;
		this.password = await bcrypt.hash(this.password, saltRounds);
	}
});

userSchema.methods.isCorrectPassword = async function (password) {
	return bcrypt.compare(password, this.password);
};

const User = model("User", userSchema);

module.exports = User;

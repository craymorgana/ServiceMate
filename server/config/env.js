const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

function mongodbUri() {
	return process.env.MONGODB_URI || "";
}

function isMongodbUri(value) {
	return value.startsWith("mongodb://") || value.startsWith("mongodb+srv://");
}

function assertMongoUri() {
	if (!isMongodbUri(mongodbUri())) {
		console.error("MONGODB_URI must be set to a mongodb connection string.");
		process.exit(1);
	}
}

function assertSecret() {
	const secret = process.env.SECRET || "";
	if (secret.length < 32) {
		console.error("SECRET must be set to a random string of at least 32 characters.");
		process.exit(1);
	}
}

function assertRuntimeEnv() {
	assertMongoUri();
	assertSecret();
}

module.exports = {
	assertMongoUri,
	assertRuntimeEnv,
	assertSecret,
	mongodbUri,
};

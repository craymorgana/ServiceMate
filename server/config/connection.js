const mongoose = require("mongoose");
const { assertMongoUri, mongodbUri } = require("./env");

assertMongoUri();

mongoose.connect(mongodbUri()).catch((err) => {
	console.error("MongoDB connection failed:", err.message);
	process.exit(1);
});

module.exports = mongoose.connection;

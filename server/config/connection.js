/** @format */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");

// Suppress deprecation warning
mongoose.set('strictQuery', false);

// Only connect if MONGODB_URI is provided and valid
const mongoUri = process.env.MONGODB_URI;
if (mongoUri && (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://'))) {
  mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).catch(err => {
    console.error('MongoDB connection error:', err.message);
  });
} else {
  console.warn('⚠️  No valid MONGODB_URI found in .env file');
  console.warn('⚠️  Get your connection string from MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
  console.warn('⚠️  Then update the MONGODB_URI in your .env file');
}

module.exports = mongoose.connection;

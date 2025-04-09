import dotenv from "dotenv";

// Load environment variables from .env.test file
dotenv.config({ path: ".env.test" });

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/test";
process.env.JWT_SECRET = "test-secret-key";
process.env.PORT = "3001";

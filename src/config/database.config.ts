import mongoose from "mongoose";
import { config } from "./app.config";

export const connectDatabase = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("Connected to database successfully");
  } catch (error) {
    console.log("Error connecting to database", error);
    process.exit(1);
  }
};

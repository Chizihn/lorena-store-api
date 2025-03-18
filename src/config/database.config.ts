import mongoose, { ConnectOptions } from "mongoose";
import { config } from "./app.config";

export const connectDatabase = async () => {
  try {
    await mongoose.connect(config.MONGO_URI, {} as ConnectOptions);
    console.log("Connected to database successfully");
  } catch (error) {
    console.log("Error connecting to database", error);
    process.exit(1);
  }
};

import { app } from "./app";
import { config } from "./config/app.config";
import { connectDatabase } from "./config/database.config";

const startServer = async () => {
  try {
    await connectDatabase(); // Connect to DB first
    app.listen(config.PORT, () => {
      console.log(`Server is running on port ${config.PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to database", err);
    process.exit(1); // Exit if DB connection fails
  }
};

startServer();

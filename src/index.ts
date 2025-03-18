import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "./config/app.config";
import { connectDatabase } from "./config/database.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import subcategoryRoutes from "./routes/subcategory.routes";
import userRoutes from "./routes/user.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";

const app = express();
const BASE_PATH = config.BASE_PATH;

// const origin =
//   config.NODE_ENV === "development"
//     ? "http://localhost:3000"
//     : config.FRONTEND_ORIGIN;

const origin =
  config.NODE_ENV === "development"
    ? "*" // Allow all origins in development
    : config.FRONTEND_ORIGIN; // Use FRONTEND_ORIGIN in production

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    credentials: true,
    origin: origin,
  })
);

app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}`, cartRoutes);
app.use(`${BASE_PATH}`, orderRoutes);
app.use(`${BASE_PATH}`, productRoutes);
app.use(`${BASE_PATH}`, categoryRoutes);
app.use(`${BASE_PATH}`, subcategoryRoutes);
app.use(`${BASE_PATH}`, userRoutes);

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello World!");
});

app.use(errorHandler);

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

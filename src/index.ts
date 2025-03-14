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
import userRoutes from "./routes/user.route";

const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    credentials: true,
    origin: config.FRONTEND_ORIGIN,
  })
);
app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}`, productRoutes);
app.use(`${BASE_PATH}`, categoryRoutes);
app.use(`${BASE_PATH}`, subcategoryRoutes);
app.use(`${BASE_PATH}`, userRoutes);

app.use(errorHandler);

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello World!");
});

app.listen(config.PORT, async () => {
  connectDatabase();
  console.log(`Server is running on port ${config.PORT}`);
});

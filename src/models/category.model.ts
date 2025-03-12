import mongoose, { Document } from "mongoose";

export interface CategoryDocument extends Document {
  name: string;
  description?: string | null;
  slug: string;
}

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
    slug: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model("Category", CategorySchema);

export default Category;

import mongoose, { Document, Types } from "mongoose";
import { Schema } from "mongoose";

export interface SubcategoryDocument extends Document {
  name: string;
  description?: string | null;
  parent?: Types.ObjectId;
  slug: string;
}

const SubcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
    slug: { type: String, required: true, unique: true },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Subcategory = mongoose.model("Subcategory", SubcategorySchema);

export default Subcategory;

import mongoose, { Document } from "mongoose";

export interface Subcategory extends Document {
  name: string;
  description?: string | null;
  parent?: mongoose.Types.ObjectId;
  image?: string;
  slug: string;
}

const SubcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
    slug: { type: String, required: true, unique: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
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

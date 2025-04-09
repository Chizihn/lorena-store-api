import { Document, Types } from "mongoose";
import { SubcategoryDocument } from "../models/subcategory.model";

export interface ProductDocument extends Document {
  id: string;
  name: string;
  image: string;
  additionalImages: string[];
  category: Types.ObjectId;
  subcategory: SubcategoryDocument;
  originalPrice: number;
  discountedPrice: number;
  rating: number;
  discountPercentage: number;
  description: string;
  shortDescription: string;
  stock: number;
  isProductNew: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  colors: string[];
  sizes: string[];
  reviewCount: number;
  tags: string[];
  slug: string;
}

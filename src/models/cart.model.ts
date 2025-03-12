import mongoose, { Document } from "mongoose";

export interface CartItemDocument extends Document {
  product: mongoose.Types.ObjectId;
  quantity: number;
  attributes?: Record<string, any>; // selected color, size, etc.
}

export interface CartDocument extends Document {
  user: mongoose.Types.ObjectId;
  items: CartItemDocument[];
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

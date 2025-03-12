import mongoose, { Document } from "mongoose";
import { IAddress } from "../interfaces/user.interface";

export interface OrderItemDocument {
  product: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  attributes?: Record<string, any>;
}

export interface OrderDocument extends Document {
  orderNumber: string;
  user: mongoose.Types.ObjectId;
  items: OrderItemDocument[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: IAddress;
  billingAddress: IAddress;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed";
  orderStatus: "processing" | "shipped" | "delivered" | "cancelled";
  notes?: string;
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

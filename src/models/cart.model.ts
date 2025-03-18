import mongoose, { Document, Schema, Types } from "mongoose";
import { ProductDocument } from "../interfaces/product.interface";

export interface CartItemDocument {
  product: ProductDocument;
  quantity: number;
}

export interface CartItem {
  product: Types.ObjectId;
  quantity: number;
}

export interface CartDocument extends Document {
  userId: Types.ObjectId;
  items: CartItemDocument[];
}

const cartSchema = new Schema<CartDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
      },
    },
  ],
});

const CartModel = mongoose.model<CartDocument>("Cart", cartSchema);
export default CartModel;

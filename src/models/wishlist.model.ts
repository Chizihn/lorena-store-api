import mongoose, { Document, Schema, Types } from "mongoose";

export interface WishlistDocument extends Document {
  id: string;
  userId: Types.ObjectId;
  products: Types.ObjectId[];
}

const walletSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  {
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString(); // Ensure id is a string
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString(); // Apply the same transform for toObject
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const WishlistModel = mongoose.model<WishlistDocument>(
  "Wishlist",
  walletSchema
);

export default WishlistModel;

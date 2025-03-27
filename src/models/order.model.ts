import mongoose, { Document, Schema, Types } from "mongoose";
import { IAddress } from "../interfaces/user.interface";
import { addressSchema } from "./user.model";
import {
  OrderStatusEnum,
  OrderStatusEnumType,
  PaymentStatusEnum,
  PaymentStatusEnumType,
} from "../enums/status.enum";
import { ProductDocument } from "../interfaces/product.interface";
import { generateOrderId } from "../utils/uuid";

export const PaymentMethodEnum = {
  CARD: "CARD",
  BANK_TRANSFER: "BANK_TRANSFER",
} as const;

export type PaymentMethodType = keyof typeof PaymentMethodEnum;

export interface OrderItemDocument {
  product: ProductDocument;
  quantity: number;
}

export interface OrderDocument extends Document {
  userId: Types.ObjectId;
  orderId: string;
  items: OrderItemDocument[];
  totalAmount: number;
  shippingAddress: IAddress;
  billingAddress: IAddress;
  paymentMethod: PaymentMethodType | null;
  paymentStatus: PaymentStatusEnumType | null;
  orderStatus: OrderStatusEnumType | null;
  notes?: string;
  trackingNumber?: string;
  paystackReference?: string;
  paymentAttempts: number;
  isConfirmed: boolean;
}

const orderSchema = new Schema<OrderDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      unique: true,
      default: generateOrderId,
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
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    shippingAddress: addressSchema,
    billingAddress: addressSchema,
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethodEnum),
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatusEnum),
      default: PaymentStatusEnum.PENDING,
    },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatusEnum),
      default: OrderStatusEnum.DRAFT,
    },
    notes: {
      type: String,
    },
    trackingNumber: {
      type: String,
    },
    paystackReference: {
      type: String,
      unique: true,
    },
    paymentAttempts: {
      type: Number,
    },
    isConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
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

const OrderModel = mongoose.model<OrderDocument>("Order", orderSchema);

export default OrderModel;

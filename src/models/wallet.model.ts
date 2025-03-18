import mongoose, { Schema } from "mongoose";
import { WalletDocument } from "../interfaces/wallet.interface";

const TransactionHistorySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const WalletSchema = new Schema<WalletDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    balance: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    transactionHistory: [TransactionHistorySchema],
  },
  { timestamps: true }
);

// Export the model
const Wallet = mongoose.model<WalletDocument>("Wallet", WalletSchema);

export { Wallet };

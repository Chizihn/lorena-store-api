import { Document } from "mongoose";
import { UserDocument } from "./user.interface";

export type TransactionType = "CREDIT" | "DEBIT";

interface TransactionHistory {
  type: TransactionType;
}

export interface WalletDocument extends Document {
  user: UserDocument;
  amount: number; // Current balance of the wallet
  currency: string; // Currency (e.g., USD, EUR)
  transactionHistory: TransactionHistory;
}

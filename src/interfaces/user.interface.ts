import { Document, Types } from "mongoose";
import { CartDocument } from "../models/cart.model";
import { OrderDocument } from "../models/order.model";
import { WalletDocument } from "./wallet.interface";
import { UserStatusEnumType } from "../enums/status.enum";

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

interface PaymentMethod {
  type: "credit" | "debit" | "paypal" | "other";
  isDefault: boolean;
  lastFour: string;
  expiryDate: string;
}

interface UserPreferences {
  notifications: {
    email: boolean;
    sms: boolean;
  };
  currency: string;
  language: string;
}

interface RecentSearch {
  query: string;
  timestamp: Date;
}

export interface UserDocument extends Document {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone: string;
  dob: Date | null;
  role: string[];
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationTokenExpires: Date | null;
  addresses: IAddress[];
  profileImage: string | null;
  wishlist: Types.ObjectId;
  passwordResetToken: string;
  passwordResetTokenExpires: Date | null;
  orders: OrderDocument[];
  cart: CartDocument | null;
  paymentMethods: PaymentMethod[];
  preferences: UserPreferences;
  status: UserStatusEnumType;
  recentSearches: RecentSearch[];
  wallet: WalletDocument;
  createWallet: () => Promise<void>;
  comparePassword: (value: string) => Promise<boolean>;
  omitPassword(): Omit<UserDocument, "password">;
}

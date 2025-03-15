import mongoose, { Schema } from "mongoose";
import { RolesEnum } from "../enums/roles.enum";
import { compareValue, hashValue } from "../utils/bcrypt";
import { UserDocument } from "../interfaces/user.interface";
import { StatusEnum } from "../enums/status.enum";
import { Wallet } from "./wallet.model";

const addressSchema = new mongoose.Schema({
  street: { type: String, required: [true, "Street address is required"] },
  city: { type: String, required: [true, "City is required"] },
  state: { type: String, required: [true, "State is required"] },
  zipCode: { type: String, required: [true, "Zip code is required"] },
  country: { type: String, required: [true, "Country is required"] },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema<UserDocument>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (email) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
    password: {
      type: String,
      select: true,
    },
    dob: {
      type: Date,
      default: null,
      required: false,
    },
    role: {
      type: [String],
      enum: Object.values(RolesEnum),
      default: [RolesEnum.USER],
    },

    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationTokenExpires: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetTokenExpires: {
      type: Date,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    addresses: [addressSchema],
    phone: {
      type: String,
    },
    profileImage: {
      type: String,
      default: null,
    },
    wishlist: {
      type: Schema.Types.ObjectId,
      ref: "Wishlist",
    },

    orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
    cart: { type: Schema.Types.ObjectId, ref: "Cart", default: null },
    paymentMethods: [
      {
        type: { type: String, enum: ["credit", "debit", "paypal", "other"] },
        isDefault: Boolean,
        lastFour: String,
        expiryDate: String,
      },
    ],
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      currency: { type: String, default: "USD" },
      language: { type: String, default: "en" },
    },
    status: {
      type: String,
      enum: Object.values(StatusEnum),
      default: StatusEnum.ACTIVE,
    },
    recentSearches: [
      {
        query: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    wallet: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
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

// Add a method to create a wallet for the user
userSchema.methods.createWallet = async function (): Promise<void> {
  if (this.wallet) {
    throw new Error("This user already has a wallet");
  }

  // Create the wallet document
  const wallet = new Wallet({
    user: this._id,
  });

  // Save the wallet
  await wallet.save();

  this.wallet = wallet._id;

  // Save the user document with the new wallet reference
  await this.save();
};

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    if (this.password) {
      this.password = await hashValue(this.password);
    }
  }
  next();
});

userSchema.methods.omitPassword = function (): Omit<UserDocument, "password"> {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

userSchema.methods.comparePassword = async function (value: string) {
  return compareValue(value, this.password);
};

const UserModel = mongoose.model<UserDocument>("User", userSchema);

export default UserModel;

import mongoose, { Schema } from "mongoose";
import slugify from "slugify";
import { ColorEnum, SizeEnum } from "../enums/product.enum";
import { ProductDocument } from "../interfaces/product.interface";

const productSchema = new Schema<ProductDocument>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Main product image is required"],
    },
    additionalImages: {
      type: [String],
      default: [],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: "Subcategory",
    },
    originalPrice: {
      type: Number,
      required: [true, "Original price is required"],
      min: 0,
    },
    discountedPrice: {
      type: Number,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    shortDescription: {
      type: String,
      maxlength: 200,
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: 0,
      default: 0,
    },
    isProductNew: {
      // Renamed field
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isOnSale: {
      type: Boolean,
      default: false,
    },
    colors: {
      type: [String],
      enum: Object.values(ColorEnum),
      default: [],
    },
    sizes: {
      type: [String],
      enum: Object.values(SizeEnum),
      default: [],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    slug: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

// Create slug from the name
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true });
  }

  // Auto-calculate discounted price and percentage if one changes
  if (
    this.isModified("originalPrice") ||
    this.isModified("discountPercentage")
  ) {
    if (this.discountPercentage > 0) {
      this.discountedPrice =
        this.originalPrice * (1 - this.discountPercentage / 100);
    } else {
      this.discountedPrice = this.originalPrice;
    }
  } else if (
    this.isModified("discountedPrice") &&
    this.discountedPrice < this.originalPrice
  ) {
    this.discountPercentage =
      ((this.originalPrice - this.discountedPrice) / this.originalPrice) * 100;
  }

  // Auto-set isOnSale if there's a discount
  this.isOnSale = this.discountPercentage > 0;

  next();
});

// Index for improved search performance
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isOnSale: 1, isFeatured: 1, isProductNew: 1 }); // Adjusted here as well

const ProductModel = mongoose.model<ProductDocument>("Product", productSchema);

export default ProductModel;

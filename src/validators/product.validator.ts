import { z } from "zod";
import { ColorEnum, SizeEnum } from "../enums/product.enum";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// const CategorySchema = z.object({
//   _id: z.string().min(1, { message: "Category ID is required" }),
//   name: z.string().min(1, { message: "Category name is required" }),
//   description: z.string().optional(),
//   slug: z
//     .string()
//     .regex(slugRegex, { message: "Invalid slug format" })
//     .optional(),
// });

// const SubcategorySchema = z.object({
//   _id: z.string().optional(),
//   name: z.string().optional(),
//   description: z.string().optional(),
//   parent: z.string().optional(),
//   slug: z
//     .string()
//     .regex(slugRegex, { message: "Invalid slug format" })
//     .optional(),
// });

export const ProductSchema = z.object({
  name: z.string().min(1, { message: "Product name is required" }).trim(),

  image: z
    .string()
    .min(1, { message: "Main product image is required" })
    .optional(),

  additionalImages: z.array(z.string()).default([]).optional(),

  category: z.string().min(2),

  subcategory: z.string().min(2).optional(),

  originalPrice: z
    .number()
    .min(0, { message: "Original price must be greater than or equal to 0" }),

  discountedPrice: z.number().min(0).optional(),

  rating: z.number().min(0).max(5).default(0),

  discountPercentage: z.number().min(0).max(100).default(0).optional(),

  description: z
    .string()
    .min(1, { message: "Product description is required" }),

  shortDescription: z.string().max(200).optional(),

  stock: z
    .number()
    .min(0, { message: "Stock quantity must be greater than or equal to 0" })
    .default(0),

  isProductNew: z.boolean().default(true).optional(),

  isFeatured: z.boolean().default(false).optional(),

  isOnSale: z.boolean().default(true).optional(),

  colors: z
    .array(z.enum(Object.values(ColorEnum) as [string, ...string[]]))
    .default([])
    .optional(),

  sizes: z
    .array(z.enum(Object.values(SizeEnum) as [string, ...string[]]))
    .default([])
    .optional(),

  reviewCount: z.number().min(0).default(0).optional(),

  tags: z.array(z.string()).default([]),

  slug: z
    .string()
    .min(1, { message: "Slug is required" })
    .regex(slugRegex, {
      message:
        "Slug must be a valid format (lowercase, alphanumeric, hyphenated)",
    })
    .optional(),
});

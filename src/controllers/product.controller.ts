import { NextFunction, Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config";
import { BadRequestException, NotFoundException } from "../utils/appError";
import { ErrorCodeEnum } from "../enums/error-code.enum";
import ProductModel from "../models/product.model";
import { ProductSchema } from "../validators/product.validator";
import Category from "../models/category.model";
import Subcategory from "../models/subcategory.model";
import UserModel from "../models/user.model";
import { AuthenticatedRequest } from "../@types/custom.type";
import { Types } from "mongoose";

export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Populate the category field with full  data
    const products = await ProductModel.find().populate("category").lean();

    if (products.length === 0) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        error: "No products found",
        errorCode: ErrorCodeEnum.PRODUCTS_NOT_FOUND,
      });
    }

    return res.status(HTTPSTATUS.OK).json(products); // Send the populated products back to the client
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    next(error); // Pass the error to the next middleware
  }
};

export const getSingleProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await ProductModel.findById(req.params.id)
      .populate("category")
      .lean();

    if (!product) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        error: "Product not found",
        errorCode: ErrorCodeEnum.PRODUCT_NOT_FOUND,
      });
    }

    return res.status(HTTPSTATUS.OK).json(product);
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { slug } = req.params;

  // Basic validation for slug
  if (!slug || typeof slug !== "string" || slug.trim() === "") {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      error: "Invalid slug provided",
      errorCode: ErrorCodeEnum.INVALID_SLUG,
    });
  }

  try {
    // Find product by slug
    const product = await ProductModel.findOne({ slug: slug })
      .populate("category")
      .lean();

    if (!product) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        error: "Product not found",
        errorCode: ErrorCodeEnum.PRODUCT_NOT_FOUND,
      });
    }

    // Return the product if found
    return res.status(HTTPSTATUS.OK).json(product);
  } catch (error) {
    console.error("Error fetching product by slug:", error);
    next(error); // Forward to the global error handler
  }
};

export const addProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Zod will throw an error if the validation fails
    const validatedData = ProductSchema.parse(req.body);

    const category = await Category.findById(validatedData.category);
    if (!category) {
      throw new NotFoundException(
        "Category not found",
        ErrorCodeEnum.NOT_FOUND
      );
    }

    const subcategory = validatedData?.subcategory
      ? await Subcategory.findById(validatedData?.subcategory)
      : null;

    // Check if the slug already exists
    const checkSlug = await ProductModel.findOne({ slug: validatedData.slug });
    if (checkSlug) {
      throw new BadRequestException(
        "Slug already exists",
        ErrorCodeEnum.ALREADY_EXISTS
      );
    }

    // Generate a slug if it doesn't exist in the request body
    if (!validatedData.slug) {
      validatedData.slug = validatedData.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""); // This regex removes any non-alphanumeric characters (except '-')
    }

    // Proceed with creating the product
    const newProduct = new ProductModel({
      ...validatedData,
      category: category._id,
      subcategory: subcategory ? subcategory._id : null,
    });
    await newProduct.save();

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Product added successfully",
      data: newProduct,
    });
  } catch (error) {
    next(error);
  }
};

export const addToWishList = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?._id;
  const productId = req.params.id;

  try {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error("User not found");

    const productObjectId = new Types.ObjectId(productId);

    if (user.wishList.includes(new Types.ObjectId(productObjectId))) {
      throw new Error("Product is already in the wishlist");
    }

    user.wishList.push(productObjectId);

    // Save the user document
    await user.save();

    res.status(200).json({ message: "Product added to wishlist" });
  } catch (error) {
    next(error);
  }
};

export const removeFromWishList = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?._id;
  const productId = req.params.id;

  try {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error("User not found");

    // Convert the productId to ObjectId
    const productObjectId = new Types.ObjectId(productId);

    // Check if the product exists in the wishlist
    const isProductInWishList = user.wishList.includes(productObjectId);

    if (!isProductInWishList) {
      throw new Error("Product not found in the wishlist");
    }

    user.wishList = user.wishList.filter((id) => !id.equals(productObjectId));

    // Save the user document with the updated wishList
    await user.save();

    res.status(200).json({ message: "Product removed from wishlist" });
  } catch (error) {
    next(error);
  }
};

// {
//     "name": "Awesome Wireless Headphones",
//     "slug": "awesome-wireless-headphones",
//     "image": "https://example.com/images/headphones.jpg",
//     "additionalImages": [
//       "https://example.com/images/headphones-1.jpg",
//       "https://example.com/images/headphones-2.jpg"
//     ],
//     "category": "67d1d1c93ad2455870dc5756",,  // Replace with a valid Category ObjectId
//     "subcategory": "603d2c3f8a4b3d3e7d5c78c4",  // Replace with a valid Subcategory ObjectId (optional)
//     "originalPrice": 99.99,
//     "discountedPrice": 79.99,
//     "rating": 4.5,
//     "discountPercentage": 20,
//     "description": "These are premium wireless headphones with noise-cancelling technology and long-lasting battery life.",
//     "shortDescription": "Premium wireless headphones with noise-cancelling and great battery life.",
//     "stock": 50,
//     "isProductNew": true,
//     "isFeatured": true,
//     "isOnSale": true,
//     "colors": ["BLACK", "RED", "BLUE"],  // Valid ColorEnum values
//     "sizes": ["M", "L", "XL"],  // Valid SizeEnum values
//     "reviewCount": 150,
//     "tags": ["electronics", "headphones", "wireless"],
//     "slug": "awesome-wireless-headphones"  // Optional: You can leave this out, and it will be generated automatically if needed
//   }

// export const updateProduct = async (req: Request, res: Response) => {
//     const validatedData =
//     }

// export const deleteProduct = async (req: Request, res: Response) => {
//         const validatedData =
//         }

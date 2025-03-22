import { NextFunction, Response } from "express";
import CartModel, { CartItemDocument } from "../models/cart.model";
import { AuthenticatedRequest } from "../@types/custom.type";
import { HTTPSTATUS } from "../config/http.config";
import ProductModel from "../models/product.model";

//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const userId = req.user?._id;

//     // Find the cart and populate the product details in items.productId
//     const cart = await CartModel.findOne({ userId })
//       .populate("items.product")
//       .lean(); // Use .lean() to get a plain JavaScript object

//     // Check if the cart exists and if the cart has items
//     if (!cart) {
//       return res.status(200).json({ message: "No cart found for this user" });
//     }

//     // If the cart exists but has no items, send a response accordingly
//     if (cart.items.length === 0) {
//       return res.status(200).json({ message: "Cart is empty" });
//     }

//     // If the cart has items, return the cart with product details
//     // In your getCart controller
//     return res.status(200).json({ items: cart.items });
//   } catch (error) {
//     next(error);
//   }
// };

// The getCart function retrieves the cart details for a user, including product information and total price.
export const getCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    console.log("user", userId);

    // Populate with all the fields you need
    const cart = await CartModel.findOne({ userId }).populate({
      path: "items.product",
      model: "Product",
      select: "_id id discountedPrice originalPrice",
    });

    if (!cart) {
      return res.status(200).json({ message: "No cart found for this user" });
    }

    if (cart.items.length === 0) {
      return res.status(200).json({ message: "Cart is empty" });
    }

    const totalAmount = cart.items.reduce((sum, item) => {
      const product = item.product;
      console.log("product", product);

      const price = product.discountedPrice || product.originalPrice;
      console.log("price", price);

      return sum + price * item.quantity;
    }, 0);

    console.log("totalAmount", totalAmount);

    return res
      .status(200)
      .json({ items: cart.items, totalAmount: totalAmount });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    console.log("cart user", userId);

    const { product, quantity } = req.body;
    console.log("cartp q", { product, quantity });

    let cart = await CartModel.findOne({ userId });

    if (!cart) {
      cart = new CartModel({
        userId,
        items: [{ product, quantity }],
      });
    } else {
      // If cart exists, check if the item is already in the cart
      const existingItem = cart.items.find(
        (item) => item.product.toString() === product
      );

      if (existingItem) {
        // If the item is already in the cart, update the quantity
        existingItem.quantity += quantity;
      } else {
        const cartItem: CartItemDocument = {
          product,
          quantity,
        };
        cart.items.push(cartItem);
      }
    }

    // Save the updated cart
    await cart.save();

    return res.status(HTTPSTATUS.CREATED).json(cart);
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    const { id } = req.params;

    // Find the user's cart
    const cart = await CartModel.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Find the index of the item to be removed
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === id
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Remove the item from the cart
    cart.items.splice(itemIndex, 1);

    // Save the updated cart
    await cart.save();

    return res.status(200).json(cart); // Return the updated cart
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    // Find the user's cart
    const cart = await CartModel.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Clear the items array
    cart.items = [];

    // Save the updated cart (with no items)
    await cart.save();

    return res.status(200).json({ message: "Cart has been cleared", cart });
  } catch (error) {
    next(error);
  }
};

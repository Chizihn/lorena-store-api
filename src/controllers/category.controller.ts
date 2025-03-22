import { NextFunction, Request, Response } from "express";
import Category from "../models/category.model";
import { HTTPSTATUS } from "../config/http.config";

// Get categories
export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await Category.find().lean();

    if (categories.length === 0) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        error: "No categories found ",
      });
    }

    return res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

// Create category
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, slug } = req.body;

  try {
    const category = new Category({ name, slug });
    await category.save();
    return res
      .status(201)
      .json({ message: "Category created successfully!", category });
  } catch (error) {
    next(error);
  }
};

// Update category
export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { name, slug } = req.body;

  try {
    // Find and update category by ID
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, slug },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        error: "Category not found",
      });
    }

    return res.status(200).json({
      message: "Category updated successfully",
      updatedCategory,
    });
  } catch (error) {
    next(error);
  }
};

// Delete category
export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    // Find and delete category by ID
    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        error: "Category not found",
      });
    }

    return res.status(200).json({
      message: "Category deleted successfully",
      deletedCategory,
    });
  } catch (error) {
    next(error);
  }
};

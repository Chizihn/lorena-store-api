import { NextFunction, Request, Response } from "express";
import Category from "../models/category.model";
import Subcategory from "../models/subcategory.model";

// Create subcategory
export const createSubcategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, slug, categoryId } = req.body;

  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const subcategory = new Subcategory({ name, slug, category: category._id });
    await subcategory.save();
    return res
      .status(201)
      .json({ message: "Subcategory created successfully!", subcategory });
  } catch (error) {
    next(error);
  }
};

// Get subcategories
export const getSubcategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subcategories = await Subcategory.find().populate("category");
    return res.status(200).json(subcategories);
  } catch (error) {
    next(error);
  }
};

// Update subcategory
export const updateSubcategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { name, slug, categoryId } = req.body;

  try {
    // Check if the category exists before updating the subcategory
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Find and update subcategory by ID
    const updatedSubcategory = await Subcategory.findByIdAndUpdate(
      id,
      { name, slug, category: category._id },
      { new: true, runValidators: true }
    );

    if (!updatedSubcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    return res.status(200).json({
      message: "Subcategory updated successfully",
      updatedSubcategory,
    });
  } catch (error) {
    next(error);
  }
};

// Delete subcategory
export const deleteSubcategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    // Find and delete subcategory by ID
    const deletedSubcategory = await Subcategory.findByIdAndDelete(id);

    if (!deletedSubcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    return res.status(200).json({
      message: "Subcategory deleted successfully",
      deletedSubcategory,
    });
  } catch (error) {
    next(error);
  }
};

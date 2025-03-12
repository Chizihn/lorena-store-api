import { NextFunction, Request, Response } from "express";
import Category from "../models/category.model";
import Subcategory from "../models/subcategory.model";

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

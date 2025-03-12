import { NextFunction, Request, Response } from "express";
import Category from "../models/category.model";
import { HTTPSTATUS } from "../config/http.config";
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

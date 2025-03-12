import { z } from "zod";

// Login Schema
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address").trim(),
  password: z.string().min(6, "Password must have a min of 6 characters"),
});

// Create Account Schema
export const CreateAccountSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must have a min of 6 characters"),
});

// Verify Email Schema
export const VerifyEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z
    .string()
    .min(1, "Token is required")
    .max(6, "6 characters are required"),
});

// Forgot Password Schema
export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Reset Password Schema
export const ResetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, "Token is required")
    .max(6, "6 characters are required"),

  email: z.string().email("Invalid email address").trim(),
  newPassword: z.string().min(6, "Password must have a min of 6 characters"),
});

// Update Profile Schema
export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNo: z.string().optional(),
  dob: z.date().optional(),
  addresses: z
    .array(
      z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string(),
      })
    )
    .optional(),
  profileImage: z.string().optional(),
});

// Type Inference
export type LoginData = z.infer<typeof LoginSchema>;
export type CreateAccountData = z.infer<typeof CreateAccountSchema>;
export type VerifyEmailData = z.infer<typeof VerifyEmailSchema>;
export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>;
export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>;

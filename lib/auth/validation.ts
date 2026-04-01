import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Your name is required."),
  businessName: z.string().trim().min(2, "Business name is required."),
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
});

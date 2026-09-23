import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(2).max(150),
  sku: z.string().trim().max(80).optional().or(z.literal("")),
  barcode: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  costPrice: z.coerce.number().min(0).max(999999999),
  sellingPrice: z.coerce.number().min(0).max(999999999),
  taxRate: z.coerce.number().min(0).max(100),
  lowStockAlert: z.coerce.number().int().min(0).max(100000),
  openingStock: z.coerce.number().int().min(0).max(100000000).optional(),
  expiryDate: z.string().optional().nullable(),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
});

export const accountSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
});

export function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error("Validation failed");
    error.status = 422;
    error.issues = result.error.issues;
    throw error;
  }
  return result.data;
}

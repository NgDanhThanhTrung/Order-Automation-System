// =============================================================================
// Products Routes
// GET /api/products       — Danh sách sản phẩm active
// GET /api/products/:id   — Chi tiết 1 sản phẩm
// =============================================================================

import { Router, type IRouter, type Request, type Response } from "express";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { NotFoundError } from "../middlewares/errorHandler.js";
import type { ApiResponse, Product } from "../types/index.js";

const router: IRouter = Router();

// GET /api/products
router.get("/", async (_req: Request, res: Response) => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const response: ApiResponse<Product[]> = {
    success: true,
    data: data ?? [],
  };

  res.json(response);
});

// GET /api/products/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new NotFoundError("Product");
  }

  const response: ApiResponse<Product> = {
    success: true,
    data,
  };

  res.json(response);
});

export default router;

import { Router } from "express";
import { z } from "zod";

const priceSchema = z.object({
  unitCost: z
    .number({ error: "Unit cost must be numeric." })
    .finite()
    .positive("Unit cost must be greater than 0.")
    .max(1e8, "Unit cost is too large."),
  status: z.enum(["estimate", "quoted"]).default("quoted"),
  quoteRef: z.string().trim().max(120).default(""),
});

export function priceRoutes(prices) {
  const router = Router();
  router.get("/", (_req, res) => res.json(prices.list()));
  router.put("/:key", (req, res) => {
    const result = priceSchema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({
        error: "Please check the highlighted fields.",
        fields: Object.fromEntries(
          result.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      });
    const price = prices.set(req.params.key, result.data);
    if (!price)
      return res.status(404).json({ error: "This price could not be found." });
    res.json(price);
  });
  router.delete("/:key", (req, res) => {
    const price = prices.reset(req.params.key);
    if (!price)
      return res.status(404).json({ error: "This price could not be found." });
    res.json(price);
  });
  return router;
}

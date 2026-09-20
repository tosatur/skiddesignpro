import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { designConfig } from "./config/designConfig.js";
import { designRoutes } from "./routes/designRoutes.js";

export function createApp(
  store,
  { testToolsEnabled = process.env.SPN_ENABLE_TEST_TOOLS === "true" } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    const origin = req.get("Origin");
    const allowed = [
      `http://${req.get("Host")}`,
      "http://127.0.0.1:5173",
      "http://localhost:5173",
    ];
    if (
      ["POST", "PUT", "DELETE"].includes(req.method) &&
      origin &&
      !allowed.includes(origin)
    )
      return res
        .status(403)
        .json({ error: "Open this app locally to save changes." });
    next();
  });
  app.use(express.json({ limit: "100kb" }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/config", (_req, res) => {
    const { wastewater, chemicals, space, defaults, inputLimits } =
      designConfig;
    res.json({
      wastewater,
      chemicals,
      space,
      defaults,
      inputLimits,
      testToolsEnabled,
    });
  });
  app.use("/api/designs", designRoutes(store, { testToolsEnabled }));
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API endpoint not found." }),
  );
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*path}", (_req, res) => res.sendFile(`${dist}/index.html`));
  }
  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({
      error:
        status >= 500
          ? "Could not complete the request. Please try again."
          : error.message,
      fields: error.fields,
    });
  });
  return app;
}

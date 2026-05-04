import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  // Works whether boot.js is in /app/dist/ or /app/dist/public/
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPublic = path.resolve(__dirname, "../../dist/public");
  const distRoot = path.resolve(__dirname, "../dist/public");

  const staticPath = fs.existsSync(distPublic)
    ? "../../dist/public"
    : fs.existsSync(distRoot)
    ? "../dist/public"
    : "./dist/public";

  const indexPath = fs.existsSync(distPublic)
    ? path.resolve(distPublic, "index.html")
    : path.resolve(distRoot, "index.html");

  app.use("*", serveStatic({ root: staticPath }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    try {
      const content = fs.readFileSync(indexPath, "utf-8");
      return c.html(content);
    } catch {
      return c.json({ error: "Frontend not found" }, 404);
    }
  });
}

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { render as renderProduction } from "../../client/src/entry-server";

/**
 * Serves the pre-built client and SSR output in production. This module has no
 * development-server dependency so it is safe to load in the slim Cloud Run
 * runtime image, which intentionally excludes Vite.
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      "Could not find the build directory: make sure to build the client first"
    );
  }

  app.use(express.static(distPath, { index: false }));

  app.use("*", async (req, res, next) => {
    try {
      const template = await fs.promises.readFile(
        path.resolve(distPath, "index.html"),
        "utf-8"
      );
      const rendered = await renderProduction(req.originalUrl);
      const page = template
        .replace("<!--app-head-->", rendered.head)
        .replace("<!--app-html-->", rendered.html);
      res
        .status(rendered.status)
        .set({ "Content-Type": "text/html" })
        .end(page);
    } catch (error) {
      next(error);
    }
  });
}

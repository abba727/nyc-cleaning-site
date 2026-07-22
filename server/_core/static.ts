import compression from "compression";
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

  // The middleware negotiates Brotli for supported clients and gzip otherwise.
  // It applies only to compressible response types, leaving already-compressed
  // image formats untouched.
  app.use(compression({ threshold: 1024 }));

  app.use(
    express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        // Vite emits content-hashed client artifacts beneath dist/public/assets.
        // These filenames change whenever their content changes, so browsers can
        // retain them indefinitely without risking stale application code.
        const relativePath = path.relative(distPath, filePath);
        const isHashedBuildAsset = relativePath.split(path.sep)[0] === "assets";
        const isSelfHostedFont = relativePath.startsWith(`fonts${path.sep}`) && relativePath.endsWith(".woff2");
        res.setHeader(
          "Cache-Control",
          isHashedBuildAsset || isSelfHostedFont
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600"
        );
      },
    })
  );

  app.use("*", async (req, res, next) => {
    try {
      const template = await fs.promises.readFile(
        path.resolve(distPath, "index.html"),
        "utf-8"
      );
      const rendered = await renderProduction(req.originalUrl);
      const page = template
        .replace("<!--app-head-->", rendered.head)
        .replace("<!--app-html-->", rendered.html)
        .replace("<!--analytics-script-->", rendered.body);
      res
        .status(rendered.status)
        .set({
          "Content-Type": "text/html",
          "Cache-Control": "no-cache",
        })
        .end(page);
    } catch (error) {
      next(error);
    }
  });
}

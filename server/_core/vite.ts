import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { render as renderProduction } from "../../client/src/entry-server";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const resolvedViteConfig = typeof viteConfig === "function"
    ? await viteConfig({ command: "serve", mode: "development", isSsrBuild: false, isPreview: false })
    : await viteConfig;

  const vite = await createViteServer({
    ...resolvedViteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/entry-client.tsx"`, `src="/src/entry-client.tsx?v=${nanoid()}"`);
      template = await vite.transformIndexHtml(url, template);
      const entry = await vite.ssrLoadModule("/src/entry-server.tsx");
      const rendered = await entry.render(url) as { html: string; head: string; status: number };
      const page = template.replace("<!--app-head-->", rendered.head).replace("<!--app-html-->", rendered.html);
      res.status(rendered.status).set({ "Content-Type": "text/html", "Cache-Control": "no-store" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath, { index: false, redirect: false }));

  app.use("*", async (req, res, next) => {
    try {
      const template = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");
      const rendered = await renderProduction(req.originalUrl);
      const page = template.replace("<!--app-head-->", rendered.head).replace("<!--app-html-->", rendered.html);
      res.status(rendered.status).set({ "Content-Type": "text/html", "Cache-Control": "no-store" }).end(page);
    } catch (error) {
      next(error);
    }
  });
}

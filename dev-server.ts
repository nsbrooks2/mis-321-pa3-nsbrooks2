import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "./api/server.js";

async function startDevServer() {
  const app = await createServer();
  
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  
  app.use(vite.middlewares);
  
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Dev] Server running on http://localhost:${PORT}`);
  });
}

startDevServer();

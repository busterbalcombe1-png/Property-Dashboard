import express from "express";
import cors from "cors";
import path from "path";
import router from "./routes/index.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/uploads", express.static(path.join(process.cwd(), "artifacts/api-server/uploads")));
app.use("/api", router);

// Only serve the built frontend when running locally as a combined server.
// On Vercel the static files are served by the CDN and only /api/* hits this function.
if (!process.env.VERCEL) {
  const frontendPath = path.join(
    process.cwd(),
    "artifacts/property-dashboard/dist/public",
  );
  app.use(express.static(frontendPath));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

export default app;

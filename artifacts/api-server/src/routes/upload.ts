import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, propertiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const uploadsDir = path.join(process.cwd(), "artifacts/api-server/uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
  // Serverless environments have a read-only filesystem — uploads won't persist
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `property-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const router: IRouter = Router();

router.post("/properties/:id/photo", upload.single("photo"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const photoUrl = `/api/uploads/${req.file.filename}`;
    const [row] = await db
      .update(propertiesTable)
      .set({ photoUrl, updatedAt: new Date() })
      .where(eq(propertiesTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Property not found" });
    res.json({ photoUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

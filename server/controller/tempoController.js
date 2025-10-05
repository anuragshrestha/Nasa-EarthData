import fs from "fs";
import path from "path";

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

export const ingestTempoImage = async (req, res) => {
  try {
    const { imageUrl, bbox } = req.query;
    if (!imageUrl || !bbox) {
      return res.status(400).json({ error: "imageUrl and bbox are required" });
    }

    // Parse bbox: minx,miny,maxx,maxy
    const parts = String(bbox).split(",").map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      return res.status(400).json({ error: "bbox must be minx,miny,maxx,maxy" });
    }
    const [minx, miny, maxx, maxy] = parts;

    const outDir = path.join(process.cwd(), "static", "tempo_out");
    await ensureDir(outDir);

    const fileName = `tempo_no2_${Date.now()}.png`;
    const outPath = path.join(outDir, fileName);

    const resp = await fetch(imageUrl);
    if (!resp.ok) {
      const body = await resp.text();
      return res.status(resp.status).json({ error: "Failed to fetch image", body });
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    await fs.promises.writeFile(outPath, buf);

    const publicUrl = `/static/tempo_out/${fileName}`;
    return res.json({ url: publicUrl, bounds: { west: minx, south: miny, east: maxx, north: maxy } });
  } catch (error) {
    console.error("ingestTempoImage failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



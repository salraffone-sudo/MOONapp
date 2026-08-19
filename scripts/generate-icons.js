// Regenerates the static home-screen icon set as plain PNG files in
// public/icons/. Run manually with `node scripts/generate-icons.js` any time
// you want to tweak the crescent's shape (k = illumination fraction, waxing =
// which side is lit) — it does NOT run automatically at build or deploy time.
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const pngToIco = require("png-to-ico").default;
const { renderIconSvg } = require("../lib/moonSvg.js");

const OUT_DIR = path.join(__dirname, "..", "public", "icons");
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SIZES = [16, 32, 180, 192, 512];
const K = 0.26; // bold, unambiguous crescent — not a sliver
const WAXING = true; // right-lit, classic "waxing crescent" silhouette

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const size of SIZES) {
    const svg = renderIconSvg(size, K, WAXING);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`wrote ${outPath} (${png.length} bytes)`);
  }

  // Browsers request /favicon.ico directly regardless of <link rel="icon">
  // tags — without a real file there, some show no icon or a stale default.
  const icoBuffer = await pngToIco([
    path.join(OUT_DIR, "icon-16.png"),
    path.join(OUT_DIR, "icon-32.png"),
  ]);
  const icoPath = path.join(PUBLIC_DIR, "favicon.ico");
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`wrote ${icoPath} (${icoBuffer.length} bytes)`);
}

main();

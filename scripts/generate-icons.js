// Regenerates the static home-screen icon set as plain PNG files in
// public/icons/. Run manually with `node scripts/generate-icons.js` any time
// you want to tweak the crescent — it does NOT run automatically at build or
// deploy time.
//
// The lit crescent is real NASA lunar surface texture (a Dial-A-Moon frame),
// masked to the same crescent shape used everywhere else in the app —
// replacing the old flat gradient fill. Requires network access (fetches
// from svs.gsfc.nasa.gov) at generation time only; the resulting PNGs are
// fully static and ship with no runtime dependency on that fetch.
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const pngToIco = require("png-to-ico").default;
const { renderIconBaseSvg, moonDiscPath } = require("../lib/moonSvg.js");

const OUT_DIR = path.join(__dirname, "..", "public", "icons");
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SIZES = [16, 32, 180, 192, 512];
const K = 0.26; // bold, unambiguous crescent — not a sliver
const WAXING = true; // right-lit, classic "waxing crescent" silhouette

// A real Dial-A-Moon frame, chosen for a near-full phase (2026-04-03 21:00
// UTC, ~97% illuminated — confirmed against NASA's API) so most of the
// visible disc carries real surface detail — maria, craters — rather than
// terminator shadow. SVS archives every year's hourly frames back to 2011,
// so this date should keep resolving indefinitely; override with
// MOON_ICON_DATE=YYYY-MM-DDTHH:00 (UTC, on the hour) to use a different frame.
const TEXTURE_DATE = process.env.MOON_ICON_DATE || "2026-04-03T21:00";

async function fetchMoonTexture(isoTime) {
  const metaRes = await fetch(`https://svs.gsfc.nasa.gov/api/dialamoon/${isoTime}`);
  if (!metaRes.ok) throw new Error(`NASA SVS returned ${metaRes.status} for ${isoTime}`);
  const meta = await metaRes.json();
  const url = meta?.image?.url;
  if (!url) throw new Error(`No "image" field in Dial-A-Moon response for ${isoTime}`);

  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`Texture image fetch returned ${imgRes.status} (${url})`);
  return Buffer.from(await imgRes.arrayBuffer());
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Fetching real lunar surface texture from NASA (frame: ${TEXTURE_DATE})...`);
  const rawTexture = await fetchMoonTexture(TEXTURE_DATE);

  // NASA's frame is a neutral grey-scale render; warm it slightly toward the
  // app's gold/cream palette so it reads as this app's icon, not a stock photo.
  const tintedTexture = await sharp(rawTexture)
    .modulate({ brightness: 1.05, saturation: 0.85 })
    .tint({ r: 243, g: 230, b: 200 })
    .toBuffer();

  for (const size of SIZES) {
    const r = size * 0.34; // matches renderIconBaseSvg's moon radius
    const diameter = Math.max(2, Math.round(r * 2));

    const textureCircle = await sharp(tintedTexture).resize(diameter, diameter, { fit: "cover" }).toBuffer();

    // Same crescent geometry as the rest of the app, sized to the texture
    // crop's own local coordinate space (centered at r,r).
    const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}"><path d="${moonDiscPath(
      K,
      WAXING,
      r,
      r,
      r
    )}" fill="#fff"/></svg>`;
    const maskPng = await sharp(Buffer.from(maskSvg)).png().toBuffer();

    const texturedCrescent = await sharp(textureCircle)
      .composite([{ input: maskPng, blend: "dest-in" }])
      .png()
      .toBuffer();

    const baseSvg = renderIconBaseSvg(size, r);
    const png = await sharp(Buffer.from(baseSvg))
      .composite([
        {
          input: texturedCrescent,
          left: Math.round(size / 2 - r),
          top: Math.round(size / 2 - r),
        },
      ])
      .png()
      .toBuffer();

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

main().catch((err) => {
  console.error("Icon generation failed:", err.message);
  console.error("(Network access to svs.gsfc.nasa.gov is required to run this script.)");
  process.exit(1);
});

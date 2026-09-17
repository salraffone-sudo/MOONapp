import sharp from "sharp";

// NASA's Dial-A-Moon API only exposes the annotated ("fancy") high-res image
// directly. A clean, unlabeled version exists at the same frame number under
// a differently-named directory — confirmed by inspecting NASA's own file
// listings, not guessed. This route fetches that TIFF (browsers can't render
// TIFF natively) and converts + downsizes it to a JPEG suitable for a phone
// screen's pinch-zoom, so the heavy conversion work happens once per frame,
// server-side, rather than shipping a 7-13MB file to the client.
const EXPLORE_MAX_DIMENSION = 1400;

export default async function handler(req, res) {
  const { time, lat } = req.query;
  if (!time) {
    return res.status(400).json({ error: "time query param required" });
  }

  try {
    const upstream = await fetch(`https://svs.gsfc.nasa.gov/api/dialamoon/${time}`);
    if (!upstream.ok) throw new Error(`NASA SVS returned ${upstream.status}`);
    const data = await upstream.json();

    const isSouthern = parseFloat(lat) < 0;
    const highRes = isSouthern ? data.su_image_highres : data.image_highres;
    if (!highRes?.url) throw new Error("no high-res frame in response");

    const cleanUrl = highRes.url.replace("/fancy/comp.", "/plain/moon.");

    const imgResponse = await fetch(cleanUrl);
    if (!imgResponse.ok) throw new Error(`plain frame fetch returned ${imgResponse.status}`);
    const tiffBuffer = Buffer.from(await imgResponse.arrayBuffer());

    const jpegBuffer = await sharp(tiffBuffer)
      .metadata()
      .then((meta) => {
        // The source is a 16:9 frame; the disc sits centered within the
        // shorter (height) dimension, with extra letterboxing left/right.
        // Center-cropping to a square matching the height reproduces the
        // same disc-to-frame composition as the 730x730 "1x1" tier used
        // for the hero photo, so the two stay geometrically consistent.
        const size = meta.height;
        const left = Math.round((meta.width - size) / 2);
        return sharp(tiffBuffer).extract({ left, top: 0, width: size, height: size });
      })
      .then((cropped) =>
        cropped.resize(EXPLORE_MAX_DIMENSION, EXPLORE_MAX_DIMENSION, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer()
      );

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.status(200).send(jpegBuffer);
  } catch (err) {
    // No image body on failure — the frontend's onError falls back to the
    // low-res photo already showing in the hero.
    res.status(502).end();
  }
}

export const config = {
  api: {
    responseLimit: "10mb",
  },
};

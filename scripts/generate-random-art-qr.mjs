import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "output", "qr");
const targetUrl = "https://www.flipsight.be/art/random";
const sharedOptions = {
  errorCorrectionLevel: "H",
  margin: 4,
  color: {
    dark: "#000000",
    light: "#FFFFFF",
  },
};

await mkdir(outputDirectory, { recursive: true });

await Promise.all([
  QRCode.toFile(path.join(outputDirectory, "flipsight-random-art-qr.svg"), targetUrl, {
    ...sharedOptions,
    type: "svg",
  }),
  QRCode.toFile(path.join(outputDirectory, "flipsight-random-art-qr.png"), targetUrl, {
    ...sharedOptions,
    type: "png",
    width: 2400,
  }),
]);

console.log(`Generated SVG and PNG QR codes for ${targetUrl}`);

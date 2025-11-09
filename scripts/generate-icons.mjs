import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';

async function run() {
  const outDir = 'public/icons';
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  // 192x192 from logo.svg
  await sharp('public/logo.svg', { density: 256 })
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(`${outDir}/icon-192.png`);
  // 512x512 from logo.svg
  await sharp('public/logo.svg', { density: 512 })
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(`${outDir}/icon-512.png`);
  console.log('Generated PNG icons at public/icons');
}

run().catch((e) => { console.error(e); process.exit(1); });
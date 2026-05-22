const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '..', 'public', '121112.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');
const ICO_OUTPUT = path.join(OUTPUT_DIR, 'icon.ico');

const SIZES = [
  { name: 'icon-16x16.png', size: 16 },
  { name: 'icon-24x24.png', size: 24 },
  { name: 'icon-32x32.png', size: 32 },
  { name: 'icon-48x48.png', size: 48 },
  { name: 'icon-64x64.png', size: 64 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-256x256.png', size: 256 },
  { name: 'icon-512x512.png', size: 512 },
];

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

async function renderIconPng(size) {
  const paddingRatio = size <= 32 ? 0.18 : 0.12;
  const contentSize = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const contentBuffer = await sharp(SOURCE)
    .resize(contentSize, contentSize, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: contentBuffer,
        left: Math.floor((size - contentSize) / 2),
        top: Math.floor((size - contentSize) / 2),
      },
    ])
    .png()
    .toBuffer();
}

async function writePngIcon(outputPath, size) {
  const buffer = await renderIconPng(size);
  const metadata = await sharp(buffer).metadata();

  if (metadata.width !== size || metadata.height !== size) {
    throw new Error(`Generated ${path.basename(outputPath)} at ${metadata.width}x${metadata.height}, expected ${size}x${size}`);
  }

  await sharp(buffer)
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toFile(outputPath);
}

async function writeIco(outputPath) {
  const images = await Promise.all(
    ICO_SIZES.map(async (size) => ({
      size,
      buffer: await renderIconPng(size),
    }))
  );

  const headerSize = 6;
  const entrySize = 16;
  const entriesSize = images.length * entrySize;
  let imageOffset = headerSize + entriesSize;
  const header = Buffer.alloc(headerSize + entriesSize);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  images.forEach(({ size, buffer }, index) => {
    const entryOffset = headerSize + index * entrySize;
    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(buffer.length, entryOffset + 8);
    header.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += buffer.length;
  });

  fs.writeFileSync(outputPath, Buffer.concat([header, ...images.map((image) => image.buffer)]));
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source icon does not exist: ${SOURCE}`);
    process.exit(1);
  }

  const metadata = await sharp(SOURCE).metadata();
  console.log(`Source icon: ${metadata.width}x${metadata.height}, ${metadata.format}, alpha=${Boolean(metadata.hasAlpha)}`);

  for (const { name, size } of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);
    await writePngIcon(outputPath, size);
    console.log(`Generated ${name} (${size}x${size})`);
  }

  await writeIco(ICO_OUTPUT);
  console.log(`Generated ${path.basename(ICO_OUTPUT)} (${ICO_SIZES.join(', ')}px)`);
  console.log('All icons generated.');
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});

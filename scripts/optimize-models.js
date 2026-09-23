import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { reorder, quantize, dedup, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'raw_assets', 'originals');
const destDir = path.join(rootDir, 'public', 'models');

async function run() {
  console.log('🚀 Initializing Meshopt encoders...');
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.encoder': MeshoptEncoder,
      'meshopt.decoder': MeshoptDecoder,
    });

  if (!fs.existsSync(srcDir)) {
    console.error('❌ Source directory does not exist:', srcDir);
    process.exit(1);
  }

  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.glb'));
  console.log(`📦 Found ${files.length} GLB models in ${srcDir}`);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    const beforeBytes = fs.statSync(srcPath).size;
    totalBefore += beforeBytes;

    console.log(`\n⏳ Optimizing ${file} (${(beforeBytes / (1024 * 1024)).toFixed(2)} MB)...`);
    const doc = await io.read(srcPath);

    await doc.transform(
      dedup(),
      prune(),
      reorder({ encoder: MeshoptEncoder }),
      quantize(),
      meshopt({ encoder: MeshoptEncoder })
    );

    const outBuffer = await io.writeBinary(doc);
    fs.writeFileSync(destPath, outBuffer);
    const afterBytes = outBuffer.length;
    totalAfter += afterBytes;

    const saved = ((1 - afterBytes / beforeBytes) * 100).toFixed(1);
    console.log(
      `✅ ${file}: ${(beforeBytes / (1024 * 1024)).toFixed(2)} MB ➔ ${(afterBytes / (1024 * 1024)).toFixed(2)} MB (-${saved}%)`
    );
  }

  console.log('\n======================================================');
  console.log(`🎉 Optimization Complete!`);
  console.log(
    `Total Size: ${(totalBefore / (1024 * 1024)).toFixed(2)} MB ➔ ${(totalAfter / (1024 * 1024)).toFixed(2)} MB`
  );
  console.log(`Saved: ${((1 - totalAfter / totalBefore) * 100).toFixed(1)}% total bandwidth`);
  console.log(`Originals safely preserved in: raw_assets/originals/`);
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('❌ Optimization failed:', err);
  process.exit(1);
});

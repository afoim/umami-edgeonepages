import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { sendTelemetry } from './telemetry.js';

async function run() {
  if (!process.env.DISABLE_TELEMETRY) {
    await sendTelemetry('build');
  }

  // Cleanup .next/standalone to reduce size
  const standaloneDir = path.join(process.cwd(), '.next', 'standalone');

  if (fs.existsSync(standaloneDir)) {
    console.log('Cleaning up .next/standalone...');

    // 1. Remove sharp (optional dependency, large binaries)
    const sharpPath = path.join(standaloneDir, 'node_modules', 'sharp');
    if (fs.existsSync(sharpPath)) {
      console.log('Removing sharp...');
      fs.rmSync(sharpPath, { recursive: true, force: true });
    }

    // 2. Remove typescript (dev dependency)
    const tsPath = path.join(standaloneDir, 'node_modules', 'typescript');
    if (fs.existsSync(tsPath)) {
      console.log('Removing typescript...');
      fs.rmSync(tsPath, { recursive: true, force: true });
    }

    // 3. Remove unused Prisma engines/WASM
    const prismaRuntimePath = path.join(
      standaloneDir,
      'node_modules',
      '@prisma',
      'client',
      'runtime',
    );
    if (fs.existsSync(prismaRuntimePath)) {
      console.log('Cleaning Prisma runtime...');
      const files = fs.readdirSync(prismaRuntimePath);
      for (const file of files) {
        // Keep postgresql, remove others (mysql, sqlite, sqlserver, cockroachdb)
        if (
          (file.includes('mysql') ||
            file.includes('sqlite') ||
            file.includes('sqlserver') ||
            file.includes('cockroachdb')) &&
          (file.endsWith('.wasm-base64.js') || file.endsWith('.wasm-base64.mjs'))
        ) {
          console.log(`Removing ${file}...`);
          fs.unlinkSync(path.join(prismaRuntimePath, file));
        }
      }
    }
  }
}

run();

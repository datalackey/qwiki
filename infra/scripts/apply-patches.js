#!/usr/bin/env node
// Merges JSON patch files and applies JS replacement patches from infra/patches/<Ext>/
// into cloned extensions in infra/extensions/<Ext>/
//   .json          → shallow-merged into the matching extension JSON file
//   .js.patch.json → [{from, to}] replacements applied to the matching .js file
// Usage: node apply-patches.js [extensionsDir] [patchesDir]

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const infraDir = path.resolve(__dirname, '..');
const extensionsDir = process.argv[2] || path.join(infraDir, 'extensions');
const patchesDir    = process.argv[3] || path.join(infraDir, 'patches');

if (!fs.existsSync(patchesDir)) {
  console.log('No patches directory — nothing to apply.');
  process.exit(0);
}

let applied = 0;

function applyDir(patchDir, extDir, relPath) {
  for (const entry of fs.readdirSync(patchDir, { withFileTypes: true })) {
    const patchPath  = path.join(patchDir, entry.name);
    const targetPath = path.join(extDir,   entry.name);
    const entryRel   = path.join(relPath,  entry.name);
    if (entry.isDirectory()) {
      applyDir(patchPath, targetPath, entryRel);
    } else if (entry.name.endsWith('.js.patch.json')) {
      const jsName   = entry.name.slice(0, -'.patch.json'.length);
      const jsTarget = path.join(extDir, jsName);
      const jsRel    = path.join(relPath, jsName);
      if (!fs.existsSync(jsTarget)) {
        console.warn(`WARN: patch target not found: ${jsTarget}`);
        continue;
      }
      const replacements = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
      let source = fs.readFileSync(jsTarget, 'utf8');
      for (const { from, to } of replacements) source = source.replaceAll(from, to);
      fs.writeFileSync(jsTarget, source);
      console.log(`  patched ${jsRel} (${replacements.length} replacement(s))`);
      applied++;
    } else if (entry.name.endsWith('.json')) {
      if (!fs.existsSync(targetPath)) {
        console.warn(`WARN: patch target not found: ${targetPath}`);
        continue;
      }
      const original = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      const patch    = JSON.parse(fs.readFileSync(patchPath,  'utf8'));
      const merged   = { ...original, ...patch };
      fs.writeFileSync(targetPath, JSON.stringify(merged, null, '\t') + '\n');
      console.log(`  patched ${entryRel} (${Object.keys(patch).length} key(s))`);
      applied++;
    }
  }
}

for (const extName of fs.readdirSync(patchesDir)) {
  const patchExtDir = path.join(patchesDir, extName);
  if (!fs.statSync(patchExtDir).isDirectory()) continue;
  const extDir = path.join(extensionsDir, extName);
  if (!fs.existsSync(extDir)) {
    console.warn(`WARN: extension not yet cloned, skipping patches for: ${extName}`);
    continue;
  }
  applyDir(patchExtDir, extDir, extName);
}

console.log(`==> Patches applied: ${applied}`);

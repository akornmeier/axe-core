import { readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = 'packages/axe-core/lib';
const dirs = [
  'core', 'core/base', 'core/base/context', 'core/base/virtual-node',
  'core/public', 'core/public/run', 'core/reporters', 'core/reporters/helpers',
  'core/utils', 'core/utils/frame-messenger',
  'commons/forms', 'commons/matches', 'commons/math', 'commons/standards', 'commons/table'
];

let count = 0;
for (const dir of dirs) {
  const fullDir = join(base, dir);
  if (!existsSync(fullDir)) continue;
  const files = readdirSync(fullDir);
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    const tsName = f.replace(/\.js$/, '.ts');
    if (files.includes(tsName)) {
      const fullPath = join(fullDir, f);
      unlinkSync(fullPath);
      console.log('Removed:', fullPath);
      count++;
    }
  }
}

console.log(`\nTotal files removed: ${count}`);

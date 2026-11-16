import { cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const source = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const shotDirectory = join(source, 'screenshots');
const captures = readdirSync(shotDirectory).filter(name => /^0[1-4]-[a-z]+\.jpg$/.test(name));
if (captures.length !== 4) throw new Error('Capture all four release frames with tests/browser.cjs --shots.');

const outputShots = join(output, 'screenshots');
mkdirSync(outputShots, { recursive: true });
cpSync(join(source, 'game'), join(output, 'game'), { recursive: true });
for (const capture of captures) cpSync(join(shotDirectory, capture), join(outputShots, capture));

const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
});
writeFileSync(resolve(output, 'dossier.json'), dossier);

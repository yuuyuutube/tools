import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const folder of ['src', 'dev']) for (const file of readdirSync(new URL(`../${folder}/`, import.meta.url))) {
  if (!file.endsWith('.js')) continue;
  const result = spawnSync(process.execPath, ['--check', `${folder}/${file}`], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('All application and development modules passed syntax checks.');

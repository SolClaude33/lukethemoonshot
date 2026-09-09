import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const projectRoot = process.cwd();

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

test('production build emits a Vercel-ready dist with configured links and optimized assets', async () => {
  const environment = {
    ...process.env,
    PUBLIC_BUY_URL: 'https://dex.example/luke',
    PUBLIC_COMMUNITY_URL: 'https://community.example/luke',
    PUBLIC_TWITTER_URL: 'https://x.com/luke',
    PUBLIC_REDDIT_POST_URL: 'https://reddit.com/r/luke/comments/post'
  };
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: projectRoot,
    env: environment,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const html = await readFile('dist/index.html', 'utf8');
  const runtimeConfig = await readFile('dist/runtime-config.js', 'utf8');

  assert.match(html, /Buy \$LUKE/);
  assert.doesNotMatch(html, /\$CAT/);
  assert.match(runtimeConfig, /https:\/\/dex\.example\/luke/);
  assert.match(runtimeConfig, /https:\/\/community\.example\/luke/);
  assert.match(runtimeConfig, /https:\/\/x\.com\/luke/);
  assert.match(runtimeConfig, /https:\/\/reddit\.com\/r\/luke\/comments\/post/);
  assert.equal(await exists('dist/assets/generated/hero-scene.webp'), true);
  assert.equal(await exists('dist/assets/generated-raw'), false);
  assert.equal(await exists('dist/qa'), false);
});

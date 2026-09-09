import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

import { createRuntimeConfigSource } from '../scripts/build-helpers.mjs';

function evaluateConfig(source) {
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return JSON.parse(JSON.stringify(context.window.__LUKE_LINKS__));
}

test('Vercel public environment variables become the four browser link values', () => {
  const source = createRuntimeConfigSource({
    PUBLIC_BUY_URL: 'https://dex.example/luke',
    PUBLIC_COMMUNITY_URL: 'https://community.example/luke',
    PUBLIC_TWITTER_URL: 'https://x.com/luke',
    PUBLIC_REDDIT_POST_URL: 'https://reddit.com/r/luke/comments/post'
  });

  assert.deepEqual(evaluateConfig(source), {
    buy: 'https://dex.example/luke',
    community: 'https://community.example/luke',
    twitter: 'https://x.com/luke',
    reddit: 'https://reddit.com/r/luke/comments/post'
  });
});

test('missing variables produce empty values so the browser uses safe local fallbacks', () => {
  assert.deepEqual(evaluateConfig(createRuntimeConfigSource({})), {
    buy: '',
    community: '',
    twitter: '',
    reddit: ''
  });
});

test('unsafe or malformed deployment URLs fail the build with the variable name', () => {
  assert.throws(
    () => createRuntimeConfigSource({ PUBLIC_BUY_URL: 'javascript:alert(1)' }),
    /PUBLIC_BUY_URL/
  );
  assert.throws(
    () => createRuntimeConfigSource({ PUBLIC_REDDIT_POST_URL: 'not a URL' }),
    /PUBLIC_REDDIT_POST_URL/
  );
});

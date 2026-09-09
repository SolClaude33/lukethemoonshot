import assert from 'node:assert/strict';
import test from 'node:test';

import { applyLinkConfig, resolveLinkConfig } from '../link-config.js';

function fakeLink(kind) {
  return {
    dataset: { link: kind },
    href: '',
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); },
    removeAttribute(name) { this.attributes.delete(name); }
  };
}

test('one buy variable drives every Buy $LUKE link while channels remain independent', () => {
  const links = [
    fakeLink('buy'),
    fakeLink('buy'),
    fakeLink('buy'),
    fakeLink('buy'),
    fakeLink('community'),
    fakeLink('twitter'),
    fakeLink('reddit')
  ];
  const root = { querySelectorAll: () => links };
  const config = resolveLinkConfig({
    buy: 'https://dex.example/luke',
    community: 'https://community.example/luke',
    twitter: 'https://x.com/luke',
    reddit: 'https://reddit.com/r/luke/comments/example'
  });

  applyLinkConfig(root, config);

  assert.deepEqual(links.slice(0, 4).map((link) => link.href), [
    'https://dex.example/luke',
    'https://dex.example/luke',
    'https://dex.example/luke',
    'https://dex.example/luke'
  ]);
  assert.equal(links[4].href, 'https://community.example/luke');
  assert.equal(links[5].href, 'https://x.com/luke');
  assert.equal(links[6].href, 'https://reddit.com/r/luke/comments/example');
  assert.equal(links[0].attributes.get('target'), '_blank');
  assert.equal(links[0].attributes.get('rel'), 'noopener noreferrer');
});

test('missing or unsafe public URLs fall back to the local community section', () => {
  const config = resolveLinkConfig({
    buy: 'javascript:alert(1)',
    community: '',
    twitter: 'ftp://example.com/file',
    reddit: 'not a URL'
  });

  assert.deepEqual(config, {
    buy: '#community',
    community: '#community',
    twitter: '#community',
    reddit: '#community'
  });
});

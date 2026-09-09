const ENVIRONMENT_LINKS = {
  PUBLIC_BUY_URL: 'buy',
  PUBLIC_COMMUNITY_URL: 'community',
  PUBLIC_TWITTER_URL: 'twitter',
  PUBLIC_REDDIT_POST_URL: 'reddit'
};

function readPublicHttpUrl(environment, variableName) {
  const rawValue = environment[variableName];
  if (typeof rawValue !== 'string' || !rawValue.trim()) return '';

  const value = rawValue.trim();
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported protocol');
    return url.href;
  } catch {
    throw new Error(`${variableName} must be a valid http:// or https:// URL`);
  }
}

export function createRuntimeConfigSource(environment) {
  const config = Object.fromEntries(
    Object.entries(ENVIRONMENT_LINKS).map(([variableName, key]) => [
      key,
      readPublicHttpUrl(environment, variableName)
    ])
  );

  return `window.__LUKE_LINKS__ = Object.freeze(${JSON.stringify(config, null, 2)});\n`;
}

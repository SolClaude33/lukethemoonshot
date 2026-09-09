const LINK_KEYS = ['buy', 'community', 'twitter', 'reddit'];
const FALLBACK_URL = '#community';

function normalizePublicUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return FALLBACK_URL;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return FALLBACK_URL;
    return url.href;
  } catch {
    return FALLBACK_URL;
  }
}

export function resolveLinkConfig(rawConfig = {}) {
  return Object.fromEntries(
    LINK_KEYS.map((key) => [key, normalizePublicUrl(rawConfig[key])])
  );
}

export function applyLinkConfig(root, config) {
  root.querySelectorAll('[data-link]').forEach((link) => {
    const href = config[link.dataset.link] || FALLBACK_URL;
    link.href = href;

    if (href.startsWith('https://') || href.startsWith('http://')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    } else {
      link.removeAttribute('target');
      link.removeAttribute('rel');
    }
  });
}

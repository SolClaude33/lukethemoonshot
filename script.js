import { applyLinkConfig, resolveLinkConfig } from './link-config.js';

applyLinkConfig(document, resolveLinkConfig(window.__LUKE_LINKS__));

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
const navigationLinks = [...document.querySelectorAll('.site-nav a')];

function closeMenu() {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('open');
  document.body.classList.remove('menu-open');
}

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(willOpen));
    navigation.classList.toggle('open', willOpen);
    document.body.classList.toggle('menu-open', willOpen);
  });

  navigationLinks.forEach((link) => link.addEventListener('click', closeMenu));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 920) closeMenu();
  });
}

const observedSections = [...document.querySelectorAll('main section[id], #home')];
const navByHash = new Map(navigationLinks.map((link) => [link.hash, link]));

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;

    navigationLinks.forEach((link) => link.classList.remove('active'));
    navByHash.get(`#${visible.target.id}`)?.classList.add('active');
  }, { rootMargin: '-30% 0px -55% 0px', threshold: [0.05, 0.2, 0.5] });

  observedSections.forEach((section) => observer.observe(section));
}

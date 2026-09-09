# Luke the Moonshot landing

Static, responsive landing rebuilt from the canonical `pagina.png` reference with newly generated artwork. The project has a dependency-free Node build for Vercel.

## Link variables

Every deployment URL is read during `npm run build`. Only valid `http://` or `https://` values are accepted.

| Vercel variable | Controls |
| --- | --- |
| `PUBLIC_BUY_URL` | All three **Buy $LUKE** buttons and the `$LUKE` footer ticker |
| `PUBLIC_COMMUNITY_URL` | **Join Community** |
| `PUBLIC_TWITTER_URL` | X/Twitter icon |
| `PUBLIC_REDDIT_POST_URL` | Cat icon reserved for a Reddit post |

All four values are public by design: they are written into the JavaScript served to visitors. Never put a private key, token, password, or secret in these variables.

If a value is missing, its link safely falls back to the local `#community` section. If a value is malformed or uses another protocol, the production build fails instead of publishing it.

## Local development

Preview the source with safe local fallbacks:

```bash
python -m http.server 4174 --bind 127.0.0.1
```

Open `http://127.0.0.1:4174/`.

To test real URLs locally:

1. Copy `.env.example` to `.env.local`.
2. Fill the four variables with their complete public URLs.
3. Build and serve the production output:

```bash
node --env-file=.env.local scripts/build.mjs
python -m http.server 4175 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4175/`.

`.env.local` and every `.env.*` file except `.env.example` are excluded from Git.

## Quality checks

```bash
npm test
npm run verify
npm run build
```

Or run everything:

```bash
npm run check
```

The build creates `dist/` with only the production HTML, CSS, JavaScript and optimized assets.

## Deploy to Vercel from GitHub

1. Push this project to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Vercel reads `vercel.json` automatically:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. In **Project Settings → Environment Variables**, add:
   - `PUBLIC_BUY_URL`
   - `PUBLIC_COMMUNITY_URL`
   - `PUBLIC_TWITTER_URL`
   - `PUBLIC_REDDIT_POST_URL`
5. Select the environments where each value should apply: Production, Preview, and/or Development.
6. Deploy. After changing any variable, trigger a new deployment so `runtime-config.js` is rebuilt with the new value.

## Main files

- `index.html` — semantic page structure and live UI copy.
- `styles.css` — desktop/tablet/mobile layout and visual treatment.
- `script.js` — applies deployment links and handles navigation.
- `link-config.js` — validates and applies browser link groups.
- `runtime-config.js` — safe empty defaults for direct local preview.
- `scripts/build.mjs` — creates Vercel's production `dist/`.
- `scripts/build-helpers.mjs` — validates environment URLs and generates deployment config.
- `.env.example` — variable names without secrets.
- `vercel.json` — Vercel build/output configuration.
- `assets/generated/` — optimized production assets.
- `asset-manifest.json` — asset provenance, dimensions and SHA-256 hashes.
- `qa/rebuild/responsive-check.html` — local responsive and functional checks.

No deployment or publication has been performed from this workspace.

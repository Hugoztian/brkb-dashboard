# Berkshire Hathaway (BRK.B) dashboard — preview branch (not published)

Static site (`index.html`, `data.js`, `calc.js`, images) plus a Cloudflare Worker live-price feed (`worker.js`, `wrangler.jsonc`), set up per `/workspace/dashboards/live-feed-recipe.md` and copied from the Micron dashboard.

## Live price feed
- `worker.js` = Micron's worker.js unchanged except the header comment, the allowlist (line 5) and `DEFAULT_SYMBOL = 'BRK.B'` (line 6). Micron's default `MU` is not on this allowlist.
- Allowlist: BRK.B, BRK.A and every US-listed 13F holding at 30 Jun 2026: AAPL AXP KO GOOGL GOOG BAC CVX OXY CB MCO KHC DVA DAL SIRI VRSN KR ALLY LEN LEN.B LLYVK LLYVA NYT COF LPX NUE M NVR JEF DHI.
- Sources: Robinhood public quotes (24-hour), then Nasdaq.com as fallback. Keyless, CORS *, ~12 s cache.
- The Japanese trading houses (Tokyo) and USD/JPY are not covered by Robinhood or Nasdaq. The page reads them straight from the CNBC quote feed.
- The page calls `QUOTE_API` = `/api/quote` when served from `*.workers.dev`, otherwise `https://brkb-dashboard.cashcache.workers.dev/api/quote`. It polls every 30 s, one request per symbol. You can override it with `?quoteapi=URL`.

**Expected endpoint:** `https://brkb-dashboard.cashcache.workers.dev/api/quote?symbol=BRK.B`
This assumes the import goes into the same Cloudflare account as micron-dashboard (subdomain `cashcache`). If the subdomain differs, change `QUOTE_API` in index.html.

## One-time Cloudflare import (Hugo)
No token and no wrangler needed. After this, every push to `main` auto-deploys.
1. Push this repo to GitHub as `hugoztian/brkb-dashboard`, with `worker.js` and `wrangler.jsonc` at the repo root next to `index.html`.
2. In the Cloudflare dashboard, use the same account as micron-dashboard: **Workers & Pages → Create → Import a repository**.
3. Connect GitHub if prompted. Authorise or select the `hugoztian/brkb-dashboard` repo, then pick it.
4. Keep the defaults: project name `brkb-dashboard`, production branch `main`, deploy command `npx wrangler deploy`, root `/`. The name and settings come from `wrangler.jsonc`.
5. Click **Save and Deploy**. Then check `https://brkb-dashboard.cashcache.workers.dev/api/quote?symbol=BRK.B` returns `"ok":true`, and try `?symbol=BRK.A` and `?symbol=AAPL`.
6. Afterwards, per the recipe: ask Micron to drop any BRK tickers from its allowlist (it has none today), and share the endpoint with Steve.

## Data and KPI reuse
- `python3 build_data.py` rebuilds `data.js`. Figures come from the Q2 2026 10-Q and the 30 Jun 2026 13F, with balance-sheet integrity asserts.
- Real-time BV per B share in Node: `node -e "const C=require('./calc.js'),D=require('./data.json');console.log(C.liveBV(D,{AAPL:347.73},{eqmAtMarket:false}))"`. The page's "Copy KPI JSON" button exports the same snapshot.

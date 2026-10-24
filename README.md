# BRK.B dashboard (preview, not published)
Static site (index.html, data.js, calc.js) + Cloudflare Worker quote feed (worker.js, wrangler.jsonc), same layout as mu-dashboard.
- Rebuild data: `python3 build_data.py` (needs /workspace/13f.xml; numbers hard-coded from the Q2 2026 10-Q with integrity asserts).
- KPI reuse: `node -e "const C=require('./calc.js'),D=require('./data.json');console.log(C.liveBV(D,{AAPL:347.73},{eqmAtMarket:false}))"`
- Deploy worker: `npx wrangler login` (or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID) then `npx wrangler deploy` → https://brkb-dashboard.<account-subdomain>.workers.dev/api/quotes

// Cloudflare Worker "brkb-dashboard": static files + /api/quote(s). Modeled on Hugoztian/mu-dashboard worker.js.
// GET /api/quotes            -> all allowed symbols (BRK.B, BRK.A, every 13F holding, Japan trading houses, USD/JPY)
// GET /api/quotes?symbols=A,B -> subset;  GET /api/quote?symbol=BRK.B -> single (Micron-compatible shape: {ok,main:{price}})
// Sources: Robinhood batch quotes (US) -> CNBC quote feed fallback (US + Tokyo + FX). 10 s edge cache.
const ALLOWED = ["BRK.B", "BRK.A", "AAPL", "ALLY", "AXP", "BAC", "CB", "COF", "CVX", "DAL", "DHI", "DVA", "GOOG", "GOOGL", "JEF", "KHC", "KO", "KR", "LEN", "LEN.B", "LLYVA", "LLYVK", "LPX", "M", "MCO", "NUE", "NVR", "NYT", "OXY", "SIRI", "VRSN", "8058-JP", "8031-JP", "8001-JP", "8002-JP", "8053-JP", "JPY="];
const UA = 'Mozilla/5.0 (brkb-dashboard quote worker)';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=10' };
const num = s => { const v = parseFloat(String(s ?? '').replace(/,/g, '')); return isFinite(v) ? v : null; };
async function robinhood(us) {
  const out = {}; if (!us.length) return out;
  const r = await fetch('https://api.robinhood.com/marketdata/quotes/?bounds=24_5&symbols=' + encodeURIComponent(us.join(',')), { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error('robinhood ' + r.status);
  for (const q of (await r.json()).results || []) { if (!q) continue; const p = num(q.last_extended_hours_trade_price) && q.last_extended_hours_trade_price ? num(q.last_trade_price) : num(q.last_trade_price);
    if (p) out[q.symbol] = { price: num(q.last_trade_price), prev_close: num(q.adjusted_previous_close ?? q.previous_close), ext_price: num(q.last_extended_hours_trade_price), time: q.updated_at, source: 'Robinhood' }; }
  return out;
}
async function cnbc(list) {
  const out = {};
  for (let i = 0; i < list.length; i += 25) {
    const u = 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=' + encodeURIComponent(list.slice(i, i + 25).join('|')) + '&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1';
    const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error('cnbc ' + r.status);
    for (const q of (await r.json()).FormattedQuoteResult.FormattedQuote || []) { const p = num(q.last); if (p) out[q.symbol] = { price: p, prev_close: num(q.previous_day_closing), change: num(q.change), change_pct: q.change_pct, currency: q.currencyCode || null, time: q.last_timedate || q.last_time, source: 'CNBC' }; }
  }
  return out;
}
async function quotes(syms) {
  const us = syms.filter(s => !/-JP$|=$/.test(s)); let res = {}, errs = [];
  try { res = await robinhood(us); } catch (e) { errs.push(String(e.message || e)); }
  const miss = syms.filter(s => !res[s]);
  if (miss.length) { try { Object.assign(res, await cnbc(miss)); } catch (e) { errs.push(String(e.message || e)); } }
  return { ok: Object.keys(res).length > 0, asof: new Date().toISOString(), quotes: res, missing: syms.filter(s => !res[s]), errors: errs };
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/quotes' || url.pathname === '/api/quote') {
      const raw = url.searchParams.get('symbols') || url.searchParams.get('symbol');
      const req = raw ? raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : ALLOWED;
      const bad = req.filter(s => !ALLOWED.includes(s));
      if (bad.length) return new Response(JSON.stringify({ ok: false, error: 'symbol not allowed', bad, allowed: ALLOWED }), { status: 400, headers: CORS });
      const j = await quotes(req);
      if (url.pathname === '/api/quote') { const q = j.quotes[req[0]]; return new Response(JSON.stringify(q ? { ok: true, symbol: req[0], main: q, source_note: q.source } : { ok: false, error: 'unavailable', errors: j.errors }), { headers: CORS }); }
      return new Response(JSON.stringify(j), { headers: CORS });
    }
    return env && env.ASSETS ? env.ASSETS.fetch(request) : new Response('not found', { status: 404 });
  }
};

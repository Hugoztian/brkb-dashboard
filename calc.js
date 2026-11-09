/* BRK live book-value calculator. Pure function; works in browser (window.BRKCalc) and Node (require('./calc.js')).
   Usage (Node): const D=require('./data.json'); BRKCalc.liveBV(D,{AAPL:347.73,...},{eqmAtMarket:false})
   All money in US$ millions unless noted.
   Quarter-end value of a 13F line is shares × px_qe when that close is stored (10-Q date later than the 13F), otherwise the filed 13F dollar value. */
(function(root){
function qeM(h){if(h.px_qe!=null&&isFinite(h.px_qe))return h.sh*h.px_qe/1e6;return h.val/1e6;}
function liveBV(D,px,o){o=Object.assign({taxRate:0.21,eqmAtMarket:false,buybacksSinceQE:0},o||{});
 const t=o.taxRate,rows=[];let dFV=0,dEQM=0,mtm=0,qe=0,qeFiled=0,missing=[];
 for(const h of D.hold){const p=px[h.tk],qvFiled=h.val/1e6,qv=qeM(h);let lv=null;if(p!=null&&isFinite(p))lv=h.sh*p/1e6;
  if(h.eqm){const e=D.eqm.find(x=>x.tk===h.tk);const d=lv==null?null:lv-e.carry;if(o.eqmAtMarket&&d!=null)dEQM+=d;rows.push({...h,px:p,qv,qvFiled,lv,carry:e.carry,d,inBV:o.eqmAtMarket});}
  else{const d=lv==null?null:lv-qv;if(d!=null)dFV+=d;else missing.push(h.tk);rows.push({...h,px:p,qv,qvFiled,lv,d,inBV:d!=null});}
  if(lv!=null){mtm+=lv;qe+=qv;qeFiled+=qvFiled}else missing.includes(h.tk)||missing.push(h.tk)}
 const delta=dFV+dEQM,atax=delta*(1-t),eq=D.bs.equity+atax-o.buybacksSinceQE,bSh=D.shares.a_eq*1500;
 const bvB=eq*1e6/bSh,bvBqe=D.bs.equity*1e6/bSh,unreal=D.eq_basis.unreal+dFV,dtax=unreal*t;
 return {rows,dFV,dEQM,delta,afterTax:atax,equityLive:eq,bShares:bSh,bvB,bvBqe,mtm13F:mtm,qe13F:qe,qe13FFiled:qeFiled,unrealLive:unreal,deferredTaxEst:dtax,missing,opts:o};}
function sotp(D,r,price){
 const cashGross=D.bs.assets.filter(a=>a[2]==='cash').reduce((s,a)=>s+a[1],0),tbill=D.bs.tbill_payable||0,cash=cashGross-tbill;
 const fix=(D.bs.assets.find(a=>a[2]==='fix')||[0,0])[1];
 const ioDebt=D.bs.io_debt!=null?D.bs.io_debt:(D.bs.liabs.find(a=>a[2]==='debt'&&/Insurance/.test(a[0]))||[0,0])[1];
 const eqLive=D.eq_basis.fv+r.dFV,eqmMkt=D.eqm.reduce((s,e)=>{const h=r.rows.find(x=>x.tk===e.tk);return s+(h&&h.lv!=null?h.lv:e.carry)},0),
 port=eqLive+eqmMkt-r.deferredTaxEst,mcap=price*r.bShares/1e6,ops=mcap-port-cash-fix+ioDebt;
 return {cash,cashGross,tbill,fix,eqLive,eqmMkt,port,ioDebt,mcap,ops}}
const api={liveBV,sotp};if(typeof module!=='undefined')module.exports=api;else root.BRKCalc=api;})(this);

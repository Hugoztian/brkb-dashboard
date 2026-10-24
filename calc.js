/* BRK live book-value calculator. Pure function; works in browser (window.BRKCalc) and Node (require('./calc.js')).
   Usage (Node): const D=require('./data.json'); BRKCalc.liveBV(D,{AAPL:347.73,...},{eqmAtMarket:false})
   All money in US$ millions unless noted. */
(function(root){
function liveBV(D,px,o){o=Object.assign({taxRate:0.21,eqmAtMarket:false,buybacksSinceQE:0},o||{});
 const t=o.taxRate,rows=[];let dFV=0,dEQM=0,mtm=0,qe=0,missing=[];
 for(const h of D.hold){const p=px[h.tk],qv=h.val/1e6;let lv=null;if(p!=null&&isFinite(p))lv=h.sh*p/1e6;
  if(h.eqm){const e=D.eqm.find(x=>x.tk===h.tk);const d=lv==null?null:lv-e.carry;if(o.eqmAtMarket&&d!=null)dEQM+=d;rows.push({...h,px:p,qv,lv,carry:e.carry,d,inBV:o.eqmAtMarket});}
  else{const d=lv==null?null:lv-qv;if(d!=null)dFV+=d;else missing.push(h.tk);rows.push({...h,px:p,qv,lv,d,inBV:d!=null});}
  if(lv!=null){mtm+=lv;qe+=qv}else missing.includes(h.tk)||missing.push(h.tk)}
 const delta=dFV+dEQM,atax=delta*(1-t),eq=D.bs.equity+atax-o.buybacksSinceQE,bSh=D.shares.a_eq*1500;
 const bvB=eq*1e6/bSh,bvBqe=D.bs.equity*1e6/bSh,unreal=D.eq_basis.unreal+dFV,dtax=unreal*t;
 return {rows,dFV,dEQM,delta,afterTax:atax,equityLive:eq,bShares:bSh,bvB,bvBqe,mtm13F:mtm,qe13F:qe,unrealLive:unreal,deferredTaxEst:dtax,missing,opts:o};}
function sotp(D,r,price){const cash=D.bs.assets.filter(a=>a[2]==='cash').reduce((s,a)=>s+a[1],0)-771,fix=17034,
 eqLive=D.eq_basis.fv+r.dFV,eqmMkt=D.eqm.reduce((s,e)=>{const h=r.rows.find(x=>x.tk===e.tk);return s+(h&&h.lv!=null?h.lv:e.carry)},0),
 port=eqLive+eqmMkt-r.deferredTaxEst,ioDebt=43302,mcap=price*r.bShares/1e6,ops=mcap-port-cash-fix+ioDebt;
 return {cash,fix,eqLive,eqmMkt,port,ioDebt,mcap,ops}}
const api={liveBV,sotp};if(typeof module!=='undefined')module.exports=api;else root.BRKCalc=api;})(this);

import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepare,simulate,defaults,etTime} from '../dist/engine.mjs';
const available=fs.existsSync(new URL('../dist/data/SPY-4.json',import.meta.url))&&fs.existsSync(new URL('../dist/data/QQQ-11.json',import.meta.url));
const load=t=>Array.from({length:8},(_,i)=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+t+'-'+(i+4)+'.json',import.meta.url))).bars).flat();
if(!available)test('Historical snapshot checks require owner-licensed bars',{skip:true},()=>{});
for(const ticker of available?['SPY','QQQ']:[]){
 const rows=load(ticker),data=prepare(rows);
 test(ticker+' historical snapshot has complete 129-session coverage',()=>{
  const r=simulate(data,{...defaults,ticker});assert.equal(data.fatal.length,0);assert.deepEqual(r.quality,{missing:0,incomplete:0,warmup:0,valid:129,expected:129});
 });
 for(const strategy of ['orb','touch'])test(ticker+' '+strategy+' respects timing, position sizing and accounting',()=>{
  const r=simulate(data,{...defaults,ticker,strategy});
  assert.ok(r.trades.length>0);
  let capital=defaults.initial;const daily={};let priorExit=-Infinity;
  for(const t of r.trades){
   const en=etTime(t.entryTime),ex=etTime(t.exitTime);assert.equal(en.date,ex.date);assert.ok(en.minute>=585&&en.minute<645);assert.ok(ex.minute<=959);assert.ok(t.qty>0&&Number.isInteger(t.qty));assert.ok(t.qty*(t.entry+defaults.fee)<=capital+1e-6);assert.ok(Date.parse(t.entryTime)>priorExit);priorExit=Date.parse(t.exitTime);
   assert.ok(Math.abs(t.pnl-(t.qty*(t.exit-t.entry)*(t.side==='Long'?1:-1)-t.fees))<1e-6);assert.equal(t.side,'Long');
   capital+=t.pnl;daily[t.date]=(daily[t.date]||0)+1;
  }
  assert.ok(Object.values(daily).every(n=>n<=3));assert.ok(Math.abs(capital-r.final)<1e-6);assert.ok(Math.abs(r.monthly.reduce((s,x)=>s+x.pnl,0)-(r.final-r.initial))<1e-6);
 });
 test(ticker+' future OHLC changes cannot alter earlier trades',()=>{
  const cutoff='2026-09-01';
  const altered=rows.map(r=>r[0].slice(0,10)>=cutoff?[r[0],...r.slice(1).map(x=>x*1.2)]:r);
  const a=simulate(data,{...defaults,ticker}),b=simulate(prepare(altered),{...defaults,ticker});
  assert.deepEqual(a.trades.filter(t=>t.date<cutoff),b.trades.filter(t=>t.date<cutoff));
 });
 test(ticker+' user event exclusions prevent entries',()=>{
  const c={...defaults,ticker},a=simulate(data,c);const excluded=a.trades[0].date,b=simulate(data,{...c,eventDates:excluded});assert.ok(b.trades.every(t=>t.date!==excluded));
 });
}

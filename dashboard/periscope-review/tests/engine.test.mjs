import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepare,simulate,defaults,resolveExit,validateConfig} from '../dist/engine.mjs';
test('same-bar ambiguity always resolves stop first',()=>{
 const p={side:1,stop:99,target:102,entry:100,qty:10};
 assert.deepEqual(resolveExit(p,{open:100,high:103,low:98,close:101}),{price:99,reason:'Stop-loss'});
 assert.deepEqual(resolveExit({...p,side:-1,stop:101,target:98},{open:100,high:102,low:97,close:99}),{price:101,reason:'Stop-loss'});
});
test('gapped stop fills adversely at open',()=>assert.equal(resolveExit({side:1,stop:99,target:102},{open:97,high:100,low:96,close:99}).price,97));
test('invalid settings are rejected',()=>{assert.throws(()=>validateConfig({...defaults,risk:0}));assert.throws(()=>validateConfig({...defaults,start:'2026-11-07',end:'2026-05-06'}));});
test('missing minute blocks a session, duplicate invalidates dataset',()=>{
 const bars=Array.from({length:390},(_,i)=>[new Date(Date.UTC(2026,4,6,13,30+i)).toISOString(),100,101,99,100]);
 const full=prepare(bars);assert.equal(full.sessions.get('2026-05-06').valid,true);
 const gap=prepare(bars.filter((_,i)=>i!==50));assert.equal(gap.sessions.get('2026-05-06').valid,false);
 const duplicate=prepare([...bars,bars[0]]);assert.equal(duplicate.fatal.length>0,true);
});
test('no opening session history means no invented ATR trades',()=>{
 const data=prepare([]);const r=simulate(data,{...defaults,start:'2026-05-06',end:'2026-05-06'});assert.equal(r.trades.length,0);assert.equal(r.quality.missing,1);
});
test('target-hit minute retains adverse excursion in maximum drawdown',()=>{
 const bars=Array.from({length:390},(_,i)=>({t:new Date(Date.UTC(2026,4,6,13,30+i)).toISOString(),ms:Date.UTC(2026,4,6,13,30+i),minute:570+i,open:100,high:100.5,low:99.5,close:100}));
 bars[15]={...bars[15],open:101,high:101.2,low:100.8,close:101};
 bars[16]={...bars[16],open:101,high:101.4,low:100.9,close:101.2};
 bars[17]={...bars[17],open:101,high:105,low:100.5,close:104};
 const sessions=new Map([['2026-05-05',{valid:true,close:100}],['2026-05-06',{valid:true,atr:1,open:100,bars}]]);
 const r=simulate({sessions,fatal:[]},{...defaults,start:'2026-05-06',end:'2026-05-06',slip:0,fee:0});
 assert.equal(r.trades[0].reason,'Take-profit');assert.ok(r.maxDD>=.329&&r.maxDD<=.331);
});

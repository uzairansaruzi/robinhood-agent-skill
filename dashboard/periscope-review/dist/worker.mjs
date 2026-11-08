import {prepare,simulate,ENGINE_VERSION} from './engine.mjs';
const datasets={},sources={};let bundled={},bundleSources={};
const sha=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
function quality(ticker,c){const d=datasets[ticker];return {ticker,rows:d.rows,first:d.first,last:d.last,fatal:d.fatal,outside:d.outside,source:sources[ticker],sessions:[...d.sessions.values()].filter(s=>s.date>=c.start&&s.date<=c.end).map(s=>({date:s.date,bars:s.bars.length,expected:s.expected,valid:s.valid,reason:s.reason,atr:s.atr}))};}
self.onmessage=async({data:m})=>{
 try{
  if(m.type==='load'){
   let count=0;
   for(const ticker of ['SPY','QQQ']){
    let files=[];try{files=await Promise.all(Array.from({length:8},(_,i)=>i+4).map(async month=>{
     const r=await fetch(new URL('./data/'+ticker+'-'+month+'.json',import.meta.url));
     if(!r.ok)throw Error('Historical dataset unavailable: '+ticker+' month '+month);
     const text=await r.text(),d=JSON.parse(text);const hash=await sha(text);
     return {...d,hash,file:ticker+'-'+month+'.json'};
    }));}catch(e){files=[];}
    const rows=files.flatMap(f=>f.bars);datasets[ticker]=prepare(rows);
    sources[ticker]={name:files.length?'Alpaca consolidated SIP':'No bundled data: import licensed CSV',retrieved:'2026-11-08',feed:'sip',adjustment:'Raw; provider default',hash:await sha(files.map(f=>f.hash).join('')),files:files.map(f=>({file:f.file,hash:f.hash,rows:f.bars.length})),imported:false};
    count+=rows.length;
   }
   bundled={...datasets};bundleSources=structuredClone(sources);
   self.postMessage({type:'ready',count});return;
  }
  if(m.type==='workspace'){for(const [ticker,rows] of Object.entries(m.importedRows||{})){if(!['SPY','QQQ'].includes(ticker)||!Array.isArray(rows)||rows.length>200000)throw Error('Invalid workspace dataset');datasets[ticker]=prepare(rows);sources[ticker]={name:'Imported workspace CSV (owner to verify)',retrieved:new Date().toISOString(),feed:'User supplied',adjustment:'User must verify',hash:await sha(JSON.stringify(rows)),files:[],imported:true};}}
  if(m.type==='import'){datasets[m.ticker]=prepare(m.rows);sources[m.ticker]={name:m.source||'User CSV (unverified provider)',retrieved:new Date().toISOString(),feed:'User supplied',adjustment:'User must verify',hash:await sha(JSON.stringify(m.rows)),files:[],imported:true};}
  if(m.type==='restore'){datasets[m.ticker]=bundled[m.ticker];sources[m.ticker]=bundleSources[m.ticker];}
  if(['run','import','restore','workspace'].includes(m.type)){
   const comparisons=[];
   for(const ticker of ['SPY','QQQ'])for(const strategy of ['orb','touch']){
    const params={...m.config,ticker,strategy};comparisons.push({ticker,strategy,result:simulate(datasets[ticker],params)});
   }
   const selected=comparisons.find(r=>r.ticker===m.config.ticker&&r.strategy===m.config.strategy).result;
   const stress=simulate(datasets[m.config.ticker],{...m.config,slip:Math.min(m.config.slip*2,100),fee:Math.min(m.config.fee*2,1)});
   const provenance=['SPY','QQQ'].map(t=>quality(t,m.config));
   const fingerprint=await sha(JSON.stringify({engine:ENGINE_VERSION,config:m.config,sources:provenance.map(p=>p.source.hash)}));
   self.postMessage({type:'result',id:m.id,config:m.config,selected,comparisons,stress,provenance,fingerprint,computedAt:new Date().toISOString()});
  }
 }catch(e){self.postMessage({type:'error',id:m.id,message:e.message||String(e)});}
};

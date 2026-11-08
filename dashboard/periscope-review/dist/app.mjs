import {defaults,validateConfig,tradingDays,etTime} from './engine.mjs';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const pct=n=>n==null?'—':(n>0?'+':'')+n.toFixed(2)+'%';
const num=n=>Number(n).toLocaleString('en-US');
const time=t=>{const d=etTime(t);return d.date+' '+String(Math.floor(d.minute/60)).padStart(2,'0')+':'+String(d.minute%60).padStart(2,'0');};
const titles={overview:['Strategy review','Turn a strategy outline into evidence you can inspect.'],rules:['Strategy rules','Candidate definitions, signal timing, and invalidation logic.'],risk:['Risk controls','Capital limits and price-only no-trade filters.'],assumptions:['Research assumptions','The boundaries of what this stock-price exercise can establish.'],quality:['Data quality','Provenance, coverage, warmup, and missing-data controls.'],comparison:['Performance comparison','SPY and QQQ. Two candidates. The same research conditions.'],review:['Review & sign-off','Review the exact evidence before recording a research decision.']};
const checklist=[
 ['Price-only candidate rules approved','Opening-range and Touch & Turn definitions inspected.'],
 ['Risk limits approved','Position sizing, daily budget, cooldown, and loss pause reviewed.'],
 ['Provider and licensing reviewed','Data rights and raw adjustment basis confirmed by owner.'],
 ['Historical coverage reviewed','Complete requested sessions and prior ATR warmup inspected.'],
 ['Backtest and cost sensitivity reviewed','Trade log, drawdown, and higher-cost stress inspected.'],
 ['Independent validation reviewed','Automated checks and limitations reviewed; not a live certification.'],
 ['Holdout / forward plan recorded','Record a separate untouched holdout and 30–60-day paper evaluation plan in notes.'],
 ['Research-only deployment approved','No broker orders or options performance authorized.']
];
const defaultNotes='Mission: Observe → Interpret → Confirm → Trigger → Invalidate → Classify → Exit.\n\nA. Opening range continuation: first 15-minute range; two closes beyond the range confirm follow-through; enter next eligible bar. Structural stop at the opposite range edge. Candidate parameterization.\n\nB. Touch & Turn: range at least 0.25 × prior daily ATR(14). Bearish opening range candle: long at range low. Bullish: short at range high, when shorts are enabled. Target 0.382 × range inward from entry edge; stop 0.191 × range outward. Entry before 11:00 ET.\n\nC. Gamma reversal and D. premium-flow continuation: unavailable in OHLC-only testing.\n\nFail closed on missing or conflicting data. Never flip direction automatically.';
let saved={};try{saved=JSON.parse(localStorage.getItem('periscope.workspace.v1')||'{}');}catch{}
let config={...defaults,...saved.config},notes=saved.notes||defaultNotes,assumptions=saved.assumptions||'Exploratory ETF share-price proxies only. Parameter discovery is in sample. Reserve an untouched holdout before drawing a performance conclusion. Plan 30–60 trading days of forward paper evaluation. No claim of options profitability.',checks=Array(8).fill(false),approval=null,audit=Array.isArray(saved.audit)?saved.audit.slice(-50):[],result=null,ready=false,busy=false,dirty=true,page=0,requestId=0,importedRows={},tests=null;
const form=$('simulation-form');
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',4000);}
function persist(){try{localStorage.setItem('periscope.workspace.v1',JSON.stringify({config,notes,assumptions,audit,reviewer:$('reviewer').value,reviewNotes:$('review-notes').value}));}catch{toast('Browser storage unavailable. Export your workspace to preserve it.');}}
function log(action,details){audit.push({at:new Date().toISOString(),action,details});audit=audit.slice(-50);renderAudit();}
function invalidate(reason){dirty=true;checks.fill(false);approval=null;renderReview();updateNotice();if(reason)persist();}
function readConfig(){const c={...config};for(const key of Object.keys(defaults)){const el=form.elements.namedItem(key);if(!el)continue;c[key]=typeof defaults[key]==='boolean'?el.checked:typeof defaults[key]==='number'?Number(el.value):el.value;}return c;}
function writeConfig(){for(const [key,value] of Object.entries(config)){const el=form.elements.namedItem(key);if(!el)continue;if(typeof value==='boolean')el.checked=value;else el.value=value;}updateBracket();}
function updateBracket(){const percent=config.stopMode==='percent';form.elements.namedItem('stopLoss').disabled=!percent;form.elements.namedItem('takeProfit').disabled=!percent;form.elements.namedItem('rr').disabled=percent||config.strategy!=='orb';$('bracket-helper').textContent=percent?'Custom percentage bracket overrides the structural stop and target for this research run.':'Structural ORB: stop at opposite edge, target at configured reward/risk. Touch & Turn: 38.2% inward target, 19.1% outward stop.';}
function route(){const view=location.hash.slice(1)in titles?location.hash.slice(1):'overview';document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id==='view-'+view));document.querySelectorAll('nav a').forEach(el=>{const active=el.dataset.view===view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});$('view-title').textContent=titles[view][0];$('view-subtitle').textContent=titles[view][1];document.title='Periscope | '+titles[view][0];}
window.addEventListener('hashchange',route);
function updateNotice(){
 let text;if(!ready)text='Loading historical stock bars and validating session coverage. No simulated results until checks finish.';
 else if(busy)text='Computing both instruments and both candidates using the current inputs…';
 else if(!result)text='Historical data ready. Run a simulation to build the review evidence.';
 else if(dirty)text='INPUTS CHANGED. Charts below show the previous run. Run simulation again before reviewing or signing off.';
 else if(result.selected.blocked)text='BLOCKED: '+result.selected.error;
 else{const q=result.selected.quality;text='HISTORICAL SHARE-PRICE PROXY · '+q.valid+'/'+q.expected+' complete sessions · '+result.selected.trades.length+' simulated trades. '+(q.missing||q.incomplete||q.warmup?'Coverage exclusions affect these results. Inspect Data quality.':'Exploratory in-sample results. Owner review remains pending.');}
 $('notice').textContent=text;$('notice').classList.toggle('error',dirty&&!!result||!!result?.selected.blocked);
 $('run').disabled=!ready||busy;$('run').innerHTML=busy?'Computing…':'Run simulation <span>↗</span>';
}
function renderMetrics(){
 const r=result?.selected;
 const items=[['Net return',r&&!r.blocked?pct(r.net):'—',r?money(r.final-r.initial)+' net P&L':'Awaiting valid run'],['Max drawdown',r&&!r.blocked?'-'+r.maxDD.toFixed(2)+'%':'—','Conservative intrabar equity'],['Win rate',r?pct(r.winRate).replace('+',''):'—',r?r.trades.length+' completed trades':'Net of costs'],['Expectancy',r?money(r.expectancy):'—','Average net P&L / trade']];
 $('metrics').innerHTML=items.map((x,i)=>'<div class="metric"><div class="metric-label">'+x[0]+'<span>↗</span></div><div class="metric-value '+(i===0?'accent':'')+'">'+x[1]+'</div><div class="metric-detail">'+esc(x[2])+'</div></div>').join('');
}
function chart(id,curve,type){
 const el=$(id);el.classList.remove('skeleton');
 if(!curve?.length||result?.selected.blocked){el.innerHTML='<div class="empty">No valid simulation evidence to chart.</div>';return;}
 const W=900,H=type==='equity'?300:115,L=67,R=18,T=15,B=30,baseline=result.config.initial;
 const pts=[{date:result.config.start,equity:baseline,drawdown:0},...curve];
 const values=pts.map(p=>p[type]);let min=Math.min(...values),max=Math.max(...values);
 if(type==='equity'){min=Math.min(min,baseline);max=Math.max(max,baseline);const pad=(max-min||baseline*.01)*.14;min-=pad;max+=pad;}else{max=0;min=Math.min(min,-.1)*1.15;}
 const x=i=>L+i/(pts.length-1||1)*(W-L-R),y=v=>T+(max-v)/(max-min)*(H-T-B);
 const path=pts.map((p,i)=>(i?'L':'M')+x(i).toFixed(2)+','+y(p[type]).toFixed(2)).join(' ');
 let svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(type==='equity'?'Daily net equity curve':'Daily closing drawdown')+'"><title>'+esc(type==='equity'?'Simulated ETF share equity':'Daily closing drawdown')+'</title>';
 for(let i=0;i<=(type==='equity'?4:2);i++){const count=type==='equity'?4:2,v=min+(max-min)*i/count,yy=y(v);svg+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="var(--line)" stroke-width=".7"/><text x="'+(L-10)+'" y="'+(yy+3)+'" text-anchor="end" fill="var(--faint)" font-size="10" font-family="monospace">'+(type==='equity'?Math.round(v).toLocaleString('en-US'):v.toFixed(1)+'%')+'</text>';}
 if(type==='equity')svg+='<line x1="'+L+'" y1="'+y(baseline)+'" x2="'+(W-R)+'" y2="'+y(baseline)+'" stroke="var(--faint)" stroke-dasharray="4 5" opacity=".7"/>';
 svg+='<path d="'+path+' L'+x(pts.length-1)+','+(H-B)+' L'+L+','+(H-B)+' Z" fill="var(--accent)" opacity=".065"/><path d="'+path+'" fill="none" stroke="var(--accent)" stroke-width="'+(type==='equity'?2:1.2)+'" stroke-linejoin="round"/>';
 [0,Math.floor((pts.length-1)/2),pts.length-1].forEach(i=>{svg+='<text x="'+x(i)+'" y="'+(H-8)+'" fill="var(--faint)" text-anchor="'+(i===0?'start':i===pts.length-1?'end':'middle')+'" font-size="10" font-family="monospace">'+pts[i].date.slice(5)+'</text>';});
 svg+='</svg><div class="chart-tooltip"></div>';el.innerHTML=svg;
 el.onpointermove=e=>{const rect=el.getBoundingClientRect(),i=Math.max(0,Math.min(pts.length-1,Math.round(((e.clientX-rect.left)/rect.width*W-L)/(W-L-R)*(pts.length-1))));el.querySelector('.chart-tooltip').textContent=pts[i].date+' · '+(type==='equity'?money(pts[i].equity):pct(pts[i].drawdown));};
}
function table(headers,rows){return '<table><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,i)=>'<td class="'+(i?'num':'')+'">'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
function renderTrades(){const trades=result?.selected.trades||[];const pages=Math.max(1,Math.ceil(trades.length/15));page=Math.max(0,Math.min(page,pages-1));$('trade-count').textContent=trades.length+' trades';$('trade-page').textContent='Page '+(page+1)+' / '+pages;$('trade-prev').disabled=page===0;$('trade-next').disabled=page>=pages-1;$('trade-table').innerHTML=trades.length?table(['Entry (ET)','Ticker','Side','Shares','Entry','Exit','Net P&L','R','Exit reason'],trades.slice(page*15,(page+1)*15).map(t=>[time(t.entryTime),t.ticker,t.side,t.qty,money(t.entry),money(t.exit),money(t.pnl),t.r.toFixed(2),t.reason])):'<div class="empty">No completed trades. Inspect dates, filters, and data quality.</div>';}
function renderQuality(){
 if(!result)return;
 const p=result.provenance.find(p=>p.ticker===config.ticker),q=result.comparisons.find(r=>r.ticker===config.ticker&&r.strategy===config.strategy).result.quality;
 const pairs=[['Instrument',p.ticker],['Provider',p.source.name],['Feed',p.source.feed],['Retrieved',p.source.retrieved],['Bar type','1-minute stock OHLC'],['Adjustment',p.source.adjustment],['Available dates',p.first+' to '+p.last],['Rows loaded',num(p.rows)],['Data timezone','America/New_York (DST aware)']];
 $('provenance').innerHTML=pairs.map(x=>'<div class="provenance-row"><span>'+esc(x[0])+'</span><span>'+esc(x[1])+'</span></div>').join('')+'<p class="hash">SHA-256 dataset: '+esc(p.source.hash)+'</p><a class="source-link" href="https://docs.alpaca.markets/docs/historical-stock-data-1" target="_blank" rel="noreferrer">Provider historical data documentation ↗</a><br><a class="source-link" href="https://www.nyse.com/markets/hours-calendars" target="_blank" rel="noreferrer">NYSE session calendar ↗</a>';
 $('quality-summary').innerHTML='<p><b>'+q.valid+' / '+q.expected+'</b> complete scheduled sessions. '+q.missing+' missing sessions; '+q.incomplete+' incomplete sessions; '+q.warmup+' sessions without required ATR warmup. '+p.fatal.length+' fatal row errors. '+p.outside+' non-RTH rows ignored.</p><p class="helper">Strict 390-minute regular-session coverage is required in this supported date window. Missing bars are never synthesized. Full-session validation is an offline data-integrity precheck, not a live-replicable availability test. ATR uses only prior completed sessions.</p>'+(p.fatal.length?'<p>'+esc(p.fatal.slice(0,5).join('; '))+'</p>':'');
 $('quality-count').textContent=p.sessions.length+' observed sessions';
 const map=new Map(p.sessions.map(s=>[s.date,s]));
 $('quality-table').innerHTML=table(['Session','Bars','ATR(14)','Status'],tradingDays(result.config.start,result.config.end).map(d=>{const s=map.get(d);return [d,s?s.bars+' / '+s.expected:'0 / 390',s?.atr?.toFixed(4)||'Unavailable',!s?'MISSING':!s.valid?'BLOCKED: '+s.reason:!s.atr?'NO ATR WARMUP':'Complete'];}));
 const health=q.missing+q.incomplete+q.warmup+p.fatal.length===0;
 $('health-tag').textContent=health?'COVERAGE PASSED':'REVIEW EXCLUSIONS';
 $('health-summary').innerHTML='<p>'+q.valid+' / '+q.expected+' complete sessions</p><p>'+q.warmup+' missing ATR warmups · '+p.fatal.length+' malformed-row errors</p><p class="helper">'+esc(p.source.name)+' · Retrieved '+esc(p.source.retrieved.slice(0,10))+'. Provider accuracy and licensing require owner review.</p>';
}
function renderComparison(){
 if(!result)return;const cs=result.comparisons;
 $('comparison-table').innerHTML=table(['Instrument','Candidate','Net return','Max DD','Win rate','Expectancy','Trades','Profit factor'],cs.map(c=>[c.ticker,c.strategy==='orb'?'Opening range':'Touch & Turn',c.result.blocked?'BLOCKED':pct(c.result.net),c.result.blocked?'—':'-'+c.result.maxDD.toFixed(2)+'%',pct(c.result.winRate).replace('+',''),money(c.result.expectancy),c.result.trades.length,c.result.profitFactor?.toFixed(2)||'N/A']));
 const months=[...new Set(cs.flatMap(c=>c.result.monthly.map(m=>m.month)))].sort();
 $('monthly-table').innerHTML=table(['Month',...cs.map(c=>c.ticker+' / '+(c.strategy==='orb'?'ORB':'T&T'))],months.map(m=>[m,...cs.map(c=>pct(c.result.monthly.find(x=>x.month===m)?.return))]));
 const base=result.selected,stress=result.stress;
 $('sensitivity').innerHTML='<div class="sensitivity-grid"><div><b>Configured costs</b><p>'+pct(base.net)+' return · '+money(base.expectancy)+' / trade</p></div><div><b>Higher-cost scenario</b><p>'+pct(stress.net)+' return · '+money(stress.expectancy)+' / trade</p></div></div><p class="helper">Stress uses 2× configured costs, capped at 100 bps slippage and $1/share/side. It reruns sizing and fills. Borrow fees, market impact, dividends, and taxes are excluded. Short availability is assumed only when explicitly enabled.</p>';
}
function renderRules(){
 $('rules-content').innerHTML=[
 ['A','Opening range continuation','Build the 09:30–09:44 ET high/low. Two consecutive closes outside the same edge confirm follow-through. Enter at the next eligible bar open. Default structural stop is the opposite edge; target is the chosen reward/risk multiple.','Candidate parameterization. No same-bar signal fill.','PRICE TESTABLE'],
 ['B','Touch & Turn','Use the opening-range candle direction. Bearish opens place a long limit at the range low; bullish opens place a short limit at the range high only when shorts are enabled. Default target is 0.382 × range inward; stop is 0.191 × range outward.','Target direction is explicit; reversing Fibonacci anchors does not change the distance.','PRICE TESTABLE'],
 ['C','Gamma-level reversal','Requires gamma flip, call/put walls, and timestamped gamma evidence. These observations are unavailable in stock OHLC.','Disabled. No price-only stand-in is silently substituted.','DISABLED'],
 ['D','Premium-flow continuation','Requires option-flow pressure, premium acceleration, and independent exit/reversal evidence. None are inputs to this stock-only exercise.','Disabled. This dashboard does not backtest options.','DISABLED']
 ].map(x=>'<article class="rule-card"><div class="rule-letter">'+x[0]+'</div><div><h3>'+x[1]+'</h3><p>'+x[2]+'</p><small>'+x[3]+'</small></div><span class="tag">'+x[4]+'</span></article>').join('');
 $('assumptions-content').innerHTML=[
 ['Price proxy, not options performance','Only ETF share open, high, low, and close enter the simulation. There is no premium, implied volatility, gamma, spread, or option-contract return.'],
 ['Historical snapshot','The default requested window is May 6 through November 6, 2026. April is loaded for prior-session ATR. No live data refresh or ongoing monitoring is implied.'],
 ['Fill timing and ambiguity','ORB confirms two closes then enters next eligible minute. Touch & Turn limits are active only after the opening range exists. If the entry minute also touches its target, the target is ignored on that minute; stops remain active. Stop takes precedence whenever both exits touch. Gap stops fill at the adverse open.'],
 ['Position sizing and daily budget','Whole shares use the smaller of risk budget and available capital. No leverage. Stops include a daily equity-floor constraint, but gaps, fills, and slippage can exceed planned limits. Per-instrument runs do not share capital or a portfolio loss budget.'],
 ['Drawdown measurement','Reported maximum uses conservative adverse minute extremes capped by protective exits; the displayed curve uses daily closes. Intrabar sequencing remains unknowable from OHLC alone.'],
 ['Return conventions','Simple equity return; expectancy is average net dollars per completed trade. Win rate counts net-positive trades; flat trades are not wins. Profit factor is net winning P&L divided by absolute losing P&L, N/A when denominator is zero.'],
 ['Costs and missing evidence','Per-share commissions and adverse basis-point slippage apply at both ends. Borrow cost, taxes, dividends, partial fills, queue priority, and market impact are omitted. Short borrow is assumed only when enabled.'],
 ['Validation boundary','All comparisons are exploratory and in sample. There is no validated predictive edge, untouched holdout, or completed forward-paper evaluation. Signed review never authorizes live orders.'],
 ['Workspace persistence','Parameters, notes, and audit entries save in this browser. Imported bars stay in memory; exports include them. Checklist and approval reset on reload so stale approvals cannot be reused. Export a JSON decision record for durable review.']
 ].map(x=>'<div class="assumption-item"><h3>'+x[0]+'</h3><p>'+x[1]+'</p></div>').join('');
}
function renderSummary(){const c=result?.config||config;$('signal-summary').innerHTML='<p><b>'+(c.strategy==='orb'?'Opening range continuation':'Touch & Turn')+'</b></p><p>'+(c.strategy==='orb'?'15-minute range. Two confirming closes. Next-bar entry.':'Opening-range edge entry. Explicit inward target. Prior-session ATR gate.')+'</p><p class="helper">'+(c.stopMode==='percent'?'Custom percentage bracket.':'Strategy structural bracket.')+' '+(c.direction==='long'?'Long only.':'Long and short; borrow assumed.')+'</p>';}
function renderAudit(){$('audit-table').innerHTML=audit.length?table(['Timestamp (UTC)','Action','Details'],[...audit].reverse().map(a=>[a.at,a.action,a.details])):'<div class="empty">Your research history will appear here.</div>';}
function canApprove(){return result&&!dirty&&!busy&&!result.selected.blocked&&result.selected.trades.length>0&&result.selected.quality.missing===0&&result.selected.quality.incomplete===0&&result.selected.quality.warmup===0&&tests?.passed===true&&checks.every(Boolean)&&$('reviewer').value.trim()&&$('review-notes').value.trim();}
function renderReview(){
 $('review-checks').innerHTML=checklist.map((x,i)=>'<label class="review-check"><input type="checkbox" data-check="'+i+'" '+(checks[i]?'checked':'')+'><span>'+x[0]+'<small>'+x[1]+'</small></span></label>').join('');
 $('check-progress').textContent=checks.filter(Boolean).length+' / 8';$('approve').disabled=!canApprove();
 $('approval-state').textContent=approval?'RESEARCH REVIEW RECORDED':'PENDING OWNER REVIEW';
 $('decision-record').textContent=approval?'RESEARCH APPROVED\nReviewer: '+approval.reviewer+'\nRecorded: '+approval.at+'\nEvidence: '+approval.fingerprint:'Decision: PENDING\n'+(!result?'Run a simulation first.':dirty?'Recompute changed inputs before review.':!result.selected.trades.length?'No completed trades to approve.':!tests?.passed?'Validation evidence unavailable.':'Complete all checks, name, and review notes to record this research decision.');
}
function renderAll(){renderMetrics();renderSummary();if(result){chart('equity-chart',result.selected.curve,'equity');chart('drawdown-chart',result.selected.curve,'drawdown');$('chart-ticker').textContent=result.config.ticker;$('period-label').textContent=result.config.start+' through '+result.config.end;$('run-id').textContent='RUN '+result.fingerprint.slice(0,12).toUpperCase();renderQuality();renderComparison();}renderTrades();renderReview();updateNotice();}
const worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
worker.onmessage=({data:m})=>{
 if(m.type==='ready'){ready=true;toast(num(m.count)+' historical OHLC bars loaded.');run();return;}
 if(m.type==='error'){busy=false;ready=true;updateNotice();$('notice').textContent='Simulation unavailable: '+m.message;$('notice').classList.add('error');return;}
 if(m.type==='result'&&m.id===requestId){result=m;busy=false;dirty=JSON.stringify(config)!==JSON.stringify(m.config);page=0;checks.fill(false);approval=null;log('Simulation',m.config.ticker+' / '+m.config.strategy+' · '+m.selected.trades.length+' trades · '+m.fingerprint.slice(0,12));persist();renderAll();}
};
worker.onerror=()=>{busy=false;$('notice').textContent='The research worker could not load. Refresh the page or check network access.';$('notice').classList.add('error');};
function run(type='run',extra={}){try{config=readConfig();validateConfig(config);}catch(e){toast(e.message);return;}busy=true;checks.fill(false);approval=null;requestId++;updateNotice();renderReview();worker.postMessage({type,id:requestId,config,...extra});}
form.addEventListener('submit',e=>{e.preventDefault();run();});
form.addEventListener('input',e=>{const el=e.target;if(el.name&&el.name in defaults){config=readConfig();updateBracket();invalidate('inputs');}});
form.addEventListener('change',e=>{const el=e.target;if(el.name&&el.name in defaults){log('Input changed',el.name+' = '+String(config[el.name]));persist();}if(el.dataset.check!==undefined){checks[+el.dataset.check]=el.checked;$('check-progress').textContent=checks.filter(Boolean).length+' / 8';$('approve').disabled=!canApprove();}});
for(const [id,key] of [['strategy-notes','strategy'],['assumption-notes','assumptions']])$(id).addEventListener('input',()=>{if(key==='strategy')notes=$(id).value;else assumptions=$(id).value;invalidate('narrative');});
for(const id of ['reviewer','review-notes'])$(id).addEventListener('input',()=>{approval=null;renderReview();persist();});
$('approve').addEventListener('click',async()=>{if(!canApprove())return;const revision=requestId,reviewer=$('reviewer').value.trim(),reviewNotes=$('review-notes').value,outline=notes,assumptionSnapshot=assumptions,content=JSON.stringify({run:result.fingerprint,notes:outline,assumptions:assumptionSnapshot,reviewNotes,reviewer});const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)))].map(n=>n.toString(16).padStart(2,'0')).join('');if(revision!==requestId||!canApprove()||reviewer!==$('reviewer').value.trim()||reviewNotes!==$('review-notes').value||outline!==notes||assumptionSnapshot!==assumptions)return;approval={reviewer,notes:reviewNotes,at:new Date().toISOString(),fingerprint:hash,runFingerprint:result.fingerprint,checks:[...checks],scope:'Research review only. No live execution authorization.'};log('Research sign-off',hash.slice(0,16));renderReview();toast('Research decision recorded. Export your workspace to preserve it.');});
$('trade-prev').onclick=()=>{page--;renderTrades();};$('trade-next').onclick=()=>{page++;renderTrades();};
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-trades').onclick=()=>{const rows=result?.selected.trades;if(!rows?.length){toast('No completed trades to export.');return;}const keys=Object.keys(rows[0]);const csv=[keys.join(','),...rows.map(r=>keys.map(k=>'"'+String(r[k]).replaceAll('"','""')+'"').join(','))].join('\r\n');download('periscope-'+result.config.ticker+'-trades.csv',csv,'text/csv');};
$('export-workspace').onclick=()=>{download('periscope-review-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),config,notes,assumptions,reviewer:$('reviewer').value,reviewNotes:$('review-notes').value,checks,approval,audit,result,importedRows},null,2),'application/json');toast('Workspace exported with simulation evidence and review record.');};
function parseCSV(text){
 const lines=[];let row=[],value='',quote=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){value+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(value);value='';}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))lines.push(row);row=[];value='';}else value+=c;}
 if(quote)throw Error('Unclosed CSV quotation.');if(value||row.length){row.push(value);lines.push(row);}
 const headers=(lines.shift()||[]).map(v=>v.replace(/^\uFEFF/,'').trim().toLowerCase());const keys=['timestamp','open','high','low','close'],indices=keys.map(k=>headers.indexOf(k));if(indices.some(i=>i<0))throw Error('Required CSV headers: timestamp,open,high,low,close');
 if(lines.length>200000)throw Error('Maximum 200,000 bars per instrument.');
 return lines.map(r=>indices.map((index,i)=>i?Number(r[index]?.trim()):r[index]?.trim()));
}
$('csv-input').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>25*1024*1024){toast('CSV must be under 25 MB.');return;}try{const rows=parseCSV(await file.text());if(!rows.length)throw Error('CSV contains no bars.');importedRows[config.ticker]=rows;invalidate('import');log('CSV imported',config.ticker+' · '+rows.length+' rows');run('import',{ticker:config.ticker,rows,source:$('csv-source').value.trim()||file.name});}catch(e){toast(e.message);}e.target.value='';};
$('workspace-input').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>30*1024*1024)throw Error('Workspace must be under 30 MB.');const imported=JSON.parse(await file.text());if(imported.schemaVersion!==1)throw Error('Unsupported workspace format.');const proposed={...defaults,...imported.config};validateConfig(proposed);const incoming=imported.importedRows||{};if(Object.entries(incoming).some(([t,rows])=>!['SPY','QQQ'].includes(t)||!Array.isArray(rows)||rows.length>200000))throw Error('Invalid imported datasets.');config=proposed;notes=typeof imported.notes==='string'?imported.notes:defaultNotes;assumptions=typeof imported.assumptions==='string'?imported.assumptions:assumptions;importedRows=incoming;writeConfig();$('strategy-notes').value=notes;$('assumption-notes').value=assumptions;$('reviewer').value=typeof imported.reviewer==='string'?imported.reviewer:'';$('review-notes').value=typeof imported.reviewNotes==='string'?imported.reviewNotes:'';invalidate('workspace');log('Workspace imported','Approval reset; evidence will be recomputed.');run('workspace',{importedRows:incoming});toast('Workspace imported. Review resets and results are recomputed.');}catch(e){toast(e.message);}e.target.value='';};
$('restore-data').onclick=()=>{delete importedRows[config.ticker];invalidate('restore');log('Dataset restored',config.ticker);run('restore',{ticker:config.ticker});};
writeConfig();$('strategy-notes').value=notes;$('assumption-notes').value=assumptions;$('reviewer').value=saved.reviewer||'';$('review-notes').value=saved.reviewNotes||'';route();renderRules();renderAll();renderAudit();
fetch('validation.json').then(r=>{if(!r.ok)throw Error('No validation report');return r.json();}).then(r=>{tests=r;$('test-report').innerHTML='<p><b>'+esc(r.summary)+'</b></p><p>'+esc(r.checkedAt)+' · Engine '+esc(r.engine)+'</p><p>'+esc(r.checks.join(' · '))+'</p><p class="helper">'+esc(r.limits)+'</p>';renderReview();}).catch(()=>$('test-report').textContent='Automated validation report unavailable. Sign-off remains blocked.');
worker.postMessage({type:'load'});

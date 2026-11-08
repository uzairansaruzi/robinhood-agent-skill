// Periscope share-price research engine. No network, broker, or options code.
export const ENGINE_VERSION='1.0.0';
export const defaults={ticker:'SPY',start:'2026-05-06',end:'2026-11-06',strategy:'orb',direction:'long',exitRule:'bracket',stopMode:'structure',initial:10000,risk:1,allocation:100,stopLoss:0.5,takeProfit:1,rr:2,fee:0.005,slip:2,dailyLoss:3,maxTrades:3,lossPause:2,cooldown:5,minATR:0.25,maxGap:3,midday:true,eventDates:'',cutoff:'11:00'};
const holidays=new Set(['2026-01-01','2026-01-19','2026-02-16','2026-04-03','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-11-26','2026-12-25']);
export function tradingDays(start,end){const days=[];for(let n=Date.parse(start+'T12:00:00Z');n<=Date.parse(end+'T12:00:00Z');n+=86400000){const d=new Date(n),s=d.toISOString().slice(0,10);if(d.getUTCDay()>0&&d.getUTCDay()<6&&!holidays.has(s))days.push(s);}return days;}
const timeFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function etTime(timestamp){const p=Object.fromEntries(timeFormat.formatToParts(new Date(timestamp)).map(x=>[x.type,x.value]));return {date:p.year+'-'+p.month+'-'+p.day,minute:+p.hour*60 + +p.minute};}
export function validateConfig(c){
 if(!['SPY','QQQ'].includes(c.ticker)||!['orb','touch'].includes(c.strategy)||!['long','both'].includes(c.direction)||!['bracket','range'].includes(c.exitRule)||!['structure','percent'].includes(c.stopMode))throw Error('Unsupported strategy selection.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(c.start)||!/^\d{4}-\d{2}-\d{2}$/.test(c.end)||c.start>c.end||c.start<'2026-04-01'||c.end>'2026-11-06')throw Error('Choose dates from April 1 through November 6, 2026; start must precede end.');
 for(const [k,min,max] of [['initial',100,10000000],['risk',0.01,5],['allocation',1,100],['stopLoss',0.01,10],['takeProfit',0.01,30],['rr',0.1,10],['fee',0,1],['slip',0,100],['dailyLoss',0.1,20],['maxTrades',1,20],['lossPause',1,10],['cooldown',0,60],['minATR',0,5],['maxGap',0,50]])if(!Number.isFinite(c[k])||c[k]<min||c[k]>max)throw Error('Invalid '+k+'; expected '+min+' to '+max+'.');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.cutoff))throw Error('Entry cutoff must be HH:MM.');
 if(c.eventDates.split(/[\s,]+/).filter(Boolean).some(s=>!/^2026-\d\d-\d\d$/.test(s)||!Number.isFinite(Date.parse(s))))throw Error('Event exclusions must be YYYY-MM-DD dates.');
 return c;
}
export function prepare(rows){
 const sessions=new Map(),fatal=[],seen=new Set();let outside=0;
 for(let i=0;i<rows.length;i++){
  const row=rows[i];if(!Array.isArray(row)||row.length<5){fatal.push('Malformed row '+(i+1));continue;}
  const [t,open,high,low,close]=row;
  if(!Number.isFinite(Date.parse(t))||!/(Z|[+-]\d\d:\d\d)$/.test(t)||![open,high,low,close].every(x=>Number.isFinite(x)&&x>0)||high<Math.max(open,close,low)||low>Math.min(open,close,high)){fatal.push('Invalid OHLC/timestamp at row '+(i+1));continue;}
  const ms=Date.parse(t);if(ms%60000!==0){fatal.push('Non-minute timestamp at row '+(i+1));continue;}
  if(seen.has(ms)){fatal.push('Duplicate timestamp '+t);continue;}seen.add(ms);
  const {date,minute}=etTime(t);if(minute<570||minute>=960){outside++;continue;}
  if(!sessions.has(date))sessions.set(date,{date,bars:[],valid:false});
  sessions.get(date).bars.push({t,ms,minute,open,high,low,close});
 }
 const dates=[...sessions.keys()].sort();let previous;
 for(const date of dates){
  const s=sessions.get(date);s.bars.sort((a,b)=>a.ms-b.ms);
  const endMinute=date==='2026-11-27'||date==='2026-12-24'?780:960;
  s.expected=endMinute-570;s.valid=tradingDays(date,date).length===1&&s.bars.length===s.expected&&s.bars.every((b,i)=>b.minute===570+i);
  s.reason=s.valid?'Complete session':('Expected '+s.expected+' consecutive RTH minutes; received '+s.bars.length);
  s.open=s.bars[0]?.open;s.close=s.bars.at(-1)?.close;s.high=Math.max(...s.bars.map(b=>b.high));s.low=Math.min(...s.bars.map(b=>b.low));
  if(previous?.valid&&s.valid)s.tr=Math.max(s.high-s.low,Math.abs(s.high-previous.close),Math.abs(s.low-previous.close));
  previous=s;
 }
 // ATR is the arithmetic average of the previous 14 complete daily true ranges.
 for(let i=0;i<dates.length;i++){
  const s=sessions.get(dates[i]),history=dates.slice(Math.max(0,i-14),i).map(d=>sessions.get(d));
  s.atr=history.length===14&&history.every(x=>x.valid&&Number.isFinite(x.tr))?history.reduce((a,x)=>a+x.tr,0)/14:null;
  // A missing scheduled day invalidates ATR until 14 subsequent sessions pass.
  if(history.length===14&&tradingDays(history[0].date,s.date).length!==15)s.atr=null;
 }
 return {sessions,fatal,rows:rows.length,outside,first:dates[0],last:dates.at(-1)};
}
export function resolveExit(p,b,allowTarget=true){
 if(p.side===1){if(b.open<=p.stop)return {price:b.open,reason:'Stop gap'};if(b.low<=p.stop)return {price:p.stop,reason:'Stop-loss'};if(allowTarget&&b.high>=p.target)return {price:p.target,reason:'Take-profit'};}
 else{if(b.open>=p.stop)return {price:b.open,reason:'Stop gap'};if(b.high>=p.stop)return {price:p.stop,reason:'Stop-loss'};if(allowTarget&&b.low<=p.target)return {price:p.target,reason:'Take-profit'};}
 return null;
}
export function simulate(data,config){
 const c=validateConfig({...config}),trades=[],curve=[],rejections=[],quality={missing:0,incomplete:0,warmup:0,valid:0,expected:0};let equity=c.initial,peak=equity,maxDD=0;
 const events=new Set(c.eventDates.split(/[\s,]+/).filter(Boolean)),cutoff=c.cutoff.split(':').reduce((a,x)=>a*60 + +x,0);
 const mark=(value)=>{peak=Math.max(peak,value);maxDD=Math.max(maxDD,(peak-value)/peak*100);return (value-peak)/peak*100;};
 const reject=(date,reason)=>rejections.push({date,reason});
 if(data.fatal.length) return {blocked:true,error:data.fatal[0],trades,curve,quality,rejections,initial:equity,final:equity,net:0,maxDD:0,winRate:null,expectancy:null,profitFactor:null,monthly:[]};
 for(const date of tradingDays(c.start,c.end)){
  quality.expected++;const s=data.sessions.get(date);
  if(!s){quality.missing++;reject(date,'Missing session');curve.push({date,equity,drawdown:mark(equity)});continue;}
  if(!s.valid){quality.incomplete++;reject(date,s.reason);curve.push({date,equity,drawdown:mark(equity)});continue;}
  quality.valid++;
  if(!s.atr){quality.warmup++;reject(date,'Missing prior 14-session ATR warmup');curve.push({date,equity,drawdown:mark(equity)});continue;}
  if(events.has(date)){reject(date,'User event exclusion');curve.push({date,equity,drawdown:mark(equity)});continue;}
  const opening=s.bars.slice(0,15),hi=Math.max(...opening.map(b=>b.high)),lo=Math.min(...opening.map(b=>b.low)),range=hi-lo;
  const previousDate=tradingDays('2026-04-01',date).at(-2),previous=data.sessions.get(previousDate);
  const gap=previous?.valid?Math.abs(s.open/previous.close-1)*100:Infinity;
  if(gap>c.maxGap){reject(date,'Opening gap filter');curve.push({date,equity,drawdown:mark(equity)});continue;}
  if(range<=0||range<c.minATR*s.atr){reject(date,'Opening range / ATR filter');curve.push({date,equity,drawdown:mark(equity)});continue;}
  const dayStart=equity,dayFloor=dayStart*(1-c.dailyLoss/100);let position=null,pending=null,dayTrades=0,losses=0,lastExit=-100,lockedSide=0,streakSide=0,streak=0;
  const close=(price,reason,b,i)=>{
   const p=position,exit=price*(1-p.side*c.slip/10000),fees=2*c.fee*p.qty,pnl=p.qty*(exit-p.entry)*p.side-fees;
   equity+=pnl;trades.push({date,ticker:c.ticker,side:p.side===1?'Long':'Short',entryTime:p.t,exitTime:b.t,entry:p.entry,exit,qty:p.qty,stop:p.stop,target:p.target,pnl,fees,reason,r:pnl/p.risk});
   losses=pnl<0?losses+1:0;lastExit=i;position=null;mark(equity);
  };
  for(let i=15;i<s.bars.length;i++){
   const b=s.bars[i],isLast=i===s.bars.length-1;let justEntered=false;
   if(position?.exitNext){close(b.open,'Range re-entry exit',b,i);pending=null;}
   if(!position&&!isLast&&dayTrades<c.maxTrades&&losses<c.lossPause&&equity>dayFloor&&i-lastExit>c.cooldown&&b.minute<cutoff&&!(c.midday&&b.minute>=645&&b.minute<840)){
    let side=0,rawEntry=0;
    if(c.strategy==='orb'&&pending){side=pending.side;rawEntry=b.open;pending=null;}
    else if(c.strategy==='touch'){
     side=opening.at(-1).close<opening[0].open?1:opening.at(-1).close>opening[0].open?-1:0;
     const limit=side===1?lo:hi;
     if(side===1&&b.low<=limit)rawEntry=Math.min(b.open,limit);
     if(side===-1&&b.high>=limit)rawEntry=Math.max(b.open,limit);
    }
    if(side&&rawEntry&&(c.direction==='both'||side===1)&&(!lockedSide||lockedSide===side)){
     const entry=rawEntry*(1+side*c.slip/10000);
     let stop,target;
     if(c.stopMode==='percent'){stop=entry*(1-side*c.stopLoss/100);target=entry*(1+side*c.takeProfit/100);}
     else if(c.strategy==='orb'){stop=side===1?lo:hi;target=entry+side*Math.abs(entry-stop)*c.rr;}
     else{const edge=side===1?lo:hi;target=edge+side*range*0.382;stop=edge-side*range*0.191;}
     const perShare=(entry-stop)*side,exitCost=c.slip/10000*Math.abs(stop)+2*c.fee,riskBudget=Math.min(equity*c.risk/100,equity-dayFloor);
     const qty=Math.floor(Math.min(riskBudget/(perShare+exitCost),equity*c.allocation/100/(entry+c.fee)));
     if(perShare>0&&(target-entry)*side>0&&qty>0){position={side,entry,stop,target,qty,t:b.t,risk:qty*(perShare+exitCost)};dayTrades++;lockedSide=side;justEntered=true;}
    }
   }else if(!position)pending=null;
   if(position){
    const p=position;
    // Include the daily realized-loss budget in the active protective stop.
    const budgetStop=p.entry+p.side*((dayFloor-equity)/p.qty+2*c.fee);
    const slipAdjusted=budgetStop/(1-p.side*c.slip/10000);
    const effective={...p,stop:p.side===1?Math.max(p.stop,slipAdjusted):Math.min(p.stop,slipAdjusted)};
    const hit=resolveExit(effective,b,!(justEntered&&c.strategy==='touch'));
  const stopHit=hit&&hit.reason!=='Take-profit';
  const adverse=p.side===1?Math.max(b.low,stopHit?hit.price:effective.stop):Math.min(b.high,stopHit?hit.price:effective.stop);
    mark(equity+p.qty*(adverse-p.entry)*p.side-2*c.fee*p.qty);
    if(hit)close(hit.price,hit.reason,b,i);
    else if(isLast)close(b.close,'End of session',b,i);
    else{const floating=equity+p.qty*(b.close-p.entry)*p.side-2*c.fee*p.qty;mark(floating);if(c.exitRule==='range'&&b.close>=lo&&b.close<=hi)position.exitNext=true;}
   }
   if(c.strategy==='orb'&&!position&&!isLast){
    const side=b.close>hi?1:b.close<lo?-1:0;
    if(side&&side===streakSide)streak++;else{streakSide=side;streak=side?1:0;}
    if(streak>=2){pending={side};streak=0;}
   }
  }
  curve.push({date,equity,drawdown:mark(equity)});
 }
 let grossWin=0,grossLoss=0,wins=0;for(const t of trades){if(t.pnl>0){wins++;grossWin+=t.pnl;}else grossLoss-=t.pnl;}
 const months=new Map();let prev=c.initial;
 for(const p of curve){const m=p.date.slice(0,7);if(!months.has(m))months.set(m,{month:m,start:prev,end:p.equity,trades:0,pnl:0});const row=months.get(m);row.end=p.equity;row.pnl=row.end-row.start;row.return=(row.end/row.start-1)*100;prev=p.equity;}
 for(const t of trades)if(months.has(t.date.slice(0,7)))months.get(t.date.slice(0,7)).trades++;
 return {blocked:quality.valid===0,error:quality.valid===0?'No complete scheduled sessions available. Import licensed 1-minute OHLC data.':null,trades,curve,rejections,quality,initial:c.initial,final:equity,net:(equity/c.initial-1)*100,maxDD,winRate:trades.length?wins/trades.length*100:null,expectancy:trades.length?(equity-c.initial)/trades.length:null,profitFactor:grossLoss?grossWin/grossLoss:null,monthly:[...months.values()]};
}

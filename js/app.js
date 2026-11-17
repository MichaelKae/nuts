/* Nuts · главный экран: таймер, игроки, итоги, комната, кабинет. © MichaelKae, CC BY-NC 4.0 */
(()=>{
if(/^#r-/i.test(location.hash))return;
const KEY='pokerTimer.v2';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

/* ===== State ===== */
function freshTimer(){return {idx:0,running:false,endsAt:0,remaining:null,startedAt:null,pausedTotal:0,pausedAt:null,warned:false};}
function defaults(){ return {
  name:'Покерный вечер', currency:'₽', mode:'cash',
  buyin:1000, startStack:2000, rebuyCost:1000, rebuyStack:2000,
  maxRebuys:3, rebuyUntil:0, lateRegUntil:4, rebuyWhen:'bust', halfRebuy:true, showCombos:true,
  addonOn:false, addonCost:1000, addonStack:2000,
  bountyOn:false, bounty:200,
  payoutsAuto:true, payouts:[50,30,20], sound:true, voice:true,
  sets:[{id:1,name:'Мой набор',on:true,chips:[{v:10,n:100,c:'#f5f5f4',d:'#2563eb'},{v:20,n:50,c:'#dc2626',d:'#ffffff'},{v:50,n:50,c:'#2563eb',d:'#ffffff'},{v:100,n:50,c:'#16a34a',d:'#ffffff'},{v:500,n:50,c:'#111111',d:'#ffffff'}]}],
  archive:[], voiceName:'', log:[], autoExport:true,
  gen:{hours:3,levelMin:12,breakEvery:60,breakMin:10,players:9,rebuys:6,grow:5,maxMin:25,depth:100,pace:'standard',ante:'none',anteFrom:4},
  calc:{players:9,reserve:6},
  levels:null, roster:[], players:[], seats:null, timer:freshTimer(), hist:[]
};}
let S; try{S=JSON.parse(localStorage.getItem(KEY));}catch(e){S=null}
S=Object.assign(defaults(),S||{});migrate();
function migrate(){if(S.chips){if(!S.sets||!S.sets.length||(S.sets.length===1&&S.sets[0].id===1&&S.chips.length))S.sets=[{id:1,name:'Мой набор',on:true,chips:S.chips}];delete S.chips;}if(!S.archive)S.archive=[];if(!S.mig42){S.halfRebuy=true;S.mig42=1;}if(S.name==='Покер с коллегами')S.name='Покерный вечер';(S.players||[]).forEach(p=>{if(p.paid==null){p.paid=S.buyin+p.rebuys*S.rebuyCost+p.addons*S.addonCost;p.chipsIn=S.startStack+p.rebuys*S.rebuyStack+p.addons*S.addonStack;}});S.gen=Object.assign({grow:0,maxMin:25,depth:100,pace:''},S.gen);if(!S.log)S.log=[];}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}scheduleFile();try{publishSoon();}catch(e){}try{snapSoon();}catch(e){}}

/* ===== Utils ===== */
const fmt=n=>Math.round(n||0).toLocaleString('ru-RU');
const money=n=>fmt(n)+' '+(S.currency||'');
const sgn=n=>(n>0?'+':n<0?'−':'')+money(Math.abs(n));
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fmtT(ms){ms=Math.max(0,ms);const t=Math.ceil(ms/1000),h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return h?h+':'+pad(m)+':'+pad(s):pad(m)+':'+pad(s);}
const L=i=>S.levels[i];
const Lms=i=>(L(i)?L(i).min:0)*60000;
const bstr=l=>!l?'—':l.type==='break'?'Перерыв':fmt(l.sb)+' / '+fmt(l.bb);
function lvlNum(i){let n=0;for(let k=0;k<=i&&k<S.levels.length;k++)if(S.levels[k].type==='level')n++;return n;}
const curLvl=()=>lvlNum(T().idx);
const chipsAsc=()=>{const m=new Map();S.sets.filter(st=>st.on).forEach(st=>st.chips.forEach(c=>{if(!(c.v>0))return;const e=m.get(c.v);if(e)e.n+=c.n;else m.set(c.v,{v:c.v,n:c.n,c:c.c,d:c.d});}));return[...m.values()].filter(c=>c.n>0).sort((a,b)=>a.v-b.v);};
const minChip=()=>(chipsAsc()[0]||{v:1}).v;
const gcd=(a,b)=>b?gcd(b,a%b):a;
const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h;};
const avStyle=n=>`background:linear-gradient(135deg,hsl(${hue(n)},70%,65%),hsl(${(hue(n)+40)%360},70%,55%))`;
const isT=()=>S.mode==='tournament';
const editing=sel=>{const a=document.activeElement;return!!(a&&a.matches('input:not([type=checkbox]):not([type=color]),select')&&a.closest(sel));};

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),2000);}
let mFocus=null,mOpenAt=0,mDismiss=null;
function modal(html,btns,onDismiss){ mDismiss=onDismiss||null; if(!$('#modal').classList.contains('on'))mFocus=document.activeElement; $('#mbox').innerHTML=html+'<div class="mbtns"></div>'; const bx=$('#mbox .mbtns');
  btns.forEach(b=>{const e=document.createElement('button');e.className='btn '+(b.cls||'');e.textContent=b.t;e.onclick=ev=>{ if(ev&&ev.detail>1&&Date.now()-mOpenAt<600) return; mDismiss=null; if(b.fn&&b.fn()===false) return; closeModal(); };bx.appendChild(e);});
  if(!$('#modal').classList.contains('on'))mOpenAt=Date.now(); $('#modal').classList.add('on'); const f=$('#mbox input,#mbox select'); if(f) setTimeout(()=>f.focus(),50); }
function closeModal(dis){const dz=dis?mDismiss:null;mDismiss=null;$('#modal').classList.remove('on');if(dz)setTimeout(dz,0);const f=mFocus;mFocus=null;setTimeout(()=>{if(!$('#modal').classList.contains('on')&&f&&f.focus&&document.contains(f)){try{f.focus({preventScroll:true});}catch(e){}}},0);}

$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'&&!(e.detail>1&&Date.now()-mOpenAt<600))closeModal(true);});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&e.detail>0)b.blur();});
function confirmB(title,text,yes,yesT='Да',cls='pri'){modal(`<h3>${title}</h3><p>${text}</p>`,[{t:'Отмена'},{t:yesT,cls,fn:yes}]);}

/* ===== Sound ===== */
let AC=null;
function ac(){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){}return AC;}
function beep(p){if(!S.sound)return;const a=ac();if(!a)return;let t=a.currentTime;
  p.forEach(([f,d])=>{const o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.value=f;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.45,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.05);t+=d+.07;});}
const sndLevel=()=>beep([[784,.18],[988,.18],[1319,.5]]);
const sndWarn=()=>beep([[660,.18],[660,.18]]);
function ruVoices(){try{return speechSynthesis.getVoices().filter(v=>/^ru/i.test(v.lang));}catch(e){return[];}}
function pickVoice(){const vs=ruVoices();if(!vs.length)return null;const byName=vs.find(v=>v.name===S.voiceName);if(byName)return byName;
  return vs.find(v=>/dmitry/i.test(v.name)&&/natural|online/i.test(v.name))||vs.find(v=>/natural|online/i.test(v.name)&&/dmitry|pavel|maxim|yuri/i.test(v.name))||vs.find(v=>/pavel|dmitry|maxim|yuri|aleksandr|alexander/i.test(v.name))||vs.find(v=>/google/i.test(v.name))||vs.find(v=>/natural|online/i.test(v.name))||vs[0];}
const VP=window.NUTS_VOICE||null,VPN=VP?new Set(VP.nums):null,VPB=VP?new Set(VP.brk):null,VPP=VP?new Set(VP.pairs||[]):null;
const usePack=()=>!!VP&&(!S.voiceName||S.voiceName==='__pack__');
let voiceSig='';function fillVoices(){const sel=$('#voiceSel');if(!sel)return;const vs=ruVoices(),cur=usePack()?null:pickVoice();const sig=vs.map(v=>v.name).join('|')+'#'+(usePack()?'__pack__':cur?cur.name:'');if(sig===voiceSig)return;voiceSig=sig;
  const opts=(VP?[`<option value="__pack__" ${usePack()?'selected':''}>${esc(VP.name)} — встроенный, одинаковый везде</option>`]:[]).concat(vs.map(v=>`<option value="${esc(v.name)}" ${cur&&v.name===cur.name?'selected':''}>${esc(v.name)}</option>`));
  sel.innerHTML=opts.length?opts.join(''):'<option>Русских голосов в системе нет</option>';sel.disabled=!opts.length;}
let vq=[],vA=null;
function clipOk(n){if(!VP)return false;if(n.startsWith('n_'))return VPN.has(+n.slice(2));if(n.startsWith('lvl_'))return +n.slice(4)>=1&&+n.slice(4)<=VP.lvl;if(n.startsWith('brk_'))return VPB.has(+n.slice(4));if(n.startsWith('bl_')){const [a,b]=n.slice(3).split('_').map(Number);return b===a*2&&VPP.has(b);}return true;}
function vNext(){const n=vq.shift();if(!n){vA=null;return;}const a=new Audio('voice/'+n+'.mp3');vA=a;a.onended=()=>setTimeout(vNext,70);a.onerror=()=>vNext();const pr=a.play();if(pr&&pr.catch)pr.catch(()=>{vq=[];});}
function speak(parts,text){if(!S.voice)return;if(usePack()&&parts&&parts.every(clipOk)){try{speechSynthesis.cancel();}catch(e){}if(vA){try{vA.pause();}catch(e){}}vq=parts.slice();vNext();return;}say(text);}
try{speechSynthesis.onvoiceschanged=fillVoices;}catch(e){}
function say(t){if(!S.voice||!t)return;try{const u=new SpeechSynthesisUtterance(t);u.lang='ru-RU';const v=pickVoice();if(v)u.voice=v;u.rate=1;speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}}
function announce(i){const l=L(i);if(!l)return; if(l.type==='break'){const cu=colorUpNew(i+1);speak(['brk_'+l.min].concat(cu.length?['colorup',...cu.map(v=>'n_'+v)]:[]),'Перерыв '+l.min+' минут'+(cu.length?'. Можно убрать фишки '+cu.join(', '):''));}
  else{const pair='bl_'+l.sb+'_'+l.bb,bl=clipOk(pair)?[pair]:['blinds','n_'+l.sb,'na','n_'+l.bb];speak(['lvl_'+lvlNum(i)].concat(bl,l.ante?['ante','n_'+l.ante]:[]),'Уровень '+lvlNum(i)+'. Блайнды '+l.sb+' на '+l.bb+(l.ante?', анте '+l.ante:'')+'.');}}

/* ===== Wake lock ===== */
let wl=null;
async function awake(on){try{if(on&&!wl&&navigator.wakeLock){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>wl=null);}if(!on&&wl){wl.release();wl=null;}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&T().running)awake(true);});

/* ===== Game log ===== */
function elapsed(){const t=S.timer;return t.startedAt==null?0:(t.running?Date.now():(t.pausedAt||Date.now()))-t.startedAt-t.pausedTotal;}
function clockElapsed(){const t=S.timer;if(t.startedAt==null)return 0;let ms=0;for(let k=0;k<t.idx;k++)ms+=Lms(k);return ms+Math.max(0,Lms(t.idx)-Math.max(0,rem()));}
function logEv(type,text){S.log.push({at:Date.now(),el:clockElapsed(),lvl:L(T().idx)&&L(T().idx).type==='break'?'☕':lvlNum(T().idx),type,text});}
const LOGI={time:'⏱',start:'▶️',pause:'⏸',resume:'▶️',level:'⏫',break:'☕',join:'🪑',bust:'💥',rebuy:'💸',back:'↩️',addon:'➕',del:'🗑',seats:'🎲',win:'🏆',reset:'⟲',undo:'↶',chips:'🧮'};

/* ===== Timer ===== */
const T=()=>S.timer;
function rem(){const t=T();if(t.running)return t.endsAt-Date.now();return t.remaining==null?Lms(t.idx):t.remaining;}
function start(){const t=T();if(t.running)return;ac();const first=t.startedAt==null;if(first){const seat=[...S.log].reverse().find(e=>e.type==='seats'&&!e.undone);S.log=[];S.hist=[];if(S.players.length)logEv('join','За стол сели: '+S.players.map(p=>p.name).join(', '));if(seat&&S.players.every(p=>seat.text.includes(p.name)))S.log.push(Object.assign({},seat,{at:Date.now()}));t.startedAt=Date.now();}
  if(first){const l=L(t.idx);logEv('start','Игра началась'+(l&&l.type==='level'?' · блайнды '+fmt(l.sb)+' / '+fmt(l.bb):''));}else logEv('resume','Продолжили');
  if(t.pausedAt){t.pausedTotal+=Date.now()-t.pausedAt;t.pausedAt=null;}
  const r=rem();t.endsAt=Date.now()+r;t.running=true;t.warned=r<=60000;awake(true);save();render();}
function pause(){const t=T();if(!t.running)return;t.remaining=t.endsAt-Date.now();t.running=false;t.pausedAt=Date.now();logEv('pause','Пауза');awake(false);save();render();}
const toggle=()=>{if(T().running)return pause();if(T().startedAt==null&&!S.players.length)return confirmB('Игроков пока нет','Добавьте игроков на вкладке «Игроки» — или запустите таймер без них.',start,'Запустить таймер');start();};
function lvlLog(i){const l=L(i);if(!l)return;if(l.type==='break')logEv('break','Перерыв '+l.min+' мин');else logEv('level','Уровень '+lvlNum(i)+': '+fmt(l.sb)+' / '+fmt(l.bb)+(l.ante?', анте '+fmt(l.ante):''));}
function step(d){const t=T(),i=t.idx+d;if(i<0||i>=S.levels.length)return;goto(i,d<0);}
function goto(i,silent){const t=T();i=Math.max(0,Math.min(S.levels.length-1,i));const ch=i!==t.idx;t.idx=i;t.remaining=Lms(i);t.warned=false;if(t.startedAt!=null){if(ch)lvlLog(i);else logEv('reset','Уровень перезапущен');}
  if(t.running)t.endsAt=Date.now()+t.remaining; if(!silent){sndLevel();announce(i);} save();render();}
function addTime(ms){const t=T();if(t.startedAt!=null)logEv('time',(ms>0?'+':'−')+Math.abs(ms/60000)+' мин к уровню');if(t.running)t.endsAt=Math.max(Date.now()+1000,t.endsAt+ms);else t.remaining=Math.max(1000,rem()+ms);if(rem()>60000)t.warned=false;save();render();}
function tick(){const t=T();
  if(t.running){const r=t.endsAt-Date.now();
    if(r<=60000&&!t.warned&&Lms(t.idx)>60000){t.warned=true;sndWarn();setTimeout(()=>speak(['warn'],'Осталась одна минута.'),700);save();}
    if(r<=0){ if(t.idx>=S.levels.length-1){extendLevels();logEv('level','Структура закончилась — добавлен уровень');toast('Структура закончилась — добавил уровень, игра продолжается');}
      {let over=-r,i=t.idx+1;while(over>=Lms(i)&&i<S.levels.length-1){over-=Lms(i);i++;}
        t.idx=i;t.endsAt=Date.now()+Lms(i)-over;t.warned=false;lvlLog(i);save();sndLevel();announce(i);render();}}}
  renderClock();}

/* ===== Structure generator ===== */
function niceList(){const c=minChip(),out=new Set();
  for(let p=0;p<8;p++)for(const b of [1,1.2,1.5,1.6,2,2.5,3,4,5,6,8]){const v=Math.round(b*10**p);if(v>=2*c&&(v/2)%c===0)out.add(v);}
  return [...out].sort((a,b)=>a-b);}
function niceNear(x){const N=niceList();return N.reduce((a,b)=>Math.abs(Math.log(b/x))<Math.abs(Math.log(a/x))?b:a,N[0]);}
function niceAbove(x){return niceList().find(v=>v>x)||Math.round(x*2);}
function extendLevels(){const lv=S.levels.filter(l=>l.type==='level');const a=lv[lv.length-1]||{bb:20,min:15},b=lv[lv.length-2];
  const r=b&&b.bb?Math.min(2,Math.max(1.25,a.bb/b.bb)):1.5;let bb=niceNear(a.bb*r);if(bb<=a.bb)bb=niceAbove(a.bb);
  S.levels.push({type:'level',sb:bb/2,bb,ante:0,min:a.min||15});return S.levels.length-1;}
function regen(){const t=T(),started=t.startedAt!=null,num=curLvl();S.levels=generate();let idx=0;
  if(started){idx=S.levels.findIndex((l,i)=>l.type==='level'&&lvlNum(i)===Math.max(1,num));if(idx<0)idx=S.levels.length-1;}
  t.idx=idx;t.remaining=Lms(idx);t.warned=false;if(t.running)t.endsAt=Date.now()+t.remaining;if(started)logEv('reset','Структура пересобрана, продолжаем с уровня '+lvlNum(idx));}
function generate(){
  const g=S.gen,N=niceList(),s=S.startStack||1000;
  const near=x=>N.reduce((a,b)=>Math.abs(Math.log(b/x))<Math.abs(Math.log(a/x))?b:a,N[0]);
  const above=x=>N.find(v=>v>x)||x*2;
  const total=s*Math.max(2,g.players)+(S.rebuyStack||s)*Math.max(0,g.rebuys);
  const startBB=near(Math.max(2*minChip(),s/Math.max(10,g.depth||100)));
  const plan=[];let t=0,sb=0,lm=Math.max(3,g.levelMin);const H=Math.max(.5,g.hours)*60,mx=Math.max(lm,g.maxMin||lm);
  while(t<H){plan.push(lm);t+=lm;sb+=lm;if(g.breakEvery>0&&sb>=g.breakEvery&&t<H){plan.push('B');t+=g.breakMin;sb=0;lm=Math.min(mx,lm+(g.grow||0));}}
  const k=plan.filter(x=>x!=='B').length;
  const endBB=Math.max(startBB*3,total/15);
  const q=k>1?Math.pow(endBB/startBB,1/(k-1)):1.5;
  let prev=0,i=0;const out=[];
  const push=(bb,m)=>{out.push({type:'level',sb:bb/2,bb,ante:0,min:m});prev=bb;};
  plan.forEach(x=>{if(x==='B'){out.push({type:'break',min:g.breakMin});return;}
    let bb=near(startBB*Math.pow(q,i++));if(bb<=prev)bb=above(prev);push(bb,x);});
  for(let j=0;j<4;j++){let bb=near(prev*q);if(bb<=prev)bb=above(prev);push(bb,lm);}  // запас уровней
  const am=g.ante||'none';if(am!=='none'){let li=0;out.forEach(l=>{if(l.type!=='level')return;li++;if(li<Math.max(1,g.anteFrom||1))return;if(am==='bba'){l.ante=l.bb;l.bba=true;}else l.ante=Math.max(minChip(),near(l.bb*.125));});}
  return out;}
function colorUpSet(j){ // номиналы, которые можно убрать начиная с уровня j
  const ch=chipsAsc().map(c=>c.v),amts=[];for(let i=j;i<S.levels.length;i++){const l=S.levels[i];if(l.type==='level')amts.push(l.sb,l.bb,l.ante||0);}
  if(!amts.length)return[];const res=[];
  for(let k=0;k<ch.length-1;k++){const rest=ch.slice(k+1);if(amts.every(a=>canPay(a,rest)))res.push(ch[k]);else break;}
  return res;}
function canPay(a,coins){if(a===0)return true;const g=coins.reduce(gcd);if(a%g)return false;const n=a/g,c=coins.map(x=>x/g);
  if(n>20000)return true;const ok=new Uint8Array(n+1);ok[0]=1;for(let i=1;i<=n;i++)for(const x of c)if(x<=i&&ok[i-x]){ok[i]=1;break;}return!!ok[n];}
function colorUpNew(j){const now=colorUpSet(j);let k=j-2;while(k>=0&&L(k).type!=='break')k--;const before=colorUpSet(k>=0?k+1:0);return now.filter(v=>!before.includes(v));}

/* ===== Chips math ===== */
const chipTotal=()=>chipsAsc().reduce((a,c)=>a+c.v*c.n,0);
function distribute(stack,E){const ch=chipsAsc();if(!ch.length||stack<=0)return{ok:false,ch:[]};
  const u=ch.map(c=>Math.floor(c.n/Math.max(1,E)));
  const capped=ch.map((c,i)=>i<ch.length-1?Math.min(u[i],Math.max(4,Math.ceil(stack*.22/c.v))):u[i]);
  for(const base of [capped,u]){const c=[...base];let ex=c.reduce((a,k,i)=>a+k*ch[i].v,0)-stack;if(ex<0)continue;
    for(let i=ch.length-1;i>=0&&ex>0;i--){const k=Math.min(c[i],Math.floor(ex/ch[i].v));c[i]-=k;ex-=k*ch[i].v;}
    if(ex===0)return{ok:true,ch,c};}
  return{ok:false,ch};}
function suggestStack(E){const ch=chipsAsc();const max=ch.reduce((a,c)=>a+Math.floor(c.n/E)*c.v,0);
  for(const step of [500,100,50,10]){for(let s=Math.floor(max/step)*step;s>=step;s-=step){if(distribute(s,E).ok)return{s,max};}}
  return{s:0,max};}

/* ===== Game math ===== */
const rbU=p=>Math.max(0,(p.rebuys||0)-(p.halfs||0)*.5),fU=n=>String(Math.round(n*10)/10).replace('.',',');
const legacyPaid=p=>S.buyin+p.rebuys*S.rebuyCost+p.addons*S.addonCost,legacyChips=p=>S.startStack+p.rebuys*S.rebuyStack+p.addons*S.addonStack;
const invested=p=>p.paid!=null?p.paid:legacyPaid(p);
const chipsOf=p=>p.chipsIn!=null?p.chipsIn:legacyChips(p);
function totals(){const P=S.players,reb=P.reduce((a,p)=>a+p.rebuys,0),rebU=P.reduce((a,p)=>a+rbU(p),0),add=P.reduce((a,p)=>a+p.addons,0),inP=P.filter(p=>p.status==='in').length;
  const money=P.reduce((a,p)=>a+invested(p),0),entries=P.length+reb;
  const freeH=isT()&&S.bountyOn?P.reduce((a,p)=>a+(p.freeHeads||0),0):0,bountyTot=isT()&&S.bountyOn?Math.max(0,entries-freeH)*S.bounty:0;
  const chips=P.reduce((a,p)=>a+chipsOf(p),0);
  return{n:P.length,reb,rebU,add,inP,money,entries,freeH,bountyTot,pool:money-bountyTot,chips,avg:inP?chips/inP:0};}
function payoutPcts(){if(!S.payoutsAuto)return S.payouts;const n=S.players.length;
  return n<=3?[100]:n<=6?[65,35]:n<=10?[50,30,20]:[45,27,17,11];}
const payouts=pool=>{const pc=payoutPcts(),tot=pc.reduce((a,b)=>a+b,0)||100,a=pc.map(p=>Math.floor(pool*p/tot));if(a.length)a[0]+=pool-a.reduce((x,y)=>x+y,0);return a;};
const rate=()=>{const x=totals();if(x.chips>0)return x.money/x.chips;return S.startStack?S.buyin/S.startStack:0;}; // деньги за 1 фишку (средневзвешенный курс всех взносов)
const rUnits=p=>(p.rebuys||0)-(p.halfs||0)*0.5;
function canRebuy(p,k=1){if(S.maxRebuys&&rUnits(p)+k>S.maxRebuys)return'У '+p.name+' уже '+String(rUnits(p)).replace('.',',')+' из '+S.maxRebuys+' докупов — '+(k<1?'даже на 50% ':'')+'лимит.';
  if(S.rebuyUntil&&curLvl()>S.rebuyUntil)return'Окно докупов закрылось после '+S.rebuyUntil+' уровня.';return'';}

/* ===== Render ===== */
function renderClock(){const t=T(),l=L(t.idx),r=rem();
  const c=$('#clock');const tx=fmtT(r);if(c.textContent.length!==tx.length){c.textContent=tx;requestAnimationFrame(fit);}else c.textContent=tx;c.classList.toggle('warn',r<=60000&&l&&l.type==='level'&&t.running);c.classList.toggle('paused',!t.running&&t.startedAt!=null);
  $('#bar').style.width=(100*(1-Math.max(0,r)/(Lms(t.idx)||1)))+'%';
  const el=t.startedAt==null?0:(t.running?Date.now():(t.pausedAt||Date.now()))-t.startedAt-t.pausedTotal;
  let ms=Math.max(0,r),found=false;if(l&&l.type!=='break'){for(let i=t.idx+1;i<S.levels.length;i++){if(L(i).type==='break'){found=true;break;}ms+=Lms(i);}}
  const brT=l&&l.type==='break'?'сейчас':found?fmtT(ms):'—';for(const id of ['#sElapsed','#tvElapsed']){const e=$(id);if(e)e.textContent=fmtT(el);}for(const id of ['#sBreak','#tvBreak']){const e=$(id);if(e)e.textContent=brT;}
  document.title=(t.running?fmtT(r)+' · ':'')+'Nuts';}

function render(){
  const t=T(),l=L(t.idx),x=totals(),nx=L(t.idx+1);
  $('#modePill').textContent=isT()?'🏆 Турнир':'💵 Кэш';
  $('#tName').textContent=S.name||'';
  const lc=$('#lvlChip');lc.className='lvlchip'+(l&&l.type==='break'?' brk':'');lc.textContent=l?(l.type==='break'?'☕ Перерыв':'Уровень '+lvlNum(t.idx)+' из '+S.levels.filter(z=>z.type==='level').length):'';
  const b=$('#blinds');b.textContent=l&&l.type==='break'?'Перерыв':bstr(l);b.classList.toggle('brk',l&&l.type==='break');
  $('#ante').textContent=l&&l.type==='level'&&l.ante?(l.bba?'Анте большого блайнда '+fmt(l.ante):'Анте '+fmt(l.ante)):'';
  $('#prevV').textContent=bstr(L(t.idx-1));$('#nextV').textContent=nx?bstr(nx)+(nx.type==='level'&&nx.ante?(nx.bba?' · анте BB':' · анте '+fmt(nx.ante)):''):'Последний';
  $('#bPrev').disabled=t.idx<=0;$('#bNext').disabled=t.idx>=S.levels.length-1;
  $('#bPlay').innerHTML=t.running?'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>Пауза':'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>'+(t.startedAt==null?'Старт':'Продолжить');
  $('#bLock').textContent=document.body.classList.contains('locked')?'🔒':'🔓';
  // notes
  const cl=curLvl(),N=[];
  if(S.rebuyUntil){N.push(cl<=S.rebuyUntil?`<span class="note g">Докупы открыты до ${S.rebuyUntil} ур.</span>`:`<span class="note r">Докупы закрыты</span>`);}
  N.push(`<span class="note">${{bust:'Докуп после вылета',short:'Докуп при стеке ≤ стартового',any:'Докуп в любой момент'}[S.rebuyWhen]||''}${S.maxRebuys?' · до '+S.maxRebuys+' раз':''}</span>`);
  if(S.lateRegUntil){N.push(cl<=S.lateRegUntil?`<span class="note g">Регистрация до ${S.lateRegUntil} ур.</span>`:`<span class="note">Регистрация закрыта</span>`);}
  if(l&&l.type==='break'){const cu=colorUpNew(t.idx+1);if(cu.length)N.push(`<span class="note y">Можно убрать фишки ${cu.join(', ')}</span>`);if(S.addonOn)N.push('<span class="note y">Время аддона</span>');}
  if(!nx)N.push('<span class="note y">Последний уровень — дальше добавлю уровни автоматически</span>');
  $('#notes').innerHTML=N.join('');
  // side
  const pa=payouts(x.pool);let h='';
  if(isT()){h+=`<h4>Призовой фонд</h4><div class="big">${money(x.pool)}</div>`;
    h+=pa.map((a,i)=>{const w=S.players.find(p=>p.place===i+1);return`<div class="kv"><span>${i+1} место${w?' · '+esc(w.name):''}</span><b class="money">${money(a)}</b></div>`;}).join('');
    if(S.bountyOn)h+=`<div class="kv"><span>Баунти за голову</span><b>${money(S.bounty)}</b></div>`;
    h+=`<h4>Турнир</h4><div class="kv"><span>Игроков</span><b>${x.inP} / ${x.n}</b></div><div class="kv"><span>Входов</span><b>${x.entries}</b></div>`;
  }else{h+=`<h4>Банк</h4><div class="big">${money(x.money)}</div>`;
    h+=`<div class="kv"><span>Курс</span><b>${fmt(S.buyin)} = ${fmt(S.startStack)} фиш.</b></div>`;
    h+=`<h4>Стол</h4><div class="kv"><span>Игроков</span><b>${x.inP} / ${x.n}</b></div>`;}
  h+=`<div class="kv"><span>Докупов</span><b>${fU(x.rebU)}</b></div>`;if(S.addonOn)h+=`<div class="kv"><span>Аддонов</span><b>${x.add}</b></div>`;
  h+=`<div class="kv"><span>Фишек в игре</span><b>${fmt(x.chips)}</b></div>`;
  const bb=l&&l.type==='level'?l.bb:nx&&nx.bb;
  h+=`<div class="kv"><span>Средний стек</span><b>${x.inP?fmt(x.avg):'—'}</b></div><div class="kv"><span>Средний стек в ББ</span><b>${x.inP&&bb?Math.round(x.avg/bb):'—'}</b></div>`;
  const qs=[...S.players].sort((a,b)=>(a.status===b.status?0:a.status==='in'?-1:1)||((a.place||0)-(b.place||0)));
  const chA=chipsAsc();if(chA.length)h+=`<h4>Фишки</h4><div class="chiprow">${chA.map(c=>chipEl(c)).join('')}</div>`;
  if(S.showCombos)h+=`<h4>Комбинации · от старшей</h4><div class="combos" data-help="1" title="Подробнее — клавиша C">${HANDS.map((x,i)=>`<div><i>${i+1}</i>${x[0]}</div>`).join('')}</div>`;
  h+=`<h4>Игроки · нажмите для действий</h4><div class="qp">${qs.map(p=>`<button class="qchip ${p.status==='out'?'out':''} ${isT()&&p.place===1?'win':''}" data-qp="${p.id}"><span class="d"></span>${esc(p.name)}${p.rebuys?`<sup>+${fU(rbU(p))}</sup>`:''}</button>`).join('')}<button class="qchip add" data-qadd="1">＋ Игрок</button></div>`;
  h+=`<h4>Время</h4><div class="kv"><span>До перерыва</span><b id="sBreak"></b></div><div class="kv"><span>Идёт игра</span><b id="sElapsed"></b></div>`;
  $('#side').innerHTML=h;document.body.classList.toggle('combos-on',!!S.showCombos);$('#tvcombos').innerHTML=HANDS.map((x,i)=>i===0?`<b>${x[0]}</b>`:x[0]).join('<br>');if(popId!=null)hidePop();
  {const pa2=isT()?payouts(x.pool):[],rows=[[isT()?'Призовой фонд':'Банк',money(isT()?x.pool:x.money),'money']];
   if(isT()&&pa2.length)rows.push(['Выплаты',pa2.map((a,i)=>`${i+1}: ${money(a)}`).join('<br>'),'pay']);
   rows.push(['Игроков',x.inP+' / '+x.n],['Средний стек',x.inP?fmt(x.avg):'—'],['В больших блайндах',x.inP&&bb?Math.round(x.avg/bb):'—'],['Докупов',fU(x.rebU)],['До перерыва','<span id="tvBreak">—</span>'],['Идёт игра','<span id="tvElapsed">—</span>']);
   $('#tvstats').innerHTML=rows.map(([l,v,c])=>`<div class="r"><div class="l">${l}</div><div class="v ${c||''}">${v}</div></div>`).join('');}
  $('#tvbar').innerHTML=`<div><div class="blab">${isT()?'Призовой':'Банк'}</div><div class="v money">${money(isT()?x.pool:x.money)}</div></div><div><div class="blab">Игроков</div><div class="v">${x.inP} / ${x.n}</div></div><div><div class="blab">Средний стек</div><div class="v">${x.inP?fmt(x.avg):'—'}</div></div>`;
  renderClock();renderPlayers(x,pa);renderResults(x,pa);renderStructure();renderChips();renderSettingsState();try{renderTpl();}catch(e){}fillVoices();requestAnimationFrame(fit);
}

function renderPlayers(x,pa){
  $('#pStats').innerHTML=[['В игре',x.inP+' / '+x.n],[isT()?'Призовой':'Банк',money(isT()?x.pool:x.money)],['Докупов',fU(x.rebU)],['Фишек в игре',fmt(x.chips)],['Средний стек',x.inP?fmt(x.avg):'—']]
    .map(([l,v])=>`<div class="stat"><div class="l">${l}</div><div class="v">${v}</div></div>`).join('');
  const inGame=new Set(S.players.map(p=>p.name.toLowerCase()));const rs=S.roster.filter(n=>!inGame.has(n.toLowerCase()));
  $('#rosterBox').innerHTML=rs.length?`<div class="hint" style="margin-top:14px">Сохранённые игроки — нажмите, чтобы добавить:</div><div class="roster">${rs.map(n=>`<span class="rchip" data-r="${esc(n)}">＋ ${esc(n)}<span class="x" data-rx="${esc(n)}" title="Забыть">✕</span></span>`).join('')}<span class="rchip" data-rall="1" style="border-style:solid">Добавить всех</span></div>`:'';
  let accs=[];try{accs=roomAccts();}catch(e){}const hasAccts=accs.length>0;
  {const bu=boundUids(),free=accs.filter(a=>!bu.has(a.uid));
   $('#acctBox').innerHTML=free.length?`<div class="hint" style="margin-top:14px">🔗 Аккаунты${remoteOn?' в комнате':''} — нажмите, чтобы добавить в игру с привязкой (вечер попадёт в их кабинет):</div><div class="roster">${free.map(a=>`<span class="rchip acc" data-acc="${esc(a.uid)}">＋ ${esc(a.name)}${a.self?' (вы)':''}</span>`).join('')}</div>`:'';}
  const ord=[...S.players].sort((a,b)=>(a.status===b.status?0:a.status==='in'?-1:1)||((a.place||0)-(b.place||0)));
  $('#pEmpty').style.display=ord.length?'none':'block';
  const byId=id=>S.players.find(p=>p.id===id);
  $('#plist').innerHTML=ord.map(p=>{
    const st=p.place===1&&isT()?'<span class="badge win">🏆 Победитель</span>':p.status==='in'?'<span class="badge in">в игре</span>':`<span class="badge out">${isT()?p.place+' место':'вылет'}</span>`;
    const meta=[`вложил <b class="money">${money(invested(p))}</b>`];if(p.rebuys)meta.push('докупов: '+fU(rbU(p)));if(p.addons)meta.push('аддон +'+fmt(S.addonStack));
    if(isT()&&S.bountyOn&&p.knocks)meta.push('выбил: '+p.knocks);if(p.seat)meta.push('место за столом: '+p.seat);
    if(p.bustedBy&&byId(p.bustedBy))meta.push('выбил(а): '+esc(byId(p.bustedBy).name));
    let a='';
    const winner=isT()&&p.place===1;
    if(p.status==='in'){ if(!winner&&x.inP>1)a+=`<button class="btn sm red" data-a="bust" data-id="${p.id}">💥 Вылет</button>`;
      if(!winner&&S.rebuyWhen!=='bust'){a+=`<button class="btn sm" data-a="rebuy" data-id="${p.id}" title="${S.rebuyWhen==='short'?'Если стек не больше стартового':'Докуп в любой момент'}">＋ Докуп</button>`;}
      if(S.addonOn&&!p.addons&&!winner)a+=`<button class="btn sm" data-a="addon" data-id="${p.id}">＋ Аддон</button>`;}
    else a+=`<button class="btn sm pri" data-a="rebuy" data-id="${p.id}">💸 Докуп и в игру</button><button class="btn sm" data-a="back" data-id="${p.id}" title="Ошибочно выбит — вернуть без докупа">Вернуть</button>`;
    if(p.rebuys&&p.status==='in')a+=`<button class="btn sm ghost" data-a="unrebuy" data-id="${p.id}" title="Отменить докуп">−докуп</button>`;
    if(p.acct||hasAccts)a+=`<button class="btn sm ghost" data-a="acct" data-id="${p.id}" title="${p.acct?'Привязан к аккаунту '+esc(p.acct.name):'Привязать к аккаунту'}">🔗</button>`;
    a+=`<button class="btn sm ghost" data-a="del" data-id="${p.id}" title="Удалить">✕</button>`;
    return`<div class="pl ${p.status}"><div class="av" style="${avStyle(p.name)}">${esc(p.name.slice(0,1).toUpperCase())}</div>
      <div><div class="pname">${esc(p.name)}${p.acct?`<span class="lnk" title="Привязан к аккаунту ${esc(p.acct.name)} — вечер попадёт в его кабинет">🔗</span>`:''} ${st}</div><div class="pmeta">${meta.join('<span>·</span>')}</div></div><div class="pacts">${a}</div></div>`;}).join('');
  $('#undoBtn').disabled=!S.hist.length;
  renderSeats();}

function renderSeats(){const sc=$('#seatCard');const ps=S.players.filter(p=>p.seat).sort((a,b)=>a.seat-b.seat);
  if(!S.seats||!ps.length){sc.style.display='none';return;} sc.style.display='block';
  const n=S.seats.n,ov=$('#tableOv');ov.querySelectorAll('.seat,.dpuck').forEach(e=>e.remove());const pts=ellPts(n);
  for(let i=1;i<=n;i++){const [xx,yy]=pts[i-1];
    const p=S.players.find(q=>q.seat===i);const d=document.createElement('div');d.className='seat '+(yy<50?'up':'dn')+(p&&p.status==='out'?' out':'')+(p?'':' empty');
    d.style.left=xx+'%';d.style.top=yy+'%';d.innerHTML=`<div class="s">${i}</div><div class="nm" title="${p?esc(p.name):''}">${p?esc(p.name):'—'}</div>`;ov.appendChild(d);
    if(S.seats.dealer===i){const k=document.createElement('div');k.className='dpuck';k.textContent='D';k.title='Дилер на первую раздачу';k.style.left=(xx+(50-xx)*.3)+'%';k.style.top=(yy+(50-yy)*.4)+'%';ov.appendChild(k);}}}
/* точки мест: равномерно по периметру овала, место 1 снизу по центру, дальше по часовой */
function ellPts(n,rx=44,ry=41){const A=2,N=720,P=[];let L=0,prev=null;const cum=[];
  for(let j=0;j<=N;j++){const t=Math.PI/2+j/N*2*Math.PI,x=50+rx*Math.cos(t),y=50+ry*Math.sin(t);if(prev)L+=Math.hypot((x-prev[0])*A,y-prev[1]);cum.push([L,x,y]);prev=[x,y];}
  let j=0;for(let i=0;i<n;i++){const tg=L*i/n;while(j<N&&cum[j][0]<tg)j++;P.push([cum[j][1],cum[j][2]]);}return P;}
/* позиции по числу игроков, начиная с баттона и дальше по часовой */
function posNames(n){const M={2:[],3:[],4:['UTG'],5:['UTG','CO'],6:['UTG','HJ','CO'],7:['UTG','LJ','HJ','CO'],8:['UTG','UTG+1','LJ','HJ','CO'],9:['UTG','UTG+1','UTG+2','LJ','HJ','CO'],10:['UTG','UTG+1','UTG+2','MP','LJ','HJ','CO']};if(n<=2)return['BTN·SB','BB'];return['BTN','SB','BB'].concat(M[Math.min(n,10)]);}
const posGrp=n=>/SB|BB/.test(n)?'bl':/^UTG/.test(n)?'ea':/MP|LJ|HJ/.test(n)?'mi':'la';
let helpPN=6;

function nets(x,pa){ // [{p,inv,win,bnt,net,chips}]
  if(isT()){return S.players.map(p=>{const prize=p.place&&p.place<=pa.length?pa[p.place-1]:0;
      const bnt=S.bountyOn?((p.knocks||0)+(p.place===1?1:0))*S.bounty:0;return{p,inv:invested(p),win:prize,bnt,net:prize+bnt-invested(p)};});}
  const r=rate();return S.players.map(p=>{const ch=p.status==='out'?0:(p.finalChips??null);const val=ch==null?0:Math.round(ch*r);return{p,inv:invested(p),chips:ch,win:val,net:ch==null?null:val-invested(p)};});}
function transfers(list){const cr=[],db=[];list.forEach(o=>{if(o.net>0.5)cr.push({n:o.p.name,v:o.net});else if(o.net<-0.5)db.push({n:o.p.name,v:-o.net});});
  cr.sort((a,b)=>b.v-a.v);db.sort((a,b)=>b.v-a.v);const res=[];let i=0,j=0;
  while(i<db.length&&j<cr.length){const a=Math.min(db[i].v,cr[j].v);res.push([db[i].n,cr[j].n,a]);db[i].v-=a;cr[j].v-=a;if(db[i].v<0.5)i++;if(cr[j].v<0.5)j++;}return res;}

function renderResults(x,pa){const box=$('#resBox');if(document.activeElement&&document.activeElement.classList.contains('chipin'))return;
  if(!S.players.length){box.innerHTML='<div class="card muted">Добавьте игроков — здесь появятся итоги и расчёт, кто кому переводит.</div>'+logCard()+archiveHTML();return;}
  const R=nets(x,pa);let h=`<div class="row" style="justify-content:flex-end;margin-bottom:12px"><button class="btn pri" data-final="1">🏁 Итоги вечера</button></div><div class="card" style="padding-top:4px">${howHTML(x,pa)}</div>`;
  if(isT()){const done=x.inP<=1;
    h+=`<div class="stats"><div class="stat"><div class="l">Призовой фонд</div><div class="v money">${money(x.pool)}</div></div><div class="stat"><div class="l">Входов</div><div class="v">${x.entries}</div></div>${S.bountyOn?`<div class="stat"><div class="l">Баунти всего</div><div class="v">${money(x.bountyTot)}</div></div>`:''}<div class="stat"><div class="l">Статус</div><div class="v" style="font-size:18px">${done?'✅ Завершён':'⏳ Идёт'}</div></div></div>`;
    if(!done)h+=`<div class="card small muted">Турнир ещё идёт — итоги предварительные. Места появятся по мере вылетов.</div>`;
    const ord=[...R].sort((a,b)=>(a.p.place||99)-(b.p.place||99));
    h+=`<div class="card"><div class="tscroll"><table><thead><tr><th>Место</th><th>Игрок</th><th class="r">Вложил</th><th class="r">Приз</th>${S.bountyOn?'<th class="r">Баунти</th>':''}<th class="r">Итог</th></tr></thead><tbody>`+
      ord.map(o=>`<tr><td>${o.p.place||'—'}</td><td>${esc(o.p.name)}</td><td class="r">${money(o.inv)}</td><td class="r money">${o.win?money(o.win):''}</td>${S.bountyOn?`<td class="r">${o.bnt?money(o.bnt):''}</td>`:''}<td class="r ${o.net>0?'pos':o.net<0?'neg':''}">${sgn(o.net)}</td></tr>`).join('')+`</tbody></table></div></div>`;
  }else{const r=rate();const sumCh=R.reduce((a,o)=>a+(o.chips||0),0);const missing=R.filter(o=>o.chips==null).length;const diff=sumCh-x.chips;
    h+=`<div class="stats"><div class="stat"><div class="l">Банк</div><div class="v money">${money(x.money)}</div></div><div class="stat"><div class="l">Выдано фишек</div><div class="v">${fmt(x.chips)}</div></div><div class="stat"><div class="l">Посчитано фишек</div><div class="v ${missing?'':diff===0?'pos':'neg'}">${fmt(sumCh)}</div></div><div class="stat"><div class="l">Курс</div><div class="v" style="font-size:17px">1 фишка = ${(+r.toFixed(3)).toLocaleString('ru-RU')} ${esc(S.currency)}</div></div></div>`;
    h+=`<div class="card"><h3>Сколько фишек у каждого в конце</h3><div class="hint" style="margin:-6px 0 10px">У вылетевших — 0. Введите стеки тех, кто доиграл.</div><div class="tscroll"><table><thead><tr><th>Игрок</th><th class="r">Вложил</th><th class="r">Фишки</th><th class="r">В деньгах</th><th class="r">Итог</th></tr></thead><tbody>`+
      R.map(o=>`<tr><td>${esc(o.p.name)}</td><td class="r">${money(o.inv)}</td><td class="r">${o.p.status==='out'?'0':`<input class="chipin num" type="number" min="0" data-fc="${o.p.id}" value="${o.chips??''}" placeholder="фишки">`}</td><td class="r money">${o.chips!=null?money(o.win):''}</td><td class="r ${o.net>0?'pos':o.net<0?'neg':''}">${o.net==null?'':sgn(o.net)}</td></tr>`).join('')+`</tbody></table></div>`;
    if(!missing&&diff!==0)h+=`<div class="hint" style="color:var(--red)">Фишек ${diff>0?'больше':'меньше'}, чем выдано, на ${fmt(Math.abs(diff))}. Пересчитайте — иначе расчёт не сойдётся.</div>`;
    h+=`</div>`;
    if(missing){box.innerHTML=h+`<div class="card small muted">Расчёт переводов появится, когда будут введены фишки всех, кто остался в игре (осталось: ${missing}).</div>`+logCard()+archiveHTML();return;}}
  if(!isT()){const sumCh=R.reduce((a,o)=>a+(o.chips||0),0);if(sumCh!==x.chips){box.innerHTML=h+'<div class="card small muted">Кто кому переводит — появится, когда сумма фишек совпадёт с выданной.</div>'+logCard()+archiveHTML();return;}}
  if(isT()&&x.inP>1&&S.players.length>1){box.innerHTML=h+'<div class="card small muted">Кто кому переводит — появится, когда определится победитель.</div>'+logCard()+archiveHTML();return;}
  const tr=transfers(R.filter(o=>o.net!=null));
  h+=`<div class="card"><h3>💸 Кто кому переводит</h3>${tr.length?tr.map(([a,b,v])=>`${xferHTML(a,b,v)}`).join(''):'<div class="muted">Все при своих.</div>'}
    <div class="row" style="margin-top:12px"><button class="btn pri" id="copyRes">📋 Скопировать итоги для чата</button></div></div>`;
  box.innerHTML=h+logCard()+archiveHTML();}
function logHTML(log,full){if(!log||!log.length)return'';
  const rows=log.map(e=>`<div class="ev ${e.type}${e.undone?' undone':''}"><span class="et">${fmtHM(e.el)}</span><span class="el">${e.lvl==='☕'?'☕':e.lvl?'ур. '+e.lvl:''}</span><span class="ei">${LOGI[e.type]||'•'}</span><span class="ex">${esc(e.text)}</span><span class="ew">${new Date(e.at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span></div>`).reverse().join('');
  return`<div class="timeline">${rows}</div>`;}
function fmtHM(ms){const m=Math.floor(Math.max(0,ms)/60000);return Math.floor(m/60)+':'+pad(m%60);}
function logCard(){if(!S.log.length)return'';const bust=S.log.filter(e=>e.type==='bust'&&!e.undone).length,reb=S.log.filter(e=>e.type==='rebuy'&&!e.undone).length;
  return`<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h3 style="margin:0">🕓 Хронология вечера</h3><label class="chk small muted"><input type="checkbox" id="logTimer" ${S.logShowTimer?'checked':''}> таймер и уровни</label></div>
    <div class="hint" style="margin:-4px 0 12px">По таймеру ${fmtHM(clockElapsed())} · вылетов: ${bust} · докупов: ${reb} · свежие события сверху</div><div class="${S.logShowTimer?'':'hidetimer'}">${logHTML(S.log)}</div></div>`;}
function archiveHTML(){if(!S.archive.length)return'';return`<div class="card"><h3>📚 Прошлые вечера</h3>${S.archive.map((a,i)=>`<details class="arch"><summary><b>${new Date(a.at).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</b> <span class="muted">· ${a.mode==='tournament'?'турнир':'кэш'}</span></summary><pre>${esc(a.text)}</pre>${a.log&&a.log.length?`<details style="margin-top:8px"><summary class="small muted" style="cursor:pointer">🕓 Хронология (${a.log.length} событий)</summary>${logHTML(a.log)}</details>`:''}<div class="row" style="margin-top:8px"><button class="btn sm" data-acopy="${i}">📋 Копировать</button><button class="btn sm" data-adl="${i}">⬇️ Скачать отчёт</button><button class="btn sm ghost red" data-adel="${i}">Удалить</button></div></details>`).join('')}</div>`;}

const hhmm=t=>new Date(t).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
function resultsText(){const x=totals(),pa=payouts(x.pool),R=nets(x,pa);const d=new Date().toLocaleDateString('ru-RU');
  const st0=S.log.find(e=>e.type==='start');const tline=st0?`Начало ${hhmm(st0.at)} · конец ${hhmm(Date.now())} · по таймеру ${fmtHM(clockElapsed())}\n`:'';
  let s=`♠ ${S.name} — ${d}\n`+tline+`${isT()?'Турнир':'Кэш'} · игроков: ${x.n} · докупов: ${fU(x.rebU)} · ${isT()?'призовой':'банк'}: ${money(isT()?x.pool:x.money)}\n\n`;
  if(isT()){const done=x.inP<=1;if(!done)s+=`Турнир не завершён: в игре ${x.inP} из ${x.n}\n\n`;
    const ord=[...R].sort((a,b)=>(a.p.place||0)-(b.p.place||0));
    ord.filter(o=>o.p.status==='in'&&!(o.p.place===1)).forEach(o=>{s+=`• ${o.p.name} — в игре (вложил ${money(o.inv)})\n`;});
    ord.filter(o=>o.p.place&&(o.p.status==='out'||o.p.place===1)).forEach(o=>{s+=`${o.p.place}. ${o.p.name}: ${sgn(o.net)}${o.win?' (приз '+money(o.win)+')':''}${o.bnt?' (баунти '+money(o.bnt)+')':''}\n`;});
    if(!done)return s;}
  else{const ready=R.every(o=>o.net!=null),sumCh=R.reduce((a,o)=>a+(o.chips||0),0);
    if(!ready||sumCh!==x.chips){s+=`Фишки в конце ${ready?'не сходятся с выданными':'посчитаны не у всех'} — итог не подведён\n\n`;R.forEach(o=>{s+=`• ${o.p.name} — вложил ${money(o.inv)}${o.chips!=null?', фишек '+fmt(o.chips):''}\n`;});return s;}
    [...R].sort((a,b)=>b.net-a.net).forEach((o,i)=>{s+=`${i+1}. ${o.p.name}: ${sgn(o.net)}\n`;});}
  const tr=transfers(R.filter(o=>o.net!=null));if(tr.length){s+='\nПереводы:\n';tr.forEach(([a,b,v])=>s+=`${a} → ${b}: ${money(v)}\n`);}return s;}

function renderStructure(){if(editing('#slist'))return;
  const cur=T().idx;$$('[data-g]').forEach(e=>{if(document.activeElement!==e)e.value=S.gen[e.dataset.g];});{const a=$('#gAnte'),f=$('#gAnteFrom');if(a&&document.activeElement!==a)a.value=S.gen.ante||'none';if(f&&document.activeElement!==f){f.value=S.gen.anteFrom||4;f.disabled=(S.gen.ante||'none')==='none';}}$$('[data-pace]').forEach(b=>b.classList.toggle('pri',b.dataset.pace===S.gen.pace));
  const g=S.gen,E=g.players+g.rebuys;$('#genHint').textContent=`Стартовый стек ${fmt(S.startStack)} (меняется в настройках). Фишек в игре при ${g.players} игроках и ${g.rebuys} докупах: ~${fmt(S.startStack*g.players+S.rebuyStack*g.rebuys)}. Блайнды кратны самой мелкой фишке (${minChip()}), чтобы их можно было поставить.`;
  const mins=[...new Set(S.levels.filter(l=>l.type==='level').map(l=>l.min))];$('#genHint').textContent+=' Сейчас: '+S.levels.filter(l=>l.type==='level').length+' уровней'+(mins.length>1?', длина '+mins.join('→')+' мин':', по '+mins[0]+' мин')+'.';
  $('#slist').innerHTML=S.levels.map((l,i)=>{const cls=(l.type==='break'?'brk ':'')+(i===cur?'cur':'');
    const cu=l.type==='break'?colorUpNew(i+1):[];
    const act=`<div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm ghost" data-sa="go" data-i="${i}" title="Перейти">▶</button><button class="btn sm ghost" data-sa="up" data-i="${i}">↑</button><button class="btn sm ghost" data-sa="dn" data-i="${i}">↓</button><button class="btn sm ghost" data-sa="del" data-i="${i}">✕</button></div>`;
    if(l.type==='break')return`<tr class="${cls}"><td>☕</td><td colspan="3"><span class="muted">Перерыв</span> ${cu.length?`<span class="cu">· убрать фишки ${cu.join(', ')}</span>`:''}</td><td><input type="number" min="1" data-f="min" data-i="${i}" value="${l.min}"></td><td>${act}</td></tr>`;
    return`<tr class="${cls}"><td><b>${lvlNum(i)}</b></td><td><input type="number" min="0" data-f="sb" data-i="${i}" value="${l.sb}"></td><td><input type="number" min="0" data-f="bb" data-i="${i}" value="${l.bb}"></td><td><input type="number" min="0" data-f="ante" data-i="${i}" value="${l.ante||0}"></td><td><input type="number" min="1" data-f="min" data-i="${i}" value="${l.min}"></td><td>${act}</td></tr>`;}).join('');}

function chipEl(c,txt){const d=c.d||'#fff';return`<div class="chip" style="background:${c.c};color:${d};border-color:${d}">${txt??fmt(c.v)}</div>`;}
function renderSets(){if(editing('#setsBox'))return;
  const agg=chipsAsc();
  $('#setsBox').innerHTML=S.sets.map((st,si)=>{const sum=st.chips.reduce((a,c)=>a+c.v*c.n,0);
    return`<div class="card setcard" style="${st.on?'':'opacity:.55'}"><div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div class="row"><span style="font-size:20px">🎰</span><input class="sname" data-sn="${si}" value="${esc(st.name)}"><label class="chk small"><input type="checkbox" data-son="${si}" ${st.on?'checked':''}> в игре</label></div>
      ${si>0?`<button class="btn sm red" data-sdel="${si}">Убрать набор</button>`:''}</div>
      <div class="tscroll"><table><thead><tr><th></th><th>Номинал</th><th>Штук</th><th>Цвет</th><th>Детали</th><th class="r">Сумма</th><th></th></tr></thead><tbody>
      ${st.chips.map((c,i)=>`<tr><td>${chipEl(c)}</td><td><input type="number" min="1" data-si="${si}" data-c="v" data-i="${i}" value="${c.v}" style="max-width:100px"></td><td><input type="number" min="0" data-si="${si}" data-c="n" data-i="${i}" value="${c.n}" style="max-width:100px"></td><td><input type="color" data-si="${si}" data-c="c" data-i="${i}" value="${c.c}"></td><td><input type="color" data-si="${si}" data-c="d" data-i="${i}" value="${c.d||'#ffffff'}"></td><td class="r">${fmt(c.v*c.n)}</td><td><button class="btn sm ghost" data-si="${si}" data-cdel="${i}">✕</button></td></tr>`).join('')}
      </tbody></table></div><div class="row" style="margin-top:12px;justify-content:space-between"><button class="btn sm" data-addchip="${si}">+ Номинал</button><div>В наборе: <b class="num">${fmt(sum)}</b></div></div></div>`;}).join('')+
    `<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Всего в игре: <span class="money num">${fmt(chipTotal())}</span></h3><button class="btn" id="addSet">＋ Добавить набор</button></div>
    ${S.sets.filter(x=>x.on).length>1?`<div class="agg" style="margin-top:14px">${agg.map(c=>`<div class="col">${chipEl(c)}× ${c.n}</div>`).join('')}</div>`:'<div class="hint">Коллега принёс свои фишки? Добавьте его набор — калькулятор стека и генератор блайндов учтут всё вместе. Отключите галочку «в игре», если набор сегодня не нужен.</div>'}</div>`;}
function renderChips(){
  const r=rate();$('#rateBig').textContent=`${fmt(S.buyin)} ${S.currency} = ${fmt(S.startStack)} фишек`;
  renderSets();
  const cp=$('#calcP'),cr=$('#calcR');if(document.activeElement!==cp)cp.value=S.calc.players;if(document.activeElement!==cr)cr.value=S.calc.reserve;
  const E=S.calc.players+S.calc.reserve,sg=suggestStack(E);
  $('#calcOut').innerHTML=sg.s?`<div class="row" style="justify-content:space-between"><div><div class="muted small">Рекомендуемый стартовый стек на ${E} стеков (${S.calc.players} игроков + ${S.calc.reserve} в запас)</div><div class="big" style="color:var(--acc)">${fmt(sg.s)}</div><div class="hint">Максимум, который набор выдержит ровно: ~${fmt(sg.max)}. Курс сохранится: бай-ин ${fmt(S.buyin)} ${esc(S.currency)}.</div></div><button class="btn pri" id="applyStack" data-st="${sg.s}">Сделать стартовым</button></div>`:'<div class="muted">Набора не хватает на столько стеков — уменьшите запас.</div>';
  const d=distribute(S.startStack,E);
  if(!d.ok){$('#distOut').innerHTML=`<div class="muted">Стек ${fmt(S.startStack)} не собирается ровно из набора на ${E} стеков. Попробуйте рекомендуемый выше.</div>`;return;}
  const can=Math.min(...d.ch.map((c,i)=>d.c[i]?Math.floor(c.n/d.c[i]):Infinity));
  $('#distOut').innerHTML=`<div class="stackvis">${d.ch.map((c,i)=>d.c[i]?`<div class="col">${chipEl(c)}<div style="margin-top:6px">× ${d.c[i]}</div><div class="muted small">${fmt(c.v*d.c[i])}</div></div>`:'').join('')}</div>
    <div class="hint" style="margin-top:12px">Стек ${fmt(S.startStack)} · набора хватит на <b>${can}</b> таких стеков. Докупы выдаются такими же стеками${S.rebuyStack!==S.startStack?' (докуп сейчас '+fmt(S.rebuyStack)+')':''}.</div>`;}

function renderSettingsState(){$$('[data-mode]').forEach(b=>b.classList.toggle('pri',b.dataset.mode===S.mode));
  $('#modeHint').textContent=isT()?'Турнир: банк делится между призовыми местами, места фиксируются по вылетам.':'Кэш: блайнды растут, докупы по правилам. В конце вводите фишки — приложение посчитает деньги по курсу и переводы.';
  $$('.trn-only').forEach(e=>e.style.display=isT()?'':'none');
  $('#addonFields').style.display=S.addonOn?'':'none';$('#bountyFields').style.display=isT()&&S.bountyOn?'':'none';
  const pi=$('#payIn');pi.disabled=S.payoutsAuto;if(document.activeElement!==pi)pi.value=payoutPcts().join(', ');}
function loadSettings(){$$('[data-s]').forEach(e=>{if(!(e.dataset.s in S))return;if(e.type==='checkbox')e.checked=!!S[e.dataset.s];else e.value=S[e.dataset.s];});}

/* ===== Quick actions from timer ===== */
const canHover=(()=>{try{return matchMedia('(hover:hover) and (pointer:fine)').matches;}catch(e){return true;}})();
function pActions(p){const x=totals(),winner=isT()&&p.place===1,B=[];
  if(p.status==='in'){if(!winner&&x.inP>1)B.push(['bust','💥 Вылет','red']);if(!winner&&S.rebuyWhen!=='bust'){B.push(['rebuy','＋ Докуп','']);}if(S.addonOn&&!p.addons&&!winner)B.push(['addon','＋ Аддон','']);}
  else{B.push(['rebuy','💸 Докуп и в игру','pri']);B.push(['back','↩ Вернуть без докупа','']);}
  return B;}
const pStatus=p=>isT()&&p.place===1?'🏆 победитель':p.status==='in'?'в игре':(isT()?p.place+' место':'вылет');
let popId=null,popT=null;
function showPop(chip,p){clearTimeout(popT);const pop=$('#qpop'),B=pActions(p);popId=p.id;
  pop.innerHTML=`<div class="t">${esc(p.name)}<span>${pStatus(p)}</span></div><div class="acts">${B.length?B.map(([a,t,c])=>`<button class="btn sm ${c}" data-pa="${a}">${t}</button>`).join(''):'<div class="none">Действий нет</div>'}${canHover?'':'<button class="btn sm ghost" data-pinfo="1">ℹ Подробнее</button>'}</div>`;
  pop.classList.add('on');const r=chip.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight;
  let x=Math.min(Math.max(8,r.left),innerWidth-w-8),y=r.bottom+6;if(y+h>innerHeight-8)y=Math.max(8,r.top-h-6);
  pop.style.left=x+'px';pop.style.top=y+'px';}
function hidePop(){clearTimeout(popT);$('#qpop').classList.remove('on');popId=null;}
const hideSoon=()=>{clearTimeout(popT);popT=setTimeout(hidePop,220);};
function quickInfo(p){hidePop();const ev=S.log.filter(e=>!e.undone&&e.text.includes(p.name));
  const by=p.bustedBy&&S.players.find(q=>q.id===p.bustedBy);
  const cells=[['Статус',pStatus(p)],['Вложил',money(invested(p))],['Получил фишек',fmt(chipsOf(p))],['Докупов',fU(rbU(p))]];
  if(p.addons)cells.push(['Аддон','да']);if(p.seat)cells.push(['Место за столом',p.seat]);if(isT()&&S.bountyOn)cells.push(['Выбил игроков',p.knocks||0]);if(by)cells.push(['Выбил(а) его',esc(by.name)]);
  modal(`<h3>${esc(p.name)}</h3><div class="pinfo">${cells.map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>${ev.length?`<div class="small muted" style="margin-bottom:4px">Хронология игрока</div>${logHTML(ev)}`:''}`,[{t:'Закрыть',cls:'pri'}]);}
$('#side').addEventListener('mouseover',e=>{const q=e.target.closest('[data-qp]');if(!q||!canHover)return;const p=S.players.find(x=>x.id==q.dataset.qp);if(p&&popId!==p.id)showPop(q,p);else clearTimeout(popT);});
$('#side').addEventListener('mouseout',e=>{if(e.target.closest('[data-qp]'))hideSoon();});
$('#qpop').addEventListener('mouseenter',()=>clearTimeout(popT));$('#qpop').addEventListener('mouseleave',hideSoon);
$('#qpop').addEventListener('click',e=>{const p=S.players.find(x=>x.id===popId);if(!p)return hidePop();const b=e.target.closest('[data-pa]');
  if(b){hidePop();playerAct(p,b.dataset.pa);return;}if(e.target.closest('[data-pinfo]'))quickInfo(p);});
document.addEventListener('pointerdown',e=>{if($('#qpop').classList.contains('on')&&!e.target.closest('#qpop')&&!e.target.closest('[data-qp]'))hidePop();});
function quickAdd(){const have=new Set(S.players.map(p=>p.name.toLowerCase()));const rs=S.roster.filter(n=>!have.has(n.toLowerCase()));
  modal(`<h3>Добавить игроков</h3>${rs.length?`<p style="margin-bottom:8px">Сохранённые — нажмите, чтобы отметить:</p><div class="qp" id="qRoster">${rs.map(n=>`<button class="qchip" data-rn="${esc(n)}"><span class="d" style="background:var(--dim)"></span>${esc(n)}</button>`).join('')}<button class="qchip add" data-rall="1">Все</button></div><p style="margin:14px 0 8px">Или новое имя (несколько — через запятую):</p>`:'<p>Имя или несколько через запятую.</p>'}<input id="qName" autocomplete="off" placeholder="Новое имя">`,
  [{t:'Отмена'},{t:'Добавить',cls:'pri',fn:()=>{const sel=[...document.querySelectorAll('#qRoster .qchip.sel')].map(b=>b.dataset.rn);
    const typed=$('#qName').value.split(',').map(v=>v.trim()).filter(Boolean);const seen=new Set(have),ns=[];
    [...sel,...typed].forEach(n=>{if(!seen.has(n.toLowerCase())){seen.add(n.toLowerCase());ns.push(n);}});
    if(ns.length)setTimeout(()=>addPlayers(ns),0);}}]);
  const box=$('#qRoster');if(box){box.addEventListener('click',e=>{const b=e.target.closest('.qchip');if(!b)return;
    if(b.dataset.rall){const all=[...box.querySelectorAll('[data-rn]')],on=!all.every(x=>x.classList.contains('sel'));all.forEach(x=>{x.classList.toggle('sel',on);x.querySelector('.d').style.background=on?'var(--acc)':'var(--dim)';});return;}
    b.classList.toggle('sel');b.querySelector('.d').style.background=b.classList.contains('sel')?'var(--acc)':'var(--dim)';});}}
$('#side').addEventListener('click',e=>{if(e.target.closest('[data-help]'))return openHelp();const q=e.target.closest('[data-qp]');if(q){const p=S.players.find(x=>x.id==q.dataset.qp);if(!p)return;if(canHover)quickInfo(p);else if(popId===p.id)hidePop();else showPop(q,p);return;}if(e.target.closest('[data-qadd]'))quickAdd();});

/* ===== Help / hand rankings ===== */
const card=(c,k)=>{const suit=c.slice(-1),red=suit==='♥'||suit==='♦';return`<span class="pc${red?' r':''}${k?' k':''}">${c.slice(0,-1)}<br>${suit}</span>`;};
const HANDS=window.NUTS_HANDS;
const HELP={guide:['Что умеет Nuts',()=>`<div class="hsec">
  <p>Nuts — таймер и учёт домашней игры в покер. Работает в браузере на ноутбуке, телефоне и ТВ, в том числе без интернета. Все данные хранятся только у вас.</p>
  <h4>⏱ Таймер</h4><ul><li><b>Старт/пауза</b> — большая кнопка или пробел. Уровни меняются сами, со звуком и голосом; за минуту до конца — предупреждение.</li><li><b>⏮ ⏭</b> — соседний уровень, <b>±1м</b> — подвинуть время, <b>⟲</b> — перезапуск уровня, таймер с начала или завершение вечера.</li><li><b>📺 ТВ</b> — крупный режим для телевизора, <b>🔒</b> — блокировка кнопок от случайных нажатий.</li><li>Когда структура кончилась, уровни добавляются автоматически.</li></ul>
  <h4>👥 Игроки</h4><ul><li>Добавляйте по имени или из сохранённых. На экране таймера — <b>наведите на игрока</b> для быстрых действий, <b>кликните</b> для подробностей.</li><li><b>Вылет</b>, <b>докуп</b> (в т.ч. на 50%), <b>аддон</b>, <b>вернуть</b> при ошибке, <b>отменить</b> последнее действие (Ctrl+Z).</li><li><b>🎲 Рассадка</b> — случайные места и дилер.</li></ul>
  <h4>🏆 Итоги</h4><ul><li><b>Кэш</b>: введите фишки в конце — Nuts посчитает деньги по курсу и <b>кто кому переводит</b>.</li><li><b>Турнир</b>: места по вылетам, выплаты призовым, баунти.</li><li><b>Хронология</b> вечера, <b>история</b> прошлых игр, отчёт в чат одной кнопкой.</li></ul>
  <h4>📈 Блайнды и 🪙 фишки</h4><ul><li>Генератор структуры под длительность игры и темп — от гипертурбо до слоуролла.</li><li>Ваши наборы фишек, калькулятор стартового стека, подсказки, когда убирать мелочь.</li></ul>
  <h4>⚙️ Настройки</h4><ul><li>Формат, взносы и курс, правила докупа, поздняя регистрация, выплаты, голос, хранение в файл.</li></ul>
  <h4>⌨️ Клавиши</h4><p>Пробел — старт/пауза · ←/→ — уровни · R — сброс · T — ТВ · F — полный экран · L — блокировка · C — комбинации · ? — эта справка · Ctrl+Z — отмена</p>
  <p class="small">Nuts · by <a href="https://github.com/MichaelKae" target="_blank" rel="noopener" style="color:var(--acc)">MichaelKae</a></p></div>`],
  hands:['Комбинации',()=>HANDS.map((h,i)=>{const cs=h[3].split(' ');return`<div class="hand"><div class="rk">${i+1}</div><div><div class="nm">${h[0]}<small>${h[1]}</small></div><div class="ds">${h[2]}</div></div><div class="cards">${cs.map((c,j)=>card(c,j>=h[4])).join('')}</div></div>`;}).join('')+
    `<div class="hsec"><h4>Важно помнить</h4><ul><li>В холдеме у каждого <b>2 своих карты + 5 общих</b>. Комбинация — <b>лучшие 5 из 7</b>, можно даже все 5 со стола.</li><li><b>Масти равны</b> — пиковый флеш не сильнее червового.</li><li>При равных комбинациях решает <b>кикер</b> — старшая из оставшихся карт (на картах выше они тусклые).</li><li>Если всё совпало до пятой карты — банк <b>делится поровну</b>.</li></ul></div>`],
  deal:['Ход раздачи',()=>`<div class="hsec">
    <h4>1. Блайнды</h4><p>Слева от <b>дилера (баттона)</b> малый блайнд, дальше большой — ставят обязательные ставки до раздачи.</p>
    <h4>2. Префлоп</h4><p>Каждому по 2 карты. Торговлю начинает игрок <b>слева от большого блайнда</b>, большой блайнд говорит последним.</p>
    <h4>3. Флоп</h4><p>На стол — <b>3 общие карты</b>. Торговлю начинает первый оставшийся игрок слева от баттона.</p>
    <h4>4. Тёрн</h4><p>Четвёртая общая карта, ещё круг торговли.</p>
    <h4>5. Ривер</h4><p>Пятая карта, последний круг торговли.</p>
    <h4>6. Вскрытие</h4><p>Первым показывает тот, кто последним ставил или рейзил. Лучшая комбинация забирает банк. После раздачи баттон сдвигается на одного игрока по часовой стрелке.</p></div>`],
  pos:['Позиции',()=>{const n=helpPN,nm=posNames(n),pts=ellPts(n,42,38);
    const seats=nm.map((x,i)=>{const [xx,yy]=pts[i];return`<div class="pseat ${posGrp(x)}" style="left:${xx}%;top:${yy}%">${x}</div>`;}).join('');
    return`<div class="hsec"><div class="pnsel">Игроков за столом: ${[2,3,4,5,6,7,8,9,10].map(k=>`<button class="btn sm ${k===n?'pri':''}" data-pn="${k}">${k}</button>`).join('')}</div>
    <div class="table-ov pos"><div class="felt"></div>${seats}<div class="dpuck" style="left:${pts[0][0]+(50-pts[0][0])*.22}%;top:${pts[0][1]+(50-pts[0][1])*.32}%">D</div></div>
    <ul class="plegend"><li><span class="pseat bl">SB BB</span> <b>Блайнды</b> — ставят вслепую до раздачи. На префлопе BB ходит последним, дальше блайнды ходят первыми — самые неудобные места.</li>
    <li><span class="pseat ea">UTG</span> <b>Ранние</b> — «под прицелом» (under the gun): первыми ходят на префлопе, за спиной вся раздача. Играют только сильные руки.</li>
    <li><span class="pseat mi">LJ HJ</span> <b>Средние</b> — лоджек и хайджек. Можно чуть шире.</li>
    <li><span class="pseat la">CO BTN</span> <b>Поздние</b> — катофф и баттон. Баттон после флопа ходит последним во всех кругах — лучшее место за столом.</li></ul>
    <p class="small muted">Позиции идут по часовой от баттона (D). В хедз-апе баттон ставит малый блайнд и на префлопе ходит первым. После раздачи баттон сдвигается на одного игрока влево.</p></div>`;}],
  acts:['Действия',()=>`<div class="hsec"><ul>
    <li><b>Чек</b> — пропустить ход, если ставок ещё не было.</li>
    <li><b>Бет</b> — первая ставка в круге торговли.</li>
    <li><b>Колл</b> — уравнять текущую ставку.</li>
    <li><b>Рейз</b> — повысить. Минимальный рейз — <b>на размер предыдущей ставки или повышения</b>: ставка 100 → рейз минимум до 200.</li>
    <li><b>Фолд</b> — сбросить карты и выйти из раздачи.</li>
    <li><b>Олл-ин</b> — поставить все фишки. Если у соперника больше — он уравнивает только твою сумму, остальное идёт в побочный банк.</li></ul>
    <h4>Полезное</h4><ul><li>Ставку объявляют <b>голосом</b> или кладут фишки одним движением — «доносить» фишки нельзя.</li><li>Карты не показывают до вскрытия и не обсуждают, пока раздача идёт.</li><li>Сначала ставки, потом следующая карта — никто не ходит вне очереди.</li></ul></div>`]};
let helpTab='hands';
function renderHelp(){$('#htabs').innerHTML=Object.entries(HELP).map(([k,v])=>`<button class="btn sm ${k===helpTab?'pri':''}" data-ht="${k}">${v[0]}</button>`).join('');$('#hbody').innerHTML=HELP[helpTab][1]();}
function openHelp(tab){if(typeof tab==='string')helpTab=tab;renderHelp();$('#help').classList.add('on');}
const closeHelp=()=>$('#help').classList.remove('on');
$('#helpFab').onclick=()=>openHelp('hands');$('#guideFab').onclick=()=>openHelp('guide');$('#helpClose').onclick=closeHelp;
$('#help').addEventListener('click',e=>{if(e.target.id==='help')return closeHelp();const t=e.target.closest('[data-ht]');if(t){helpTab=t.dataset.ht;renderHelp();}const pn=e.target.closest('[data-pn]');if(pn){helpPN=+pn.dataset.pn;renderHelp();}});

/* ===== Accounts ↔ players ===== */
function roomAccts(){const out=[],seen=new Set();
  try{const W=NET&&NET.who();if(W&&W.google){out.push({uid:NET.uid,name:String(W.name||(W.email||'').split('@')[0]||'Я').slice(0,30),self:true});seen.add(NET.uid);}}catch(e){}
  try{if(remoteOn)[admins,members].forEach(m=>Object.entries(m||{}).forEach(([u,v])=>{if(v&&v.g&&!seen.has(u)){seen.add(u);out.push({uid:u,name:String(v.name||'Гость').slice(0,30)});}}));}catch(e){}
  return out;}
const boundUids=()=>new Set(S.players.filter(p=>p.acct).map(p=>p.acct.uid));
function setAcct(p,a){S.players.forEach(q=>{if(q!==p&&q.acct&&q.acct.uid===a.uid)delete q.acct;});p.acct={uid:a.uid,name:a.name};
  S.rosterAcct=S.rosterAcct||{};Object.keys(S.rosterAcct).forEach(k=>{if(S.rosterAcct[k].uid===a.uid)delete S.rosterAcct[k];});S.rosterAcct[p.name.toLowerCase()]={uid:a.uid,name:a.name};}
function bindPlayer(p,a){setAcct(p,a);toast('🔗 '+p.name+' ↔ '+a.name);save();render();}
function unbindPlayer(p){const u=p.acct&&p.acct.uid;delete p.acct;if(S.rosterAcct)Object.keys(S.rosterAcct).forEach(k=>{if(S.rosterAcct[k].uid===u)delete S.rosterAcct[k];});toast('Привязка снята: '+p.name);save();render();}
function addAcct(a){const same=S.players.find(q=>!q.acct&&q.name.toLowerCase()===a.name.toLowerCase());if(same)return bindPlayer(same,a);
  let nm=a.name;if(S.players.some(q=>q.name.toLowerCase()===nm.toLowerCase())){let i=2;while(S.players.some(q=>q.name.toLowerCase()===(a.name+' '+i).toLowerCase()))i++;nm=a.name+' '+i;}
  const go=()=>{addPlayersNow([nm]);const p=S.players.find(q=>q.name===nm);if(p){setAcct(p,a);save();render();}};
  if(S.lateRegUntil&&T().startedAt!=null&&curLvl()>S.lateRegUntil)confirmB('Регистрация закрыта',`Поздняя регистрация была до ${S.lateRegUntil} уровня. Всё равно добавить?`,go,'Добавить');else go();}
function acctMenu(p){let accs=[];try{accs=roomAccts();}catch(e){}const bu=boundUids(),free=accs.filter(a=>!bu.has(a.uid));
  if(p.acct)return modal(`<h3>🔗 ${esc(p.name)}</h3><p>Привязан к аккаунту <b>${esc(p.acct.name)}</b>. Итоги вечера в фишках попадут в его кабинет.</p>`,[{t:'Отвязать',cls:'red',fn:()=>unbindPlayer(p)},...free.map(a=>({t:'Перепривязать: '+a.name+(a.self?' (вы)':''),fn:()=>bindPlayer(p,a)})),{t:'Закрыть',cls:'pri'}]),$('#mbox .mbtns').classList.add('col');
  if(!free.length)return modal(`<h3>🔗 ${esc(p.name)}</h3><p>Свободных аккаунтов нет. Аккаунт появится здесь, когда игрок войдёт в комнату с телефона через аккаунт (Google или почта).</p>`,[{t:'Понятно',cls:'pri'}]);
  modal(`<h3>🔗 Привязать ${esc(p.name)}</h3><p>Итоги вечера в фишках попадут в кабинет выбранного аккаунта.</p>`,[...free.map(a=>({t:a.name+(a.self?' (вы)':''),cls:'pri',fn:()=>bindPlayer(p,a)})),{t:'Отмена',cls:'ghost'}]);$('#mbox .mbtns').classList.add('col');}
function autoBind(){let accs=[];try{accs=roomAccts().filter(a=>!a.self);}catch(e){return;}const bu=boundUids();let ch=false;
  accs.forEach(a=>{if(bu.has(a.uid))return;const p=S.players.find(q=>!q.acct&&q.name.toLowerCase()===a.name.toLowerCase());if(p){setAcct(p,a);bu.add(a.uid);ch=true;toast('🔗 '+p.name+' привязан(а) к аккаунту');}});
  if(ch){save();render();}}

/* ===== Player actions ===== */
let nid=S.players.reduce((m,p)=>Math.max(m,p.id),0)+1;
function snap(){S.hist.push(JSON.stringify({players:S.players,seats:S.seats,logLen:S.log.length}));if(S.hist.length>40)S.hist.shift();}
function settle(hold){const inP=S.players.filter(p=>p.status==='in');S.players.forEach(p=>{if(p.status==='in')p.place=null;});
  if(isT()&&inP.length===1&&S.players.length>1&&!hold){inP[0].place=1;if(S.lastWinner!==inP[0].id){setTimeout(()=>{if(isT()&&totals().inP<=1&&S.players.length>1)openFin();},1800);S.lastWinner=inP[0].id;toast('🏆 Победитель: '+inP[0].name);speak(['win'],'Победитель — '+inP[0].name);}}else S.lastWinner=null;
  const out=S.players.filter(p=>p.status==='out').sort((a,b)=>b.outAt-a.outAt);out.forEach((p,i)=>p.place=inP.length+1+i);}
function addPlayers(names){const doAdd=()=>addPlayersNow(names);
  if(S.lateRegUntil&&T().startedAt!=null&&curLvl()>S.lateRegUntil)confirmB('Регистрация закрыта',`Поздняя регистрация была до ${S.lateRegUntil} уровня. Всё равно добавить?`,doAdd,'Добавить');else doAdd();}
function addPlayersNow(names){{snap();names.forEach(n=>{const pl={id:nid++,name:n,status:'in',rebuys:0,addons:0,place:null,knocks:0,bustedBy:null,outAt:0,seat:null,finalChips:null,paid:S.buyin,chipsIn:S.startStack};
    const ra=(S.rosterAcct||{})[n.toLowerCase()];if(ra&&!S.players.some(q=>q.acct&&q.acct.uid===ra.uid))pl.acct={uid:ra.uid,name:ra.name};S.players.push(pl);
    if(!S.roster.some(r=>r.toLowerCase()===n.toLowerCase()))S.roster.push(n);});
    logEv('join',(names.length>1?'За стол сели: ':'За стол сел(а) ')+names.join(', ')+(T().startedAt!=null?' (поздняя регистрация)':''));settle();save();render();}}
$('#addF').addEventListener('submit',e=>{e.preventDefault();const have=new Set(S.players.map(p=>p.name.toLowerCase()));
  const ns=$('#addName').value.split(',').map(s=>s.trim()).filter(n=>n&&!have.has(n.toLowerCase()));$('#addName').value='';if(ns.length)addPlayers(ns);});
$('#acctBox').addEventListener('click',e=>{const c=e.target.closest('[data-acc]');if(!c)return;let accs=[];try{accs=roomAccts();}catch(x){}const a=accs.find(z=>z.uid===c.dataset.acc);if(a)addAcct(a);});
$('#rosterBox').addEventListener('click',e=>{const x=e.target.closest('[data-rx]');if(x){S.roster=S.roster.filter(n=>n!==x.dataset.rx);save();render();return;}
  const r=e.target.closest('[data-r]');if(r){addPlayers([r.dataset.r]);return;}
  if(e.target.closest('[data-rall]')){const have=new Set(S.players.map(p=>p.name.toLowerCase()));addPlayers(S.roster.filter(n=>!have.has(n.toLowerCase())));}});
function doBust(p,by,hold,noAsk){const last=isT()&&p.status==='in'&&S.players.filter(q=>q.status==='in'&&q!==p).length===1;const ask=!hold&&!noAsk&&last&&!canRebuy(p,S.halfRebuy?.5:1);snap();p.status='out';p.outAt=Date.now();p.finalChips=0;p.bustedBy=by||null;if(isT()&&S.bountyOn&&!by)p.freeHeads=(p.freeHeads||0)+1;const k=by?S.players.find(q=>q.id===by):null;if(k)k.knocks=(k.knocks||0)+1;
  settle(hold||ask);logEv('bust',p.name+' — вылет'+(isT()?' · '+p.place+' место':'')+(k?' · выбил(а) '+k.name:'')+(isT()&&S.bountyOn&&!k?' · баунти — в призовой фонд':''));const w=S.players.find(q=>q.place===1&&q.status==='in');if(w){logEv('win','Победитель: '+w.name);if(T().running)pause();}save();render();if(!hold)toast(p.name+(isT()?' — '+p.place+' место':' — вылет'));if(ask)setTimeout(()=>winOrRebuy(p),0);}
/* 4.20.1: вылет предпоследнего, пока докупы открыты, — спросить: докуп или победитель */
function winOrRebuy(p){const w=S.players.filter(q=>q.status==='in');if(w.length!==1||p.status!=='out'||!isT())return;
  const fin=()=>{if(S.players.filter(q=>q.status==='in').length!==1)return;settle();const W=S.players.find(q=>q.place===1&&q.status==='in');if(W){logEv('win','Победитель: '+W.name);if(T().running)pause();}save();render();};
  const B=[];if(!canRebuy(p,1))B.push({t:'💸 '+p.name+' докупается',cls:'pri',fn:()=>applyRebuy(p,1)});
  if(S.halfRebuy&&!canRebuy(p,.5))B.push({t:'💸 Докуп на половину стека',fn:()=>applyRebuy(p,.5)});
  B.push({t:'🏆 Победитель — '+w[0].name,cls:B.length?'':'pri',fn:fin});
  modal(`<h3>Остался один игрок</h3><p>${esc(p.name)} вылетел, но докупы ещё открыты. Докупится — играем дальше. Нет — побеждает ${esc(w[0].name)}.</p>`,B,fin);$('#mbox .mbtns').classList.add('col');}
function applyRebuy(p,k=1){const cost=Math.round(S.rebuyCost*k),stack=Math.round(S.rebuyStack*k),lbl=k<1?' — докуп 50%':' — докуп';{snap();p.rebuys++;if(k<1)p.halfs=(p.halfs||0)+1;p.paid=invested(p)+cost;p.chipsIn=chipsOf(p)+stack;(p.rb=p.rb||[]).push([cost,stack,k]);logEv('rebuy',p.name+(p.status==='out'?lbl+', снова в игре':lbl)+' · №'+p.rebuys+' (+'+fmt(stack)+' фишек, '+money(cost)+')');if(p.status==='out'){p.status='in';p.finalChips=null;p.bustedBy=null;}settle();save();render();toast(p.name+lbl);}}
function rebuyAsk(p){if(!S.halfRebuy)return doRebuy(p,1);
  modal(`<h3>Докуп: ${esc(p.name)}</h3><p>На сколько докупается?</p>`,[{t:`💸 Весь стек · +${fmt(S.rebuyStack)} фишек за ${money(S.rebuyCost)}`,cls:'pri',fn:()=>{setTimeout(()=>doRebuy(p,1),0);}},{t:`💸 Половина · +${fmt(Math.round(S.rebuyStack/2))} фишек за ${money(Math.round(S.rebuyCost/2))}`,fn:()=>{setTimeout(()=>doRebuy(p,.5),0);}},{t:'Отмена',cls:'ghost'}]);$('#mbox .mbtns').classList.add('col');}
function bustThen(p,after,hold){const others=S.players.filter(q=>q.status==='in'&&q!==p);
  if(isT()&&S.bountyOn&&others.length){modal(`<h3>Вылет: ${esc(p.name)}</h3><p>Кто выбил? Баунти ${money(S.bounty)} достанется ему.</p><select id="byWho">${others.map(q=>`<option value="${q.id}">${esc(q.name)}</option>`).join('')}<option value="">— никто (баунти — в призовой фонд)</option></select>`,
    [{t:'Отмена'},{t:'Готово',cls:'pri',fn:()=>{doBust(p,+$('#byWho').value||null,hold);setTimeout(after,0);}}]);return;}
  doBust(p,null,hold);after();}
function doRebuy(p,k=1){const f=()=>applyRebuy(p,k);
  const check=()=>{const why=canRebuy(p,k);if(why)confirmB('Докуп вне правил',why+' Всё равно оформить?',f,'Оформить');else f();};
  if(p.status==='in'&&S.rebuyWhen==='bust')return confirmB('Докуп только после вылета',`По правилам этого вечера ${esc(p.name)} может докупиться только после вылета. Всё равно оформить?`,check,'Оформить');
  if(p.status==='in'&&S.rebuyWhen==='short'){const lim=k<1?Math.round(S.startStack/2):S.startStack;
    modal(`<h3>${k<1?'Докуп 50%':'Докуп'}: ${esc(p.name)}</h3><p>Стек сейчас не больше ${k<1?'половины стартового':'стартового'} (${fmt(lim)} фишек)? Если игрок уже вылетел — оформим вылет и докуп.</p>`,
      [{t:'Да, стек не больше '+fmt(lim),cls:'pri',fn:check},{t:'💥 Вылетел — вылет и докуп',fn:()=>{const go=()=>setTimeout(()=>bustThen(p,f,true),0),why=canRebuy(p,k);if(why)setTimeout(()=>confirmB('Докуп вне правил',why+' Всё равно оформить?',go,'Оформить'),0);else go();}},{t:'Отмена',cls:'ghost'}]);$('#mbox .mbtns').classList.add('col');return;}
  check();}
$('#plist').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const p=S.players.find(x=>x.id==b.dataset.id);if(!p)return;playerAct(p,b.dataset.a);});
function playerAct(p,a){
  if(a==='acct')return acctMenu(p);
  if(a==='bust'){const others=S.players.filter(q=>q.status==='in'&&q!==p);
    if(isT()&&S.bountyOn&&others.length){modal(`<h3>Вылет: ${esc(p.name)}</h3><p>Кто выбил? Баунти ${money(S.bounty)} достанется ему.</p><select id="byWho">${others.map(q=>`<option value="${q.id}">${esc(q.name)}</option>`).join('')}<option value="">— никто (баунти — в призовой фонд)</option></select>`,
      [{t:'Отмена'},{t:'Готово',cls:'pri',fn:()=>doBust(p,+$('#byWho').value||null)}]);}
    else doBust(p);return;}
  if(a==='rebuy')return rebuyAsk(p);
  if(a==='rebuy50')return doRebuy(p,0.5);
  if(a==='back'){snap();logEv('back',p.name+' возвращён в игру (ошибочный вылет)');if(p.bustedBy){const k=S.players.find(q=>q.id===p.bustedBy);if(k&&k.knocks)k.knocks--;}else if(p.freeHeads)p.freeHeads--;p.status='in';p.finalChips=null;p.bustedBy=null;settle();save();render();return;}
  if(a==='addon'){snap();p.addons++;p.paid=invested(p)+S.addonCost;p.chipsIn=chipsOf(p)+S.addonStack;logEv('addon',p.name+' взял аддон (+'+fmt(S.addonStack)+' фишек, '+money(S.addonCost)+')');save();render();toast(p.name+': аддон +'+fmt(S.addonStack)+' фишек');return;}
  if(a==='unrebuy'){snap();const last=(p.rb&&p.rb.pop())||[S.rebuyCost,S.rebuyStack,1];p.paid=invested(p)-last[0];p.chipsIn=chipsOf(p)-last[1];p.rebuys--;if(last[2]<1&&p.halfs)p.halfs--;logEv('undo','Отменён докуп: '+p.name);save();render();return;}
  if(a==='del')confirmB('Удалить игрока?',`«${esc(p.name)}» и все его взносы уйдут из банка.`,()=>{snap();logEv('del',p.name+' удалён из игры');S.players=S.players.filter(x=>x!==p);if(!S.players.length&&T().startedAt==null){S.log=[];S.hist=[];}settle();save();render();},'Удалить','red');}
function undo(){const h=S.hist.pop();if(!h)return;const o=JSON.parse(h);S.players=o.players;S.seats=o.seats;
  if(o.logLen!=null)S.log.forEach((e,i)=>{if(i>=o.logLen&&!['level','break','pause','resume','start','reset'].includes(e.type))e.undone=true;});logEv('undo','Отменено последнее действие');save();render();toast('Отменено');}
$('#undoBtn').onclick=undo;
$('#seatBtn').onclick=()=>{const ps=S.players.filter(p=>p.status==='in');if(ps.length<2){toast('Нужно хотя бы 2 игрока в игре');return;}
  snap();const seats=[...Array(ps.length).keys()].map(i=>i+1).sort(()=>Math.random()-.5);S.players.forEach(p=>p.seat=null);ps.forEach((p,i)=>p.seat=seats[i]);
  S.seats={n:ps.length,dealer:1+Math.floor(Math.random()*ps.length)};logEv('seats','Рассадка: '+[...ps].sort((a,b)=>a.seat-b.seat).map(p=>p.seat+'. '+p.name+(p.seat===S.seats.dealer?' (D)':'')).join(', '));save();render();$('#seatCard').scrollIntoView({behavior:'smooth'});};
$('#resBox').addEventListener('change',e=>{if(e.target.id==='logTimer'){S.logShowTimer=e.target.checked;save();render();}});
$('#resBox').addEventListener('input',e=>{const i=e.target.closest('[data-fc]');if(!i)return;const p=S.players.find(x=>x.id==i.dataset.fc);p.finalChips=i.value===''?null:Math.max(0,+i.value);save();});
$('#resBox').addEventListener('change',e=>{if(e.target.closest('[data-fc]')){e.target.blur();render();}});
$('#resBox').addEventListener('click',async e=>{const ac=e.target.closest('[data-acopy]'),ad=e.target.closest('[data-adel]'),adl=e.target.closest('[data-adl]');
  if(adl){const a=S.archive[+adl.dataset.adl];if(!downloadText(eveName(a),eveningText(a))){try{await navigator.clipboard.writeText(eveningText(a));toast('Здесь скачивание закрыто — отчёт скопирован');}catch(err){}}return;}
  if(ad){confirmB('Удалить запись?','Итоги этого вечера будут удалены из истории.',()=>{S.archive.splice(+ad.dataset.adel,1);save();render();},'Удалить','red');return;}
  if(!ac&&e.target.id!=='copyRes')return;const txt=ac?S.archive[+ac.dataset.acopy].text:resultsText();
  try{await navigator.clipboard.writeText(txt);toast('Скопировано — вставляйте в чат');}
  catch(err){modal(`<h3>Итоги</h3><p>Скопируйте вручную:</p><textarea style="width:100%;height:220px;background:#000;color:#fff;border-radius:10px;padding:10px;border:1px solid var(--line)">${esc(txt)}</textarea>`,[{t:'Закрыть'}]);}});

/* ===== Structure actions ===== */
$('#gAnte').addEventListener('change',e=>{S.gen.ante=e.target.value;save();render();toast('Анте применится при следующей генерации структуры');});
$('#gAnteFrom').addEventListener('change',e=>{S.gen.anteFrom=Math.max(1,Math.round(+e.target.value||1));save();render();});
$$('[data-g]').forEach(e=>e.addEventListener('change',()=>{S.gen[e.dataset.g]=Math.max(0,+e.value||0);S.gen.pace='';save();render();}));
const PACES={hyper:{levelMin:5,grow:0,maxMin:5,breakEvery:60,breakMin:5,depth:40,n:'Гипертурбо: уровни по 5 минут, неглубокие стеки — всё решается быстро.'},
  turbo:{levelMin:8,grow:2,maxMin:12,breakEvery:60,breakMin:10,depth:60,n:'Турбо: короткие уровни 8→10→12 минут.'},
  standard:{levelMin:12,grow:5,maxMin:25,breakEvery:60,breakMin:10,depth:100,n:'Стандарт: начинаем бодро (12 мин), после каждого перерыва уровни длиннее на 5 минут, до 25.'},
  deep:{levelMin:15,grow:5,maxMin:30,breakEvery:75,breakMin:10,depth:150,n:'Медленный: глубокие стеки, 15→20→25→30 минут.'},
  slow:{levelMin:25,grow:10,maxMin:45,breakEvery:90,breakMin:15,depth:200,n:'Слоуролл: длинные уровни 25→35→45 минут, очень глубоко.'}};
$('#paceBox').addEventListener('click',e=>{const b=e.target.closest('[data-pace]');if(!b)return;const P=PACES[b.dataset.pace];
  confirmB(b.textContent.trim(),P.n+' Сгенерировать структуру на '+S.gen.hours+' ч?',()=>{const{n,...rest}=P;Object.assign(S.gen,rest,{pace:b.dataset.pace});regen();save();render();toast('Структура готова');},'Сгенерировать');});
$('#genBtn').onclick=()=>confirmB('Сгенерировать структуру?','Текущая структура блайндов будет заменена.'+(T().startedAt!=null?' Игра уже идёт — продолжим с того же номера уровня.':''),()=>{regen();save();render();toast('Структура готова');});
$('#slist').addEventListener('change',e=>{const i=+e.target.dataset.i,f=e.target.dataset.f;if(!f)return;let v=Math.max(0,+e.target.value||0);if(f==='min')v=Math.max(1,v);
  S.levels[i][f]=v;const lv=S.levels[i];if(f==='bb'&&(!lv.sb||lv.sb>v))lv.sb=Math.round(v/2);if(f==='sb'&&lv.sb>lv.bb){lv.bb=lv.sb*2;toast('Большой блайнд не может быть меньше малого — поправил');}
  if(f==='min'&&i===T().idx){const t=T(),old=(+e.target.defaultValue||v)*60000,d=v*60000-old;if(t.running)t.endsAt=Math.max(Date.now()+1000,t.endsAt+d);else t.remaining=Math.max(1000,rem()+d);}
  e.target.blur();save();render();});
$('#slist').addEventListener('click',e=>{const b=e.target.closest('[data-sa]');if(!b)return;const i=+b.dataset.i,a=b.dataset.sa,Ls=S.levels;
  if(a==='go'){goto(i,true);toast('Переход выполнен');return;}
  const t=T();
  if(a==='up'&&i>0){[Ls[i-1],Ls[i]]=[Ls[i],Ls[i-1]];if(t.idx===i)t.idx--;else if(t.idx===i-1)t.idx++;}
  if(a==='dn'&&i<Ls.length-1){[Ls[i+1],Ls[i]]=[Ls[i],Ls[i+1]];if(t.idx===i)t.idx++;else if(t.idx===i+1)t.idx--;}
  if(a==='del'&&Ls.length>1){Ls.splice(i,1);if(i<t.idx)t.idx--;else if(i===t.idx){t.idx=Math.min(t.idx,Ls.length-1);t.remaining=Lms(t.idx);if(t.running)t.endsAt=Date.now()+t.remaining;}}
  save();render();});
$('#addLvl').onclick=()=>{const last=[...S.levels].reverse().find(l=>l.type==='level')||{sb:10,bb:20,min:15,ante:0};S.levels.push({type:'level',sb:last.sb*2,bb:last.bb*2,ante:(last.ante||0)*2,min:last.min});save();render();};
$('#addBrk').onclick=()=>{S.levels.push({type:'break',min:10});save();render();};

/* ===== Chips actions ===== */
$('#setsBox').addEventListener('change',e=>{const t=e.target;
  if(t.dataset.sn!=null){S.sets[+t.dataset.sn].name=t.value||'Набор';}
  else if(t.dataset.son!=null){S.sets[+t.dataset.son].on=t.checked;}
  else if(t.dataset.c){const c=S.sets[+t.dataset.si].chips[+t.dataset.i],f=t.dataset.c;c[f]=(f==='c'||f==='d')?t.value:Math.max(f==='v'?1:0,+t.value||0);}
  else return; t.blur();save();render();});
$('#setsBox').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='addSet'){const base=S.sets[0]?S.sets[0].chips:[];S.sets.push({id:Date.now(),name:'Набор '+(S.sets.length+1),on:true,chips:base.map(c=>({v:c.v,n:0,c:c.c,d:c.d}))});save();render();toast('Набор добавлен — впишите количество и цвета');return;}
  if(b.dataset.addchip!=null){S.sets[+b.dataset.addchip].chips.push({v:1000,n:0,c:'#f97316',d:'#ffffff'});save();render();return;}
  if(b.dataset.cdel!=null){S.sets[+b.dataset.si].chips.splice(+b.dataset.cdel,1);save();render();return;}
  if(b.dataset.sdel!=null){const si=+b.dataset.sdel;confirmB('Убрать набор?',`«${esc(S.sets[si].name)}» будет удалён.`,()=>{S.sets.splice(si,1);save();render();},'Убрать','red');}});
$('#calcP').addEventListener('change',e=>{S.calc.players=Math.max(2,+e.target.value||2);save();render();});
$('#calcR').addEventListener('change',e=>{S.calc.reserve=Math.max(0,+e.target.value||0);save();render();});
$('#calcOut').addEventListener('click',e=>{const b=e.target.closest('#applyStack');if(!b)return;const s=+b.dataset.st;
  confirmB('Новый стартовый стек',`Стартовый стек и докуп станут ${fmt(s)} фишек. Курс: ${fmt(S.buyin)} ${esc(S.currency)} = ${fmt(s)} фишек. Перегенерировать блайнды под этот стек?`,
    ()=>{S.startStack=s;S.rebuyStack=s;if(S.addonStack)S.addonStack=s;S.gen.players=S.calc.players;S.gen.rebuys=S.calc.reserve;regen();loadSettings();save();render();toast('Готово: стек и блайнды обновлены');},'Да, и блайнды тоже');});

/* ===== Settings actions ===== */
$$('[data-s]').forEach(e=>e.addEventListener(e.type==='checkbox'?'change':'input',()=>{const k=e.dataset.s;
  S[k]=e.type==='checkbox'?e.checked:e.type==='number'?Math.max(0,+e.value||0):e.value;save();render();}));
$$('[data-mode]').forEach(b=>b.onclick=()=>{const m=b.dataset.mode;if(m===S.mode)return;const go=()=>{S.mode=m;S.lastWinner=null;settle();logEv('reset','Формат: '+(m==='tournament'?'турнир':'кэш'));save();render();};
  if(S.players.length)confirmB('Сменить формат?','Игра уже идёт. Взносы и вылеты сохранятся, но итоги будут считаться по-другому: '+(m==='tournament'?'призовые места вместо подсчёта фишек.':'по фишкам на руках вместо призовых мест.'),go,'Сменить');else go();});
$('#payIn').addEventListener('change',e=>{const a=e.target.value.split(/[,;\s]+/).map(Number).filter(n=>n>0);if(!a.length)return render();S.payouts=a;save();render();
  const s=a.reduce((x,y)=>x+y,0);if(Math.abs(s-100)>.01)toast('Сумма выплат '+s+'%, а не 100%');});
$('#voiceSel').addEventListener('change',e=>{S.voiceName=e.target.value;voiceSig='';save();const v=S.voice;S.voice=true;speak(['lvl_2','bl_20_40'],'Уровень 2. Блайнды 20 на 40.');S.voice=v;});
$('#testSnd').onclick=()=>{const s=S.sound,v=S.voice;S.sound=S.voice=true;sndLevel();announce(T().idx);S.sound=s;S.voice=v;};
function archiveGame(){if(!S.players.length)return;S.archive.unshift({at:Date.now(),mode:S.mode,text:resultsText(),log:S.log});if(S.archive.length>100)S.archive.length=100;}
function eveningText(a){if(!a)return'';let t=a.text;if(a.log&&a.log.length){t+='\nХронология (время на часах, в скобках — сколько прошло по таймеру):\n';a.log.forEach(e=>{if(e.undone)return;t+=`${hhmm(e.at)}  (${fmtHM(e.el)} по таймеру)  [${e.lvl==='☕'?'перерыв':'ур. '+e.lvl}]  ${e.text}\n`;});}return t;}
function downloadText(name,text){try{if(window.top!==window)return false;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();a.remove();return true;}catch(e){return false;}}
const eveName=a=>'Покер '+new Date(a.at).toLocaleDateString('ru-RU').split('.').reverse().join('-')+' '+new Date(a.at).toTimeString().slice(0,5).replace(':','-')+'.txt';
function buildEvening(){const st=S.startStack||1,tm=isT(),at=Date.now();let host='';try{const W=NET&&NET.who();if(W&&W.google)host=String(W.name||W.email||'').slice(0,60);}catch(e){}
  const rows=S.players.map(p=>{const ci=chipsOf(p),co=p.status==='out'?0:(p.finalChips==null?null:p.finalChips),net=tm||co==null?null:co-ci;
    return{u:p.acct?p.acct.uid:null,n:String(p.name).slice(0,30),ci,co,net,stk:net==null?null:Math.round(net/st*100)/100,rb:p.rebuys||0,hf:p.halfs||0,ad:p.addons||0,pl:tm?(p.place||null):null,kn:p.knocks||0};});
  return{eid:'e'+at.toString(36)+Math.random().toString(36).slice(2,6),at,name:String(S.name||'Покерный вечер').slice(0,60),mode:tm?'t':'c',n:S.players.length,st,host,rows};}
let flushing=false;
async function flushUp(){if(flushing||!(S.upQ&&S.upQ.length)||!NutsNet.configured())return;flushing=true;
  try{NET=NET||await NutsNet.connect();const W=NET.who();if(!W.google)return;const me=NET.uid,left=[];
    for(const ev of S.upQ){const base={at:ev.at,name:ev.name,mode:ev.mode,n:ev.n,st:ev.st,host:ev.host||String(W.name||W.email||'').slice(0,60),hu:me};
      for(const r of ev.rows){if(!r.u)continue;const rec=Object.assign({},base,{me:r.n,ci:r.ci,co:r.co,net:r.net,stk:r.stk,rb:r.rb,hf:r.hf,ad:r.ad,pl:r.pl,kn:r.kn});
        Object.keys(rec).forEach(k=>{if(rec[k]==null)delete rec[k];});try{await NET.set('users/'+r.u+'/evenings/'+ev.eid,rec);}catch(e){}}
      const rows=ev.rows.map(r=>{const o=Object.assign({},r);delete o.u;Object.keys(o).forEach(k=>{if(o[k]==null)delete o[k];});return o;});
      try{await NET.set('users/'+me+'/hosted/'+ev.eid,Object.assign({},base,{rows}));}catch(e){left.push(ev);}}
    S.upQ=left;save();}catch(e){}finally{flushing=false;}}
function newGame(){const had=S.players.length;
  if(had&&NutsNet.configured()){let signed=false;try{signed=!!(NET&&NET.who().google);}catch(e){}if(signed||S.players.some(p=>p.acct)){S.upQ=(S.upQ||[]).concat([buildEvening()]).slice(-20);setTimeout(flushUp,50);}}
  archiveGame();if(had&&S.autoExport&&S.archive[0])downloadText(eveName(S.archive[0]),eveningText(S.archive[0]));S.timer=freshTimer();S.hist=[];S.seats=null;S.players=[];S.log=[];awake(false);save();render();toast('Вечер сохранён в историю. Новая игра!');}
function resetTimerOnly(){const t=T();logEv('reset','Таймер сброшен на начало');Object.assign(t,freshTimer());awake(false);save();render();toast('Таймер сброшен на 1 уровень');}
$('#newGame').onclick=()=>S.players.length?openFin():confirmB('Завершить вечер?','Итоги сохранятся в историю, список участников очистится (сохранённые игроки останутся для быстрого добавления), таймер начнётся с первого уровня.',newGame,'Завершить');
function resetMenu(){modal(`<h3>Сброс</h3><p>Что сделать?</p>`,[{t:'↺ Перезапустить текущий уровень',cls:'',fn:()=>goto(T().idx,true)},{t:'⏮ Таймер с начала (игроки и докупы остаются)',fn:resetTimerOnly},{t:'🏁 Завершить вечер и начать новый',cls:'red',fn:()=>{setTimeout(()=>$('#newGame').click(),0);}},{t:'Отмена',cls:'ghost'}]);$('#mbox .mbtns').classList.add('col');}
$('#bReset').onclick=resetMenu;
$('#resetAll').onclick=()=>confirmB('Сбросить всё?','Удалятся игроки, сохранённый список, набор фишек, структура и настройки.',()=>{S=defaults();S.levels=generate();nid=1;awake(false);save();loadSettings();render();},'Сбросить','red');

/* ===== File storage ===== */
const idb=(()=>{let p;const db=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('pokerTimer',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));
  return{get:k=>db().then(d=>new Promise((res,rej)=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);})),
    set:(k,v)=>db().then(d=>new Promise((res,rej)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);}))};})();
let FH=null,fileOK=false,writing=false,again=false,lastSaved=null,wT=null;
const FTYPES=[{description:'Покерный таймер',accept:{'application/json':['.json']}}];
function dataJSON(){return JSON.stringify({app:'poker-timer',version:3,savedAt:new Date().toISOString(),state:S},null,1);}
function scheduleFile(){if(!FH||!fileOK)return;clearTimeout(wT);wT=setTimeout(writeFile,700);}
async function writeFile(){if(!FH||!fileOK)return;if(writing){again=true;return;}writing=true;
  try{const w=await FH.createWritable();await w.write(dataJSON());await w.close();lastSaved=new Date();}catch(e){fileOK=false;toast('Не удалось записать файл — проверьте разрешение');}
  writing=false;renderFileState();if(again){again=false;writeFile();}}
function renderFileState(){const el=$('#fileState');if(!el)return;const api=!!window.showSaveFilePicker;
  $('#fileLink').style.display=api?'':'none';
  if(FH&&fileOK){el.className='fstate ok';el.innerHTML=`✅ Всё автоматически сохраняется в файл <b>${esc(FH.name)}</b>${lastSaved?' · последнее сохранение в '+lastSaved.toLocaleTimeString('ru-RU'):''}`;}
  else if(FH){el.className='fstate warn';el.innerHTML=`⏸ Файл <b>${esc(FH.name)}</b> привязан, но браузер ждёт разрешения. <button class="btn sm gold" id="fileAllow">Разрешить запись</button>`;}
  else{el.className='fstate';el.innerHTML=api?'Сейчас данные хранятся только внутри браузера на этом компьютере. Привяжите файл — будет ещё и копия на диске, которую можно открыть где угодно.':'Этот браузер хранит данные только внутри себя. Для копии на диске используйте «Скачать копию».';}}
document.addEventListener('click',async e=>{if(e.target.id!=='fileAllow')return;try{fileOK=(await FH.requestPermission({mode:'readwrite'}))==='granted';if(fileOK)writeFile();}catch(err){}renderFileState();});
function loadData(txt){let o;try{o=JSON.parse(txt);}catch(e){toast('Это не файл таймера');return false;}const st=o&&o.state?o.state:o;
  if(!st||!st.levels){toast('Это не файл таймера');return false;}
  S=Object.assign(defaults(),st);migrate();nid=S.players.reduce((m,p)=>Math.max(m,p.id),0)+1;if(S.timer.running)awake(true);loadSettings();save();render();toast('Данные загружены');return true;}
$('#fileLink').onclick=async()=>{try{const h=await showSaveFilePicker({suggestedName:'poker-data.json',types:FTYPES});FH=h;fileOK=true;await idb.set('fh',h).catch(()=>{});await writeFile();toast('Теперь всё сохраняется в '+h.name);}
  catch(e){if(e.name!=='AbortError')toast('Браузер не дал сохранить файл здесь. Откройте таймер из файла на компьютере или используйте «Скачать копию»');}};
$('#fileOpen').onclick=async()=>{if(!window.showOpenFilePicker){$('#fileImport').click();return;}
  try{const[h]=await showOpenFilePicker({types:FTYPES});const txt=await(await h.getFile()).text();
    const go=async()=>{if(!loadData(txt))return;try{if((await h.requestPermission({mode:'readwrite'}))==='granted'){FH=h;fileOK=true;await idb.set('fh',h).catch(()=>{});lastSaved=null;}}catch(e){}renderFileState();};
    confirmB('Открыть файл?',`Текущие данные заменятся данными из «${esc(h.name)}», и дальше всё будет сохраняться в него.`,()=>{go();},'Открыть');}
  catch(e){if(e.name!=='AbortError')$('#fileImport').click();}};
$('#fileImport').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const txt=await f.text();confirmB('Загрузить копию?','Текущие данные заменятся данными из файла.',()=>{loadData(txt);},'Загрузить');});
$('#fileExport').onclick=async()=>{const name='poker-data-'+new Date().toISOString().slice(0,10)+'.json';
  if(window.showSaveFilePicker){try{const h=await showSaveFilePicker({suggestedName:name,types:FTYPES});const w=await h.createWritable();await w.write(dataJSON());await w.close();toast('Копия сохранена');return;}catch(e){if(e.name==='AbortError')return;}}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([dataJSON()],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();toast('Копия скачана');}catch(e){}
  if(window.top!==window){try{await navigator.clipboard.writeText(dataJSON());toast('Здесь скачивание закрыто — данные скопированы в буфер');}catch(e){}}};
(async()=>{try{const h=await idb.get('fh');if(h){FH=h;fileOK=(await h.queryPermission({mode:'readwrite'}))==='granted';}}catch(e){}renderFileState();})();

/* ===== Fit to window ===== */
function fit(){const st=$('.stage'),sin=$('.sin');if(!st||!$('#v-timer').classList.contains('on'))return;
  if(innerWidth<=760&&!(innerHeight<=500)){st.style.setProperty('--k',1);return;}
  const cs=getComputedStyle(st),H=st.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom),W=st.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  const tvs=$('#tvstats'),tvc=$('#tvcombos');let Wc=W;if(document.body.classList.contains('tv')&&tvs&&getComputedStyle(tvs).display!=='none'){const side=Math.max(tvs.offsetWidth,tvc&&getComputedStyle(tvc).display!=='none'?tvc.offsetWidth:0)+40;Wc=W-2*side;}
  const over=()=>sin.offsetHeight>H||$('#clock').scrollWidth>Wc+1||$('#blinds').scrollWidth>Wc+1;
  let k=1.3;st.style.setProperty('--k',k);while(over()&&k>.25){k-=.03;st.style.setProperty('--k',k.toFixed(2));}}
let fitT;const refit=()=>{clearTimeout(fitT);fitT=setTimeout(fit,60);};addEventListener('resize',refit);
try{new ResizeObserver(refit).observe($('.stage'));}catch(e){}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){try{navigator.keyboard&&navigator.keyboard.unlock&&navigator.keyboard.unlock();}catch(e){}if(tvFs)tv(false);}else kbLock();setTimeout(fit,80);});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);

/* ===== Remote (host side) ===== */
let NET=null,remoteOn=false,admins={},members={},rUnsub=[],remoteErr='',pendingReq=[],HI=null,rbReq=[];
setInterval(()=>{try{if(rbReq.length){const n=rbReq.length;renderApprove();if(rbReq.length!==n)publishSoon();}}catch(e){}},15000);
const ekey=e=>String(e||'').trim().toLowerCase().replace(/\./g,',');
const SUBS=['state','admins','members','join','cmds','banned','snap','host'],STALE=12.2*3600e3;
async function hostInfo(force){if(HI&&!force)return HI;NET=NET||await NutsNet.connect();const W=NET.who(),hi={admin:false,host:false,open:false,can:false,w:W,hosts:{}};
  if(W.google){try{hi.open=(await NET.get('settings/openHosting'))===true;}catch(e){}
    try{hi.hosts=(await NET.get('hosts'))||{};hi.admin=true;}catch(e){}
    if(!hi.admin){try{hi.host=!!(await NET.get('hosts/'+ekey(W.email)));}catch(e){}}
    hi.can=hi.admin||hi.host||hi.open;}
  return HI=hi;}
let rmBusy=null,snapT=null;
const DEV=(()=>{try{let d=sessionStorage.getItem('nuts.devT')||localStorage.getItem('nuts.dev');if(!d){d='d'+Math.random().toString(36).slice(2,10);localStorage.setItem('nuts.dev',d);}return d;}catch(e){return 'd'+Math.random().toString(36).slice(2,10);}})();
function snapSoon(){if(!remoteOn)return;clearTimeout(snapT);snapT=setTimeout(pushSnap,3000);}
function pushSnap(){if(!remoteOn||!NET||!S.remote)return;const o=Object.assign({},S);['archive','hist','remote','upQ'].forEach(k=>delete o[k]);
  const str=JSON.stringify(o);if(str.length>450000)return;NET.set(RR()+'/snap',{at:NET.now(),skew:Date.now()-NET.now(),dev:DEV,pin:S.remote.pin,s:str}).catch(()=>{});}
async function takeOver(room){let sn=null;try{sn=await NET.get('rooms/'+room+'/snap');}catch(e){}
  if(!sn||!sn.s){enErr='Не нашёл копию вечера: обновите страницу на том устройстве (нужна версия 4.15+) и попробуйте снова через пару секунд.';return renderEntry();}
  let o;try{o=JSON.parse(sn.s);}catch(e){enErr='Копия вечера повреждена.';return renderEntry();}
  const go=async()=>{if(S.players.length)archiveGame();const sh=(Date.now()-NET.now())-(sn.skew||0),t=o.timer||{};
    ['endsAt','startedAt','pausedAt'].forEach(k=>{if(typeof t[k]==='number'&&t[k])t[k]+=sh;});(o.players||[]).forEach(p=>{if(p.outAt)p.outAt+=sh;});
    S=Object.assign(defaults(),o,{archive:S.archive,upQ:S.upQ,hist:[],remote:{room,pin:sn.pin||pin4(),on:true,strikes:{},wrong:{}}});migrate();
    nid=S.players.reduce((m,p)=>Math.max(m,p.id),0)+1;save();loadSettings();closeEntry();render();
    try{await hostConnect(true);toast('⤵ Вечер перенесён на это устройство');}catch(e){toast('Вечер перенесён, но пульт не подключился: '+(e.message||e));}
    if(T().running)awake(true);render();};
  if(S.players.length||T().startedAt!=null){closeEntry();confirmB('Перенести вечер сюда?','На этом устройстве есть свой вечер — он сохранится в историю и будет заменён перенесённым.',go,'Перенести');}else go();}
async function activeRoom(){try{const c=await NET.get('users/'+NET.uid+'/room');if(!c)return null;if((await NET.get('rooms/'+c+'/owner'))!==NET.uid)return null;
  const sn=await NET.get('rooms/'+c+'/seen');if(!sn||NET.now()-sn>STALE)return null;return c;}catch(e){return null;}}
async function closeRoom(c){const uid=NET.uid;let o=null;try{o=await NET.get('rooms/'+c+'/owner');}catch(e){}if(o!==uid)return;
  for(const k of SUBS){try{await NET.remove('rooms/'+c+'/'+k);}catch(e){}}try{await NET.remove('rooms/'+c+'/seen');}catch(e){}try{await NET.remove('rooms/'+c+'/owner');}catch(e){}}
async function claimRoom(c){const uid=NET.uid,o=await NET.get('rooms/'+c+'/owner');
  if(o===uid){await NET.set('rooms/'+c+'/seen',NET.now());return true;}
  if(o){const sn=await NET.get('rooms/'+c+'/seen');if(sn&&NET.now()-sn<STALE)return false;}
  await NET.update('rooms/'+c,{owner:uid,seen:NET.now()});
  for(const k of SUBS){try{await NET.remove('rooms/'+c+'/'+k);}catch(e){}}
  return true;}
setInterval(()=>{if(remoteOn&&NET&&S.remote)NET.set(RR()+'/seen',NET.now()).catch(()=>{});},10*60e3);
const pin4=()=>String(Math.floor(1000+Math.random()*9000));
let pubQ=false;function publishSoon(){if(!remoteOn||pubQ)return;pubQ=true;Promise.resolve().then(()=>{pubQ=false;publish();});}
function remoteState(){const t=T(),l=L(t.idx),nx=L(t.idx+1),x=totals(),off=NET.now()-Date.now(),ad=Object.values(admins)[0];
  return{v:1,ver:window.NUTS_VER,name:S.name,mode:S.mode,cur:S.currency,remote:ad?ad.name:'',
    t:{run:!!t.running,end:t.running?Math.round(t.endsAt+off):0,rem:t.running?0:Math.round(rem()),st:t.startedAt!=null,len:Lms(t.idx)},
    lv:l?{ty:l.type,sb:l.sb||0,bb:l.bb||0,an:l.ante||0,ab:l.bba?1:0,min:l.min,n:lvlNum(t.idx)}:null,nx:nx?{ty:nx.type,sb:nx.sb||0,bb:nx.bb||0,an:nx.ante||0,ab:nx.bba?1:0}:null,
    first:t.idx<=0,last:t.idx>=S.levels.length-1,tot:S.levels.filter(z=>z.type==='level').length,
    go:!!S.gOnlyRemote,pl:S.players.map(p=>({id:p.id,n:p.name,st:p.status,rb:p.rebuys||0,hf:p.halfs||0,ad:p.addons||0,pl:p.place||0,u:p.acct?p.acct.uid:''})),rq:rbReq.map(r=>({u:r.uid,n:r.pn,k:r.k})),
    x:{inP:x.inP,n:x.n,reb:x.reb,bank:Math.round(isT()?x.pool:x.money),avg:Math.round(x.avg)},
    r:{when:S.rebuyWhen,half:!!S.halfRebuy,addon:!!S.addonOn,max:S.maxRebuys||0,until:S.rebuyUntil||0,lvl:curLvl(),bounty:isT()&&!!S.bountyOn,late:S.lateRegUntil||0,start:S.startStack,rc:S.rebuyCost,rs:S.rebuyStack},
    undo:S.hist.length>0,at:NET.now()};}
function publish(){if(!remoteOn||!NET)return;NET.set('rooms/'+S.remote.room+'/state',remoteState()).catch(()=>{});}
const RR=()=>'rooms/'+S.remote.room;
function strike(uid,why){const sr=S.remote.strikes=S.remote.strikes||{};sr[uid]=(sr[uid]||0)+1;if(sr[uid]>=3)ban(uid,why||'3 отключения');save();}
function ban(uid,why){NET.set(RR()+'/banned/'+uid,true);NET.remove(RR()+'/members/'+uid);NET.remove(RR()+'/admins/'+uid);logEv('seats','Устройство заблокировано в комнате ('+why+')');}
function kick(uid){const nm=(members[uid]||admins[uid]||{}).name||'Гость';NET.remove(RR()+'/admins/'+uid);NET.remove(RR()+'/members/'+uid);logEv('seats','Отключён от комнаты: '+nm);if(uid!==NET.uid)strike(uid);toast('Отключён: '+nm);}
const trusted=()=>S.trustedRemotes=S.trustedRemotes||{};
function onJoin(uid,v){NET.remove(RR()+'/join/'+uid);if(!v)return;const nm=String(v.name||'Гость').trim().slice(0,30)||'Гость';
  const g=v.g===true,ph=g&&typeof v.ph==='string'&&/^https:\/\//.test(v.ph)?v.ph.slice(0,400):'';
  if(v.want==='remote'){const mem=members[uid];if(!mem&&!admins[uid])return;if(Object.keys(admins).length&&!admins[uid])return;
    if(S.gOnlyRemote&&!(mem&&mem.g))return;
    if(mem&&mem.g&&trusted()[uid]&&!Object.keys(admins).length){NET.set(RR()+'/admins/'+uid,{name:mem.name||nm,at:NET.now(),g:true});trusted()[uid]={name:mem.name||nm,at:Date.now()};save();toast('📱 Пульт: '+(mem.name||nm));logEv('seats','Пульт подключён (доверенный): '+(mem.name||nm));return;}
    if(!pendingReq.some(r=>r.uid===uid))pendingReq.push({uid,name:nm,g:!!(mem&&mem.g)});renderApprove();sndWarn();return;}
  if(v.want==='rebuy'){if(!members[uid]&&!admins[uid])return;const p=S.players.find(q=>q.id===+v.pid);if(!p)return;const k=+v.k===.5&&S.halfRebuy?.5:1;
    rbReq=rbReq.filter(r=>r.uid!==uid);rbReq.push({uid,pid:p.id,pn:p.name,who:nm,k,at:Date.now()});renderApprove();sndWarn();publishSoon();return;}
  if(v.want==='rqcancel'){rbReq=rbReq.filter(r=>r.uid!==uid);renderApprove();publishSoon();return;}
  if(v.want==='leave'){NET.remove(RR()+'/admins/'+uid);NET.remove(RR()+'/members/'+uid);return;}
  if(v.want==='drop'){if(admins[uid]){const a=admins[uid],R1=RR();NET.set(R1+'/members/'+uid,Object.assign({},a,{name:a.name||nm,at:NET.now()})).catch(()=>{}).then(()=>NET.remove(R1+'/admins/'+uid));logEv('seats','Пульт сдан: '+(a.name||nm));}return;}
  if(String(v.pin)===String(S.remote.pin)){if(v.pay&&typeof v.pay==='object'&&v.pay.ph){S.payBook=S.payBook||{};S.payBook[uid]={ph:String(v.pay.ph).slice(0,20),b:String(v.pay.b||'').slice(0,40),at:Date.now()};}const w=S.remote.wrong||{};delete w[uid];const rec=g?{name:nm,at:NET.now(),g:true,ph}:{name:nm,at:NET.now()};
    if(!members[uid]&&!admins[uid])NET.set(RR()+'/members/'+uid,rec);else if(g&&members[uid]&&!members[uid].g)NET.set(RR()+'/members/'+uid,Object.assign({},members[uid],{g:true,ph}));save();}
  else{const w=S.remote.wrong=S.remote.wrong||{};w[uid]=(w[uid]||0)+1;if(w[uid]>=5)ban(uid,'5 неверных PIN');save();}}
function rbNotify(uid,r){const m=members[uid]||admins[uid];if(!m||!members[uid])return;NET.set(RR()+'/members/'+uid,Object.assign({},members[uid],{rq:{r,at:NET.now()}})).catch(()=>{});}
function resolveRbq(uid,ok){const r=rbReq.find(x=>x.uid===uid);if(!r)return;rbReq=rbReq.filter(x=>x!==r);
  const p=S.players.find(q=>q.id===r.pid);if(ok&&p){applyRebuy(p,r.k);logEv('rebuy','Докуп по запросу с телефона: '+r.pn);rbNotify(uid,'ok');}else{rbNotify(uid,'no');}
  renderApprove();publishSoon();render();}
function renderApprove(){let el=$('#approveBar');if(!el){el=document.createElement('div');el.id='approveBar';document.body.appendChild(el);}
  pendingReq=pendingReq.filter(r=>members[r.uid]&&!Object.keys(admins).length);
  rbReq=rbReq.filter(r=>(members[r.uid]||admins[r.uid])&&Date.now()-r.at<120000&&S.players.some(q=>q.id===r.pid));
  const r=pendingReq[0];
  if(!r){const q=rbReq[0];if(!q){el.className='';el.innerHTML='';return;}
    const cost=Math.round(S.rebuyCost*q.k),stack=Math.round(S.rebuyStack*q.k);
    el.className='on';el.innerHTML=`<div class="ab-t">💸 <b>${esc(q.pn)}</b> просит докуп · ${q.k<1?'половина':'весь стек'} · ${money(cost)} → ${fmt(stack)} фишек${q.who&&q.who!==q.pn?` <span class="muted small">(с телефона ${esc(q.who)})</span>`:''}</div><div class="ab-b"><button class="btn red" data-rbq="no">Отклонить</button><button class="btn pri" data-rbq="ok">Оформить</button></div>`;return;}
  el.className='on';el.innerHTML=`<div class="ab-t">📱 <b>${esc(r.name)}</b> хочет управлять игрой</div><div class="ab-b"><button class="btn red" data-apr="no">Отклонить</button><button class="btn pri" data-apr="yes">Разрешить</button>${r.g?'<button class="btn" data-apr="always" title="В следующий раз этот аккаунт станет пультом без вопроса">Всегда</button>':''}</div>`;}
document.addEventListener('click',e=>{const q=e.target.closest('[data-rbq]');if(q){const r=rbReq[0];if(r)resolveRbq(r.uid,q.dataset.rbq==='ok');return;}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-apr]');if(!b)return;const r=pendingReq.shift();if(!r)return renderApprove();
  if(b.dataset.apr!=='no'&&!Object.keys(admins).length&&members[r.uid]){const g=!!members[r.uid].g;NET.set(RR()+'/admins/'+r.uid,g?{name:r.name,at:NET.now(),g:true}:{name:r.name,at:NET.now()});
    if(b.dataset.apr==='always'&&g){trusted()[r.uid]={name:r.name,at:Date.now()};save();}toast('📱 Пульт: '+r.name);logEv('seats','Пульт подключён: '+r.name);}
  else{if(members[r.uid])NET.set(RR()+'/members/'+r.uid,Object.assign({},members[r.uid],{rej:NET.now()})).catch(()=>{});logEv('seats','Отклонён запрос пульта: '+r.name);}renderApprove();});
async function hostConnect(force){if(!NutsNet.configured())return;
  NET=await NutsNet.connect();const W=NET.who();if(!W.google)throw new Error('сначала войдите в аккаунт');
  const hi=await hostInfo(true);if(!hi.can)throw new Error('аккаунт '+(W.email||W.name)+' не приглашён ведущим');let room=S.remote&&S.remote.room;
  if(!force){const act=await activeRoom();if(act&&act!==room){const e=new Error('комната '+act+' открыта на другом устройстве');e.busy=act;throw e;}}
  try{
  if(room&&!(await claimRoom(room)))room=null;
  if(!room){for(let i=0;i<10&&!room;i++){const c=NutsNet.code();if(await claimRoom(c))room=c;}}
  if(room){let prev=null;try{prev=await NET.get('users/'+NET.uid+'/room');}catch(e){}if(prev&&prev!==room)await closeRoom(prev);NET.set('users/'+NET.uid+'/room',room).catch(()=>{});}
  }catch(e){if(/permission/i.test((e&&(e.code||e.message))||''))throw new Error('аккаунт '+(W.email||W.name)+' не в списке ведущих — добавьте его в правила базы');throw e;}
  if(!room)throw new Error('Не удалось создать комнату');
  const keep=S.remote&&S.remote.room===room;S.remote={room,pin:(keep&&S.remote.pin)||pin4(),on:true,strikes:(keep&&S.remote.strikes)||{},wrong:(keep&&S.remote.wrong)||{}};remoteOn=true;remoteErr='';
  rUnsub.forEach(f=>f());rUnsub=[];const R0=RR();
  try{await NET.set(R0+'/host',DEV);}catch(e){}
  rUnsub.push(NET.onValue(R0+'/owner',v=>{if(remoteOn&&S.remote&&S.remote.room===room&&v!==NET.uid)lostRoom();}));
  rUnsub.push(NET.onValue(R0+'/host',v=>{if(remoteOn&&S.remote&&S.remote.room===room&&v&&v!==DEV)lostRoom('moved');}));
  rUnsub.push(NET.onValue(R0+'/admins',v=>{admins=v||{};renderRemotePill();refreshRemoteModal();renderApprove();publishSoon();autoBind();render();}));
  rUnsub.push(NET.onValue(R0+'/members',v=>{members=v||{};refreshRemoteModal();renderApprove();autoBind();render();}));
  rUnsub.push(NET.onChild(R0+'/join',(uid,v)=>{try{onJoin(uid,v);}catch(e){}}));
  rUnsub.push(NET.onChild(R0+'/cmds',(id,c)=>{NET.remove(R0+'/cmds/'+id);if(!c||!admins[c.by]||NET.now()-(c.at||0)>20000)return;try{runCmd(c);}catch(e){}}));
  save();publish();pushSnap();renderRemotePill();refreshAcct();flushUp();}
function runCmd(c){const p=c.id!=null?S.players.find(q=>q.id===c.id):null,x=totals();
  if(c.t==='toggle'){T().running?pause():start();}
  else if(c.t==='step')step(c.d>0?1:-1);
  else if(c.t==='time')addTime(c.d>0?60000:-60000);
  else if(c.t==='undo')undo();
  else if(c.t==='rq'){resolveRbq(String(c.u),!!c.ok);return;}
  else if(c.t==='add'){const have=new Set(S.players.map(q=>q.name.toLowerCase()));const ns=[];(c.names||[]).forEach(v=>{v=String(v).trim().slice(0,30);if(v&&!have.has(v.toLowerCase())){have.add(v.toLowerCase());ns.push(v);}});if(ns.length)addPlayersNow(ns);}
  else if(c.t==='p'&&p){
    if(c.a==='bust'){if(p.status==='in'&&x.inP>1&&!(isT()&&p.place===1)){const k=c.k&&S.players.find(q=>q.id===c.k&&q.status==='in'&&q!==p);doBust(p,k?k.id:null,!!c.h,true);}}
    else if(c.a==='rebuy'||c.a==='rebuy50'){if(!(isT()&&p.place===1))applyRebuy(p,c.a==='rebuy50'?.5:1);}
    else if(c.a==='addon'){if(!p.addons&&p.status==='in')playerAct(p,'addon');}
    else if(c.a==='back'){if(p.status==='out')playerAct(p,'back');}}
  render();}
function lostRoom(why){const c=S.remote&&S.remote.room;rUnsub.forEach(f=>f());rUnsub=[];clearTimeout(snapT);pendingReq=[];rbReq=[];renderApprove();remoteOn=false;admins={};members={};S.remote=null;
  if(why==='moved'){if(T().running)pause();logEv('seats','Вечер перенесён на другое устройство (комната '+(c||'')+')');save();renderRemotePill();refreshRemoteModal();
    modal(`<h3>📲 Вечер перенесён</h3><p>Вечер и комната <b>${esc(c||'')}</b> теперь ведутся на другом устройстве. Здесь таймер остановлен, телефоны управляют тем устройством.</p>`,[{t:'Понятно',cls:'pri'}]);return;}
  save();renderRemotePill();refreshRemoteModal();
  logEv('seats','Комната '+(c||'')+' закрыта: открыта комната на другом устройстве');toast('📱 Комната '+(c||'')+' закрыта — вы открыли комнату на другом устройстве');}
async function hostDisconnect(){rUnsub.forEach(f=>f());rUnsub=[];pendingReq=[];rbReq=[];renderApprove();
  if(NET&&S.remote){await closeRoom(S.remote.room);try{await NET.remove('users/'+NET.uid+'/room');}catch(e){}logEv('seats','Комната '+S.remote.room+' закрыта');}
  remoteOn=false;admins={};members={};S.remote=null;save();renderRemotePill();refreshRemoteModal();}
function renderRemotePill(){const el=$('#remotePill');const n=Object.keys(admins).length;el.style.display=remoteOn?'':'none';el.textContent=remoteOn?'📱 '+S.remote.room+(n?' · пульт':''):'';}
let rmOpen=false;
async function refreshRemoteModal(){if(!rmOpen||!$('#modal').classList.contains('on')||!$('#rmBody'))return;const b=$('#rmBody');
  if(!NutsNet.configured()){b.innerHTML=`<p>Пульт ещё не настроен: нужен файл <b>firebase-config.js</b> рядом с приложением.</p>`;return;}
  const gOnly=`<label class="chk"><input type="checkbox" id="rmGOnly" ${S.gOnlyRemote?'checked':''}> Пульт — только для вошедших в аккаунт</label>`;
  const tr=Object.entries(S.trustedRemotes||{}),trHtml=tr.length?`<div class="blab" style="margin-top:12px">Доверенные пульты — без подтверждения</div><div class="rlist">${tr.map(([u,v])=>`<div><span>⭐ ${esc(v.name||'Гость')}</span><button class="btn sm ghost" data-rmforget="${u}">Забыть</button></div>`).join('')}</div>`:'';
  if(!remoteOn){
    if(!NET){b.innerHTML='<p class="muted">Подключаюсь…</p>';try{NET=await NutsNet.connect();refreshAcct();}catch(e){b.innerHTML=`<p style="color:var(--red)">Нет связи с сервером: ${esc(e.message||e)}</p>`;return;}return refreshRemoteModal();}
    const W=NET.who(),er=remoteErr?`<p style="color:var(--red)">${esc(remoteErr)}</p>`:'';
    if(!W.google){b.innerHTML=`<p>Комнату для телефонов создаёт ведущий, вошедший в аккаунт. Так комната останется вашей на любом устройстве, а посторонние не смогут создавать комнаты в вашей базе.</p><p class="small muted">Гости заходят как раньше — по QR-коду и PIN, с аккаунтом или просто по имени.</p>${er}<button class="btn pri" id="rmLogin" style="width:100%">👤 Войти в аккаунт</button>`;return;}
    const hi=await hostInfo();if(!rmOpen||!$('#rmBody'))return;const whoC=`<div class="who">${NutsNet.avatar(W)}<span><b>${esc(W.name||W.email)}</b><small>${esc(W.email)}</small></span><a href="#" id="rmOut">выйти</a></div>`;
    if(rmBusy&&hi.can){b.innerHTML=whoC+`<p>⚠️ У вас уже открыта комната <b>${rmBusy}</b> на другом устройстве — там может идти игра.</p><p class="small muted">Если открыть комнату здесь, та закроется и подключённые телефоны отвалятся.</p>
      <div class="col" style="display:flex;flex-direction:column;gap:8px"><button class="btn pri" id="rmAsRemote" data-room="${rmBusy}">🎮 Управлять той комнатой отсюда</button><button class="btn" id="rmMove" data-room="${rmBusy}">⤵ Перенести вечер сюда</button><button class="btn red" id="rmForce">Закрыть её и открыть здесь</button><button class="btn ghost" id="rmBusyNo">Отмена</button></div>`;return;}
    if(!hi.can){b.innerHTML=whoC+(W.verified?`<p>Создавать комнаты для телефонов могут ведущие. Попросите владельца сайта пригласить вас по адресу <b>${esc(W.email)}</b>.</p>`:`<p>Ведущим можно быть со входом через Google или по почте: Microsoft не подтверждает адрес. Привяжите один из них в кабинете (👤).</p>`)+`<p class="small muted">Таймер на этом устройстве работает как обычно.</p>`;return;}
    b.innerHTML=whoC+`<p>Создайте комнату — на экране появятся QR-код и PIN. QR пускает сразу, а по ссылке или коду комнаты нужен PIN. Стать пультом можно только с вашего разрешения. Каждая новая комната получает новый код и PIN.</p>${gOnly}${er}<button class="btn pri" id="rmStart" style="width:100%">📡 Создать комнату</button>${trHtml}`;return;}
  const url=NutsNet.joinUrl(S.remote.room),qrUrl=url+'-'+S.remote.pin,ad=Object.entries(admins),mb=Object.entries(members).filter(([u])=>!admins[u]);
  const row=(u,v,role)=>`<div><span>${role} ${esc(v.name||'Гость')}${v.g?'<span class="gb" title="Вошёл в аккаунт">✓</span>':''}${(S.trustedRemotes||{})[u]?' ⭐':''}</span><button class="btn sm ghost red" data-rmkick="${u}">Отключить</button></div>`;
  b.innerHTML=`<div class="qrbox" id="rmQr"><div style="height:200px;display:grid;place-items:center;color:#555;font-size:13px">QR…</div></div>
    <div class="row" style="justify-content:center;gap:28px;margin-top:12px"><div><div class="blab" style="text-align:center">Комната</div><div class="rcode">${S.remote.room}</div></div><div><div class="blab" style="text-align:center">PIN</div><div class="rcode" style="color:var(--gold)">${S.remote.pin}</div></div></div>
    <p class="small" style="text-align:center;margin:8px 0 0;word-break:break-all">${esc(url)}</p>
    <div class="rlist">${ad.map(([u,v])=>row(u,v,'🎮 пульт ·')).join('')}${mb.map(([u,v])=>row(u,v,'👀')).join('')}${!ad.length&&!mb.length?'<div class="muted small">Пока никто не подключился.</div>':''}</div>
    <div class="row" style="margin-top:12px"><button class="btn sm" id="rmPin" title="Уже подключённые останутся">🔄 Новый PIN</button><button class="btn sm red" id="rmStop" title="Отключит всех. Следующая комната получит новый код и PIN">Закрыть комнату</button></div>${gOnly}${trHtml}`;
  let svg;try{svg=await NutsNet.qrSvg(qrUrl);}catch(e){svg='<div style="color:#333;font-size:13px;padding:20px;text-align:center">QR не загрузился — откройте ссылку ниже на телефоне</div>';}const qb=$('#rmQr');if(qb)qb.innerHTML=svg;}
function remoteModal(){rmOpen=true;modal(`<h3>📱 Пульт с телефона</h3><div id="rmBody"></div>`,[{t:'Готово',cls:'pri',fn:()=>{rmOpen=false;}}]);refreshRemoteModal();}
document.addEventListener('click',async e=>{const t=e.target;
  if(t.id==='rmStart'||t.id==='rmForce'){const f=t.id==='rmForce';t.disabled=true;t.textContent='Подключаюсь…';rmBusy=null;try{await hostConnect(f);}catch(err){if(err.busy)rmBusy=err.busy;else remoteErr='Не получилось подключиться: '+(err.message||err);}refreshRemoteModal();}
  else if(t.id==='rmBusyNo'){rmBusy=null;refreshRemoteModal();}
  else if(t.id==='rmAsRemote'){location.hash='#r-'+t.dataset.room;location.reload();}
  else if(t.id==='rmMove'){const rm=t.dataset.room;rmBusy=null;rmOpen=false;closeModal();enMode='cabinet';await takeOver(rm);}
  else if(t.id==='rmStop'){await hostDisconnect();toast('Комната закрыта');}
  else if(t.id==='rmPin'){S.remote.pin=pin4();save();refreshRemoteModal();}
  else if(t.dataset&&t.dataset.rmkick){kick(t.dataset.rmkick);}
  else if(t.dataset&&t.dataset.rmforget){delete trusted()[t.dataset.rmforget];save();refreshRemoteModal();}
  else if(t.id==='rmLogin'){rmOpen=false;closeModal();openEntry('welcome');}
  else if(t.id==='rmOut'){e.preventDefault();remoteErr='';try{await NET.signOut();}catch(err){}HI=null;setEntry('');refreshAcct();refreshRemoteModal();}});
document.addEventListener('change',e=>{if(e.target.id==='rmGOnly'){S.gOnlyRemote=e.target.checked;save();publishSoon();}});
$('#remoteFab').onclick=remoteModal;$('#remoteOpen').onclick=remoteModal;$('#remotePill').onclick=remoteModal;
if(S.remote&&S.remote.on&&NutsNet.configured())hostConnect().catch(e=>{if(e&&e.busy){remoteOn=false;S.remote=null;save();renderRemotePill();toast('📱 Комната '+e.busy+' уже открыта на другом устройстве — здесь не переподключаюсь');}else toast('Пульт: '+((e&&e.message)||'нет связи с сервером'));});

/* ===== Install (PWA) ===== */
function renderInstall(){const el=$('#installBox');if(!el)return;const sa=(()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone;}catch(e){return false;}})();
  if(sa){el.innerHTML='<div class="small muted">✓ Nuts запущен как приложение</div>';return;}
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  el.innerHTML=window.NUTS_INSTALL?'<button class="btn pri" id="instBtn">📲 Установить Nuts как приложение</button><div class="small muted" style="margin-top:6px">Иконка на рабочем столе, запуск без адресной строки, работает без интернета.</div>'
    :ios?'<div class="small muted">📲 Установить на iPhone: Safari → «Поделиться» → «На экран „Домой“».</div>':'<div class="small muted">📲 Установить как приложение: в Chrome или Edge — значок установки в адресной строке или меню ⋮ → «Установить Nuts».</div>';}
document.addEventListener('nuts-install',renderInstall);window.addEventListener('appinstalled',()=>{window.NUTS_INSTALL=null;renderInstall();toast('📲 Nuts установлен');});
document.addEventListener('click',async e=>{if(e.target.id==='instBtn'&&window.NUTS_INSTALL){const ev=window.NUTS_INSTALL;ev.prompt();try{await ev.userChoice;}catch(x){}window.NUTS_INSTALL=null;renderInstall();}});
renderInstall();
/* ===== SBP ===== */
const phDigits=s=>{let d=String(s||'').replace(/\D/g,'');if(d.length===11&&d[0]==='8')d='7'+d.slice(1);if(d.length===10)d='7'+d;return d;};
const phPretty=d=>d.length===11?`+${d[0]} ${d.slice(1,4)} ${d.slice(4,7)}-${d.slice(7,9)}-${d.slice(9)}`:'+'+d;
const phMask=d=>d.length===11?`+${d[0]} ${d.slice(1,4)} ••• ${d.slice(7,9)}-${d.slice(9)}`:'+'+d;
function payFor(name){const p=S.players.find(q=>q.name===name);const u=p&&p.acct&&p.acct.uid;return u&&S.payBook&&S.payBook[u]||null;}
function xferHTML(a,b,v){const py=payFor(b),d=py?phDigits(py.ph):'';
  return `<div class="xfer"><span>${esc(a)}</span><span class="arr">→</span><span>${esc(b)}</span><span class="amt">${money(v)}</span>${d?`<span class="pay">${py.b?esc(py.b)+' · ':''}<button class="btn sm ghost" data-ph="${d}" title="Скопировать номер ${phPretty(d)}">📱 ${phMask(d)} 📋</button></span>`:''}</div>`;}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-ph]');if(!b)return;const d=b.dataset.ph;try{await navigator.clipboard.writeText('+'+d);toast('📋 Номер '+phPretty(d)+' скопирован');}catch(x){toast(phPretty(d));}});
/* ===== Home (logo) ===== */
function goHome(){try{closeFin();}catch(e){}try{closeWiz();}catch(e){}try{closeEntry();}catch(e){}try{closeModal(true);}catch(e){}try{hidePop();}catch(e){}show('timer');window.scrollTo(0,0);}
$('#homeBtn').addEventListener('click',goHome);$('#homeBtn').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();goHome();}});
/* ===== Final screen ===== */
function howHTML(x,pa){const tm=isT();let h='';
  if(tm){const pc=payoutPcts(),tot=pc.reduce((a,b)=>a+b,0)||100;
    h+=`<div>Собрано всего: <b>${money(x.money)}</b> — взносов: ${x.n}${x.reb?`, докупов: ${fU(x.rebU)}`:''}${x.add?`, аддонов: ${x.add}`:''}.</div>`;
    if(S.bountyOn)h+=`<div>Баунти — ${money(S.bounty)} с каждого входа: ${x.entries}${x.freeH?` − ${x.freeH} ничейн.`:''} × ${money(S.bounty)} = <b>${money(x.bountyTot)}</b>. Выбивший забирает голову выбитого, победитель — ещё и свою.${x.freeH?' Ничейные головы вернулись в призовой фонд.':''}</div>`;
    h+=`<div>Призовой фонд: ${money(x.money)}${S.bountyOn?' − '+money(x.bountyTot)+' баунти':''} = <b>${money(x.pool)}</b>.</div>`;
    h+=`<div>Деление по местам${S.payoutsAuto?' (подобрано по числу игроков)':''}:</div><table>${pa.map((v,i)=>`<tr><td>${i+1} место</td><td class="r">${Math.round((pc[i]||0)/tot*100)}%</td><td class="r"><b>${money(v)}</b></td></tr>`).join('')}</table>`;
    h+=`<div style="margin-top:6px">Итог игрока = приз + баунти − вложил.</div>`;}
  else{const r=rate();h+=`<div>Курс: ${money(S.buyin)} = ${fmt(S.startStack)} фишек, то есть 1 фишка = <b>${(+r.toFixed(3)).toLocaleString('ru-RU')} ${esc(S.currency)}</b>.</div><div>Выдано фишек: <b>${fmt(x.chips)}</b> на <b>${money(x.money)}</b> — взносов: ${x.n}${x.reb?`, докупов: ${x.reb}`:''}.</div><div>Итог игрока = фишки в конце × курс − вложил. Переводы подобраны так, чтобы платежей было как можно меньше.</div>`;}
  return `<details class="how"><summary>🧮 Как посчитано</summary><div class="hw">${h}</div></details>`;}
function finReady(x,R){if(!S.players.length)return false;if(isT())return x.inP<=1;return !R.some(o=>o.chips==null)&&R.reduce((a,o)=>a+(o.chips||0),0)===x.chips;}
function finEl(){let el=$('#fin');if(!el){el=document.createElement('div');el.id='fin';document.body.appendChild(el);el.addEventListener('click',finClick);}return el;}
function closeFin(){const el=$('#fin');if(el){el.className='';el.innerHTML='';}}
function openFin(){if(!S.players.length)return;renderFin();}
function renderFin(){const el=finEl(),x=totals(),pa=isT()?payouts(x.pool):[],R=nets(x,pa),ok=finReady(x,R),tm=isT();el.className='on';
  const d=new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
  const ord=tm?[...R].sort((a,b)=>(a.p.place||99)-(b.p.place||99)):[...R].sort((a,b)=>(b.net??-1e15)-(a.net??-1e15));
  const val=o=>o.net==null?'—':sgn(o.net),det=o=>(tm?[o.win?'приз '+money(o.win):'',o.bnt?'баунти '+money(o.bnt):'','вложил '+money(o.inv)]:[o.chips!=null?fmt(o.chips)+' фишек':'','вложил '+money(o.inv)]).filter(Boolean).join(' · ');
  const cls=o=>{const v=tm?o.net:o.net;return v>0?'pos':v<0?'neg':'';};
  const M=['🥇','🥈','🥉'];
  const pod=ok?ord.slice(0,Math.min(3,ord.length)):[];
  let h=`<div class="en-box wide fin-box"><button class="en-x" data-fin="close" title="Закрыть">✕</button>
    <div class="fin-h"><div class="brand en-brand"><i>♠</i>Итоги вечера</div>
    <div class="muted small">${esc(S.name||'Покерный вечер')} · ${d} · ${T().startedAt!=null?fmtHM(clockElapsed())+' игры · ':''}${S.players.length} игроков · ${tm?'призовой фонд':'банк'} ${money(tm?x.pool:x.money)}</div></div>`;
  if(!ok)h+=`<div class="fin-warn">${tm?'⏳ Турнир ещё идёт — победитель не определился. Ниже предварительные места.':`🧮 Не все фишки посчитаны или сумма не сходится с выданной (${fmt(x.chips)}). Расчёт будет точным после подсчёта.`}<button class="btn sm" data-fin="count">${tm?'К игрокам':'Посчитать фишки'}</button></div>`;
  if(pod.length)h+=`<div class="podium">${pod.map((o,i)=>`<div class="pd p${i+1}"><div class="md">${M[i]}</div><div class="nm">${esc(o.p.name)}</div><div class="vl ${cls(o)}">${val(o)}</div><span class="dt">${det(o)}</span></div>`).join('')}</div>`;
  const rest=ok?ord.slice(pod.length):ord;
  if(rest.length)h+=`<div class="fin-list">${rest.map((o,i)=>`<div><span class="fpl">${ok?pod.length+i+1:(tm&&o.p.place?o.p.place:'·')}</span><span class="fnm">${esc(o.p.name)}<small>${det(o)}${o.p.rebuys?' · докупов: '+fU(rbU(o.p)):''}</small></span><span class="fvl ${cls(o)}">${val(o)}</span></div>`).join('')}</div>`;
  const F=[],fo=S.players.filter(p=>p.outAt).sort((a,b)=>a.outAt-b.outAt)[0];
  const lead=(key,lbl,icon)=>{const gv=p=>key==='rebuys'?rbU(p):(p[key]||0);const mx=Math.max(0,...S.players.map(gv));if(!mx)return;const L=S.players.filter(p=>gv(p)===mx);if(mx===1&&L.length>2)return;
    F.push([icon,lbl,(L.length>3?L.slice(0,3).map(p=>p.name).join(', ')+' и ещё '+(L.length-3):L.map(p=>p.name).join(', '))+' · '+(L.length>1?'по '+fU(mx):fU(mx))]);};
  lead('rebuys','Чаще всех докупался','💸');lead('knocks','Выбил больше всех','🎯');if(fo&&S.players.length>2)F.push(['🚪','Первым вылетел',fo.name]);
  const reb=S.players.reduce((a,p)=>a+rbU(p),0);F.push(['🔁','Докупов за вечер',fU(reb)]);
  h+=`<div class="fin-facts">${F.map(([i,a,b])=>`<div><span>${i}</span><small>${a}</small><b>${esc(b)}</b></div>`).join('')}</div>`;
  h+=howHTML(x,pa);
  {const lg=S.log.filter(e=>!e.undone);if(lg.length)h+=`<details class="how"><summary>🕓 Хронология вечера (${lg.length})</summary><div class="hw" style="max-height:340px;overflow:auto">${logHTML(S.log)}</div></details>`;}
  if(ok){const tr=transfers(R.filter(o=>o.net!=null));h+=`<div class="blab" style="margin-top:14px">💸 Кто кому переводит</div>${tr.length?tr.map(([a,b,v])=>`${xferHTML(a,b,v)}`).join(''):'<div class="muted">Все при своих.</div>'}`;}
  h+=`<div class="wz-nav" style="flex-wrap:wrap"><button class="btn" data-fin="copy">📋 Скопировать</button>${navigator.share?'<button class="btn" data-fin="share">📤 Поделиться</button>':''}<span class="sp"></span><button class="btn red" data-fin="end">🏁 Завершить вечер</button></div>
    <div class="small muted" style="margin-top:8px">«Завершить вечер» сохранит итоги в историю${S.players.some(p=>p.acct)?', отправит результаты в фишках в кабинеты привязанных игроков':''} и очистит стол для новой игры.</div></div>`;
  el.innerHTML=h;}
async function finClick(e){const b=e.target.closest('[data-fin]');if(!b)return;const a=b.dataset.fin;
  if(a==='close')return closeFin();
  if(a==='count'){closeFin();show(isT()?'players':'results');return;}
  if(a==='copy'){try{await navigator.clipboard.writeText(resultsText());toast('📋 Итоги скопированы');}catch(x){toast('Не получилось скопировать');}return;}
  if(a==='share'){try{await navigator.share({title:'Итоги: '+(S.name||'Покерный вечер'),text:resultsText()});}catch(x){}return;}
  if(a==='end'){closeFin();newGame();show('timer');}}
document.addEventListener('click',e=>{if(e.target.closest('[data-final]'))openFin();});

/* ===== Wizard & templates ===== */
const plu=(n,a,b,c)=>{const m=Math.abs(n)%100,d=m%10;return m>10&&m<20?c:d>1&&d<5?b:d===1?a:c;};
const TPL_KEYS=['mode','name','buyin','startStack','maxRebuys','rebuyUntil','lateRegUntil','rebuyWhen','halfRebuy','addonOn','bountyOn','bounty','payoutsAuto','payouts'];
const PACE_N={hyper:'Гипертурбо',turbo:'Турбо',standard:'Стандарт',deep:'Медленный',slow:'Слоуролл'};
const curCfg=()=>{const c={};TPL_KEYS.forEach(k=>c[k]=JSON.parse(JSON.stringify(S[k]===undefined?null:S[k])));c.gen=Object.assign({},S.gen);return c;};
const isFresh=()=>!S.players.length&&T().startedAt==null;
const noWiz=()=>{try{return !!localStorage.getItem('nuts.nowiz');}catch(e){return false;}};
const paceGen=k=>{const P=PACES[k]||PACES.standard;const{n,...r}=P;return r;};
let WZ=null;
function wizEl(){let el=$('#wiz');if(!el){el=document.createElement('div');el.id='wiz';document.body.appendChild(el);el.addEventListener('click',wizClick);el.addEventListener('change',e=>{if(e.target.id==='wTpl'){wizRead();renderWiz();setTimeout(()=>{const i=$('#wTplN');if(i)i.focus();},20);}});el.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='wAdd'){e.preventDefault();wizAddNames();}});}return el;}
function closeWiz(){WZ=null;const el=$('#wiz');if(el){el.className='';el.innerHTML='';}}
function openWiz(opt){opt=opt||{};
  const go=()=>{const c=curCfg();WZ={step:(S.templates||[]).length&&!opt.tpl?0:1,cfg:c,names:[],accs:{},hours:c.gen.hours||3,pace:c.gen.pace||'standard',ante:c.gen.ante||'none',saveTpl:false,tplName:'',err:''};if(opt.tpl)wizUseTpl(opt.tpl);renderWiz();};
  if(!isFresh())return confirmB('Новый вечер?','Текущий вечер завершится и сохранится в историю, затем откроется мастер.',()=>{newGame();setTimeout(go,30);},'Завершить и продолжить');
  go();}
function wizUseTpl(t){WZ.cfg=Object.assign(curCfg(),JSON.parse(JSON.stringify(t.cfg||{})));WZ.cfg.gen=Object.assign({},S.gen,(t.cfg||{}).gen||{});WZ.names=(t.players||[]).slice();
  WZ.hours=WZ.cfg.gen.hours||3;WZ.pace=WZ.cfg.gen.pace||'standard';WZ.ante=WZ.cfg.gen.ante||'none';WZ.tplName=t.name;WZ.step=3;}
function wzMap(){const m={},used=new Set();let acc=[];try{acc=roomAccts();}catch(e){}
  WZ.names.forEach(n=>{const lo=n.toLowerCase();let a=Object.values(WZ.accs).find(z=>z.pn===n)||null;
    if(!a){const ra=(S.rosterAcct||{})[lo];if(ra)a={uid:ra.uid,name:ra.name};}
    if(!a){const f=acc.find(z=>z.name.toLowerCase()===lo);if(f)a={uid:f.uid,name:f.name};}
    if(a&&!used.has(a.uid)){used.add(a.uid);m[n]={uid:a.uid,name:a.name};}});return m;}
function wizRead(){if(!WZ)return;const v=id=>{const e=$('#'+id);return e?e.value:null;},c=WZ.cfg;
  if(v('wName')!=null)c.name=v('wName').trim().slice(0,60)||'Покерный вечер';
  if(v('wBuy')!=null)c.buyin=Math.max(0,Math.round(+v('wBuy')||0));if(v('wStack')!=null)c.startStack=Math.max(0,Math.round(+v('wStack')||0));
  if(v('wWhen')!=null)c.rebuyWhen=v('wWhen');if(v('wMax')!=null)c.maxRebuys=Math.max(0,Math.round(+v('wMax')||0));
  const ck=id=>{const e=$('#'+id);return e?e.checked:null;};
  if(ck('wHalf')!=null)c.halfRebuy=ck('wHalf');if(ck('wBnt')!=null)c.bountyOn=ck('wBnt');if(v('wBntV')!=null)c.bounty=Math.max(0,Math.round(+v('wBntV')||0));if(ck('wAddon')!=null)c.addonOn=ck('wAddon');
  if(v('wHours')!=null)WZ.hours=Math.min(24,Math.max(.5,+v('wHours')||WZ.hours));
  if(ck('wTpl')!=null)WZ.saveTpl=ck('wTpl');if(v('wTplN')!=null)WZ.tplName=v('wTplN').trim().slice(0,40);}
function wizPreview(){const keep={gen:S.gen,startStack:S.startStack};let L=[];
  try{S.gen=Object.assign({},S.gen,WZ.cfg.gen,paceGen(WZ.pace),{hours:WZ.hours,ante:WZ.ante,players:Math.max(2,WZ.names.length||S.gen.players)});S.startStack=WZ.cfg.startStack||S.startStack;L=generate()||[];}catch(e){}finally{S.gen=keep.gen;S.startStack=keep.startStack;}
  const lv=L.filter(l=>l.type==='level'),br=L.filter(l=>l.type==='break');if(!lv.length)return '';
  const mins=lv.map(l=>l.min),a=lv[0],z=lv[lv.length-1],mn=Math.min(...mins),mx=Math.max(...mins);
  return `<div class="wz-prev">📋 <b>${lv.length} уровней</b> по ${mn===mx?mn:mn+'–'+mx} мин${br.length?`, перерывов: ${br.length}`:''}<br>Блайнды: от <b>${fmt(a.sb)} / ${fmt(a.bb)}</b> до <b>${fmt(z.sb)} / ${fmt(z.bb)}</b>${WZ.ante!=='none'?`<br>Анте: ${WZ.ante==='bba'?'большого блайнда':'классическое'} с ${S.gen.anteFrom||4} уровня`:''}<br><span class="muted">Стартовый стек — ${fmt(WZ.cfg.startStack)} фишек, это ${Math.round(WZ.cfg.startStack/(a.bb||1))} больших блайндов.</span></div>`;}
function wizAddNames(){const i=$('#wAdd');if(!i)return;i.value.split(',').map(x=>x.trim().slice(0,30)).filter(Boolean).forEach(n=>{if(!WZ.names.some(m=>m.toLowerCase()===n.toLowerCase()))WZ.names.push(n);});i.value='';wizRead();renderWiz();setTimeout(()=>{const j=$('#wAdd');if(j)j.focus();},20);}
function renderWiz(){if(!WZ)return;const el=wizEl(),c=WZ.cfg,st=WZ.step,T_=c.mode==='tournament';el.className='on';
  const top=`<div class="wz-top"><span class="st">${st===0?'Шаблоны':'Шаг '+st+' из 4'}</span><div class="wz-dots">${[1,2,3,4].map(i=>`<i class="${i<=st?'on':''}"></i>`).join('')}</div></div><button class="en-x" data-w="close" title="Закрыть">✕</button>`;
  const er=WZ.err?`<p class="en-err">${esc(WZ.err)}</p>`:'';let h='';
  if(st===0){h=`<div class="wz-h">Как играем сегодня?</div>`+(S.templates||[]).map(t=>{const g=(t.cfg||{}).gen||{};return`<div class="tplc"><span class="tn"><b>${esc(t.name)}</b><small>${t.cfg.mode==='tournament'?'Турнир':'Кэш'} · ${fmt(t.cfg.buyin)} ${esc(S.currency)} = ${fmt(t.cfg.startStack)} фиш. · ${g.hours||'?'} ч · ${PACE_N[g.pace]||'своя структура'}${(t.players||[]).length?' · игроков: '+t.players.length:''}</small></span><button class="btn sm pri" data-wt="${t.id}">Выбрать</button><button class="btn sm ghost" data-wtdel="${t.id}" title="Удалить шаблон">✕</button></div>`;}).join('')+
      `<button class="btn" data-w="scratch" style="width:100%;margin-top:6px">＋ Настроить заново</button>`;}
  else if(st===1){h=`<div class="wz-h">Формат</div><div class="wcards">
      <button class="wcard ${!T_?'on':''}" data-wm="cash"><b>💵 Кэш</b><small>Фишки — это деньги. Блайнды растут по таймеру, докупаться можно по правилам. В конце считаете фишки, и приложение скажет, кто кому переводит.</small></button>
      <button class="wcard ${T_?'on':''}" data-wm="tournament"><b>🏆 Турнир</b><small>Играем до одного победителя. Банк делят призовые места, можно с баунти за выбитых.</small></button></div>
      <label class="f">Название вечера<input id="wName" value="${esc(c.name||'Покерный вечер')}" maxlength="60"></label>`;}
  else if(st===2){const E=Math.max(2,WZ.names.length||S.gen.players)+Math.max(2,Math.round(Math.max(2,WZ.names.length||S.gen.players)*.6));let sg=null;try{sg=suggestStack(E);}catch(e){}
    h=`<div class="wz-h">Взносы и фишки</div><div class="wz-g2"><label class="f">Взнос, ${esc(S.currency)}<input id="wBuy" type="number" min="0" value="${c.buyin}"></label><label class="f">Фишек на старте<input id="wStack" type="number" min="0" step="100" value="${c.startStack}"></label></div>
      <div class="small muted" style="margin:2px 0 12px">Курс: ${fmt(c.buyin)} ${esc(S.currency)} = ${fmt(c.startStack)} фишек</div>
      ${sg&&sg.s&&sg.s!==c.startStack?`<div class="wz-tip"><span>💡 По вашим фишкам на ${E} ${plu(E,'стек','стека','стеков')} подходит старт <b>${fmt(sg.s)}</b> фишек</span><button class="btn sm" data-wstack="${sg.s}">Взять</button></div>`:''}
      <div class="wz-g2"><label class="f">Когда можно докупиться<select id="wWhen"><option value="bust" ${c.rebuyWhen==='bust'?'selected':''}>Только после вылета</option><option value="short" ${c.rebuyWhen==='short'?'selected':''}>Если стек не больше стартового</option><option value="any" ${c.rebuyWhen==='any'?'selected':''}>В любой момент</option></select></label>
      <label class="f">Докупов на игрока<input id="wMax" type="number" min="0" value="${c.maxRebuys||0}"><small class="fh">0 — без ограничений</small></label></div>
      <label class="chk"><input type="checkbox" id="wHalf" ${c.halfRebuy?'checked':''}> Можно докупаться на половину стека</label>
      ${T_?`<label class="chk"><input type="checkbox" id="wBnt" ${c.bountyOn?'checked':''}> Баунти за выбитого <input id="wBntV" type="number" min="0" value="${c.bounty||0}" style="width:90px;margin-left:6px"> ${esc(S.currency)}</label><label class="chk"><input type="checkbox" id="wAddon" ${c.addonOn?'checked':''}> Аддон (одна докупка на всех в перерыве)</label>`:''}
      <div class="small muted">Докуп стоит как взнос и даёт столько же фишек. Тонкие настройки — потом во вкладке «Настройки».</div>`;}
  else if(st===3){const have=new Set(WZ.names.map(n=>n.toLowerCase())),rs=(S.roster||[]).filter(n=>!have.has(n.toLowerCase()));let acc=[];try{acc=roomAccts();}catch(e){}const M=wzMap(),mu=new Set(Object.values(M).map(z=>z.uid));acc=acc.filter(a=>!WZ.accs[a.uid]&&!mu.has(a.uid));
    h=`<div class="wz-h">Кто играет?</div><div class="row" style="flex-wrap:nowrap"><input id="wAdd" placeholder="Имя или несколько через запятую" autocomplete="off" style="flex:1;min-width:0"><button class="btn pri" data-w="add">Добавить</button></div>
      <div class="wz-sel">${WZ.names.length?WZ.names.map(n=>`<span class="wz-pill">${esc(n)}${M[n]?' 🔗':''}<button data-wx="${esc(n)}" title="Убрать">✕</button></span>`).join(''):'<span class="muted small">Пока никого — можно добавить и позже.</span>'}</div>
      ${rs.length?`<div class="hint">Сохранённые игроки:</div><div class="wz-sel">${rs.map(n=>`<span class="rchip" data-wr="${esc(n)}">＋ ${esc(n)}${(S.rosterAcct||{})[n.toLowerCase()]?' 🔗':''}</span>`).join('')}<span class="rchip" data-w="allr" style="border-style:solid">Все</span></div>`:''}
      ${acc.length?`<div class="hint">🔗 Аккаунты${remoteOn?' в комнате':''}:</div><div class="wz-sel">${acc.map(a=>`<span class="rchip acc" data-wa="${esc(a.uid)}">＋ ${esc(a.name)}${a.self?' (вы)':''}</span>`).join('')}</div>`:''}
      <div class="small muted">Игроков: <b>${WZ.names.length}</b>${WZ.names.length?` · банк на старте ${fmt(WZ.names.length*c.buyin)} ${esc(S.currency)}`:''}</div>`;}
  else if(st===4){h=`<div class="wz-h">Сколько играем?</div><div class="pacec" style="margin-bottom:10px">${[2,3,4,5,6].map(x=>`<button class="btn sm ${WZ.hours==x?'pri':''}" data-wh="${x}">${x} ч</button>`).join('')}<label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted)">или <input id="wHours" type="number" step="0.5" min="0.5" value="${WZ.hours}" style="width:70px"> ч</label></div>
      <div class="hint">Темп:</div><div class="pacec">${Object.keys(PACE_N).map(k=>`<button class="btn sm ${WZ.pace===k?'pri':''}" data-wp="${k}">${PACE_N[k]}</button>`).join('')}</div>
      <div class="small muted" style="margin-top:6px">${esc((PACES[WZ.pace]||{}).n||'')}</div>
      <div class="hint" style="margin-top:12px">Анте:</div><div class="pacec">${[['none','Без анте'],['classic','Классическое'],['bba','Анте большого блайнда']].map(([k,t])=>`<button class="btn sm ${WZ.ante===k?'pri':''}" data-wan="${k}">${t}</button>`).join('')}</div>${wizPreview()}
      <div class="en-sec"><label class="chk"><input type="checkbox" id="wTpl" ${WZ.saveTpl?'checked':''}> Сохранить как шаблон</label>${WZ.saveTpl?`<input id="wTplN" placeholder="Например, Наш кэш по пятницам" value="${esc(WZ.tplName||'')}" maxlength="40" style="width:100%">`:''}</div>`;}
  const nav=st===0?'':`<div class="wz-nav">${st>1||(S.templates||[]).length?`<button class="btn ghost" data-w="back">← Назад</button>`:''}<span class="sp"></span>${st<4?`<button class="btn pri" data-w="next">Дальше →</button>`:`<button class="btn" data-w="done">Готово</button><button class="btn pri" data-w="start" ${WZ.names.length?'':'disabled title="Добавьте игроков"'}>▶ Начать вечер</button>`}</div>`;
  el.innerHTML=`<div class="en-box wide">${top}${er}${h}${nav}</div>`;}
function wizClick(e){const b=e.target.closest('button,[data-wr],[data-wa],[data-wm]');if(!b||!WZ)return;wizRead();WZ.err='';const d=b.dataset;
  if(d.w==='close')return closeWiz();
  if(d.w==='scratch'){WZ.step=1;return renderWiz();}
  if(d.wt){const t=(S.templates||[]).find(x=>String(x.id)===d.wt);if(t)wizUseTpl(t);return renderWiz();}
  if(d.wtdel){S.templates=(S.templates||[]).filter(x=>String(x.id)!==d.wtdel);save();render();if(!S.templates.length)WZ.step=1;return renderWiz();}
  if(d.wm){WZ.cfg.mode=d.wm;return renderWiz();}
  if(d.wstack){WZ.cfg.startStack=+d.wstack;return renderWiz();}
  if(d.w==='add')return wizAddNames();
  if(d.wx!==undefined){WZ.names=WZ.names.filter(n=>n!==d.wx);Object.keys(WZ.accs).forEach(u=>{if(WZ.accs[u].pn===d.wx)delete WZ.accs[u];});return renderWiz();}
  if(d.wr!==undefined){if(!WZ.names.includes(d.wr))WZ.names.push(d.wr);return renderWiz();}
  if(d.w==='allr'){const have=new Set(WZ.names.map(n=>n.toLowerCase()));(S.roster||[]).forEach(n=>{if(!have.has(n.toLowerCase()))WZ.names.push(n);});return renderWiz();}
  if(d.wa){let acc=[];try{acc=roomAccts();}catch(x){}const a=acc.find(z=>z.uid===d.wa);if(a){let nm=a.name;if(WZ.names.some(n=>n.toLowerCase()===nm.toLowerCase())&&!Object.values(WZ.accs).some(z=>z.pn.toLowerCase()===nm.toLowerCase())){/* bind existing name */}else if(WZ.names.some(n=>n.toLowerCase()===nm.toLowerCase())){let i=2;while(WZ.names.some(n=>n.toLowerCase()===(a.name+' '+i).toLowerCase()))i++;nm=a.name+' '+i;}
    if(!WZ.names.some(n=>n.toLowerCase()===nm.toLowerCase()))WZ.names.push(nm);WZ.accs[a.uid]={uid:a.uid,name:a.name,pn:WZ.names.find(n=>n.toLowerCase()===nm.toLowerCase())};}return renderWiz();}
  if(d.wh){WZ.hours=+d.wh;return renderWiz();}
  if(d.wp){WZ.pace=d.wp;return renderWiz();}
  if(d.wan){WZ.ante=d.wan;return renderWiz();}
  if(e.target.id==='wTpl'){return renderWiz();}
  if(d.w==='back'){WZ.step=Math.max((S.templates||[]).length?0:1,WZ.step-1);return renderWiz();}
  if(d.w==='next'){if(WZ.step===2&&(!WZ.cfg.buyin||!WZ.cfg.startStack)){WZ.err='Укажите взнос и количество фишек на старте';return renderWiz();}
    if(WZ.step===2&&WZ.cfg.mode==='tournament')WZ.cfg.payoutsAuto=true;WZ.step++;return renderWiz();}
  if(d.w==='done'||d.w==='start')return wizFinish(d.w==='start');}
function saveTpl(name,players){name=String(name||S.name||'Шаблон').trim().slice(0,40)||'Шаблон';S.templates=S.templates||[];const ex=S.templates.find(t=>t.name.toLowerCase()===name.toLowerCase());
  const t={id:ex?ex.id:Date.now(),name,cfg:curCfg(),players:(players||[]).slice(0,30)};if(ex)Object.assign(ex,t);else S.templates.unshift(t);S.templates=S.templates.slice(0,12);return t;}
function wizFinish(startNow){const c=WZ.cfg;TPL_KEYS.forEach(k=>{if(k in c&&c[k]!==null)S[k]=c[k];});
  S.rebuyCost=S.buyin;S.rebuyStack=S.startStack;S.addonCost=S.buyin;S.addonStack=S.startStack;
  const np=Math.max(2,WZ.names.length||S.gen.players);S.gen=Object.assign({},S.gen,paceGen(WZ.pace),{hours:WZ.hours,pace:WZ.pace,ante:WZ.ante,players:np,rebuys:Math.round(np*.6)});
  S.levels=generate();S.timer=freshTimer();S.wizDone=true;
  if(WZ.saveTpl)saveTpl(WZ.tplName||S.name,WZ.names);
  const names=WZ.names.slice(),MAP=wzMap();
  if(names.length)addPlayersNow(names);
  names.forEach(n=>{const a=MAP[n],p=S.players.find(q=>q.name===n);if(a&&p&&!(p.acct&&p.acct.uid===a.uid))setAcct(p,a);});
  closeWiz();save();loadSettings();show('timer');render();
  if(startNow&&S.players.length)start();toast(startNow?'▶ Поехали!':'Вечер настроен — жмите «Старт», когда будете готовы');}
function renderTpl(){const el=$('#tplList');if(!el)return;const L=S.templates||[];
  el.innerHTML=L.length?L.map(t=>`<div class="tplc"><span class="tn"><b>${esc(t.name)}</b><small>${t.cfg.mode==='tournament'?'Турнир':'Кэш'} · ${fmt(t.cfg.buyin)} ${esc(S.currency)} = ${fmt(t.cfg.startStack)} фиш. · ${(t.cfg.gen||{}).hours||'?'} ч${(t.players||[]).length?' · игроков: '+t.players.length:''}</small></span><button class="btn sm pri" data-tpluse="${t.id}">Новый вечер</button><button class="btn sm ghost" data-tpldel="${t.id}" title="Удалить">✕</button></div>`).join(''):'<div class="muted small">Шаблонов пока нет.</div>';}
document.addEventListener('click',e=>{const w=e.target.closest('[data-wiz]');if(w){openWiz();return;}
  const u=e.target.closest('[data-tpluse]');if(u){const t=(S.templates||[]).find(x=>String(x.id)===u.dataset.tpluse);if(t)openWiz({tpl:t});return;}
  const dl=e.target.closest('[data-tpldel]');if(dl){const t=(S.templates||[]).find(x=>String(x.id)===dl.dataset.tpldel);if(t)confirmB('Удалить шаблон?','«'+esc(t.name)+'» будет удалён.',()=>{S.templates=S.templates.filter(x=>x!==t);save();render();},'Удалить','red');}});
$('#tplSave').onclick=()=>{modal(`<h3>💾 Сохранить как шаблон</h3><p>Запомним формат, взносы, правила докупа, длительность и темп${S.players.length?', а также текущий состав игроков':''}.</p><input id="tplN" placeholder="Например, Наш кэш по пятницам" value="${esc(S.name||'')}" maxlength="40" style="width:100%">`,
  [{t:'Отмена'},{t:'Сохранить',cls:'pri',fn:()=>{const n=($('#tplN')||{}).value;saveTpl(n,S.players.map(p=>p.name));save();render();toast('Шаблон сохранён');}}]);setTimeout(()=>{const i=$('#tplN');if(i){i.focus();i.select();}},50);};

/* ===== Entry & cabinet ===== */
const ENTRY='nuts.entry';function getEntry(){try{return localStorage.getItem(ENTRY)||'';}catch(e){return'';}}function setEntry(v){try{v?localStorage.setItem(ENTRY,v):localStorage.removeItem(ENTRY);}catch(e){}}
let EVC={},evSel=null,evMore=false,evUndo=null,PAYC=null,payDr=null;
const BANKS=['Сбер','Т‑Банк','Альфа','ВТБ'];
const phFmt=v=>{let d=String(v||'').replace(/\D/g,'');if(d[0]==='8')d='7'+d.slice(1);if(d&&d[0]!=='7')d='7'+d;d=d.slice(0,11);const p=[d.slice(0,1),d.slice(1,4),d.slice(4,7),d.slice(7,9),d.slice(9,11)];return d?('+'+p[0]+(p[1]?' ('+p[1]:'')+(p[1].length===3?')':'')+(p[2]?' '+p[2]:'')+(p[3]?'-'+p[3]:'')+(p[4]?'-'+p[4]:'')):'';};
let enMode='',enErr='',enBusy=false,profSaved=false,enMail={open:false,sent:'',mode:'signin',val:''};
function entryEl(){let el=$('#entry');if(!el){el=document.createElement('div');el.id='entry';document.body.appendChild(el);el.addEventListener('click',entryClick);
  el.addEventListener('input',e=>{if(e.target.id==='payPh'){const v=phFmt(e.target.value);if(v!==e.target.value)e.target.value=v;}});
  el.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='enCode')joinByCode();if(e.key==='Enter'&&e.target.id==='authEmail')sendMail();if(e.key==='Enter'&&e.target.id==='enHost')$('#enAdd').click();});}return el;}
function closeEntry(){enMode='';enErr='';const el=$('#entry');if(el){el.className='';el.innerHTML='';}}
function openEntry(m){enMode=m;enErr='';evSel=null;evMore=false;PAYC=null;payDr=null;enMail={open:false,sent:'',mode:'signin',val:''};renderEntry();}
const codeBox=()=>`<div class="en-join"><div class="blab">Подключиться к игре</div><div class="row" style="flex-wrap:nowrap"><input id="enCode" maxlength="4" placeholder="Код комнаты" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.2em"><button class="btn" id="enJoin">Войти</button></div><div class="small muted" style="margin-top:6px">Код показан на экране игры рядом с QR</div></div>`;
async function renderEntry(){const el=entryEl(),m=enMode;if(!m)return closeEntry();el.className='on';
  const x=`<button class="en-x" id="enClose" title="К таймеру">✕</button>`,er=enErr?`<p class="en-err">${esc(enErr)}</p>`:'',ft=`<div class="en-foot">♠ Nuts v${window.NUTS_VER} · by MichaelKae</div>`;
  if(m==='welcome'){el.innerHTML=`<div class="en-box">${x}<div class="brand en-brand"><i>♠</i>Nuts</div><p class="en-tag">Покерный таймер и учёт домашнего вечера</p>${er}
    ${NutsNet.authBtns({busy:enBusy,emailOpen:enMail.open&&enMail.mode==='signin',sent:enMail.mode==='signin'?enMail.sent:'',emailVal:enMail.val})}<div class="small muted en-cap">Личный кабинет и история ваших вечеров</div>
    <div class="orline">или</div>
    <button class="btn en-big ghost" id="enGuest">Продолжить как гость</button><div class="small muted en-cap">Таймер на этом устройстве, без регистрации</div>
    <div class="en-sec">${codeBox()}</div>${ft}</div>`;return;}
  if(!el.querySelector('.en-box.wide'))el.innerHTML=`<div class="en-box">${x}<div class="muted" style="text-align:center;padding:20px">Загружаю кабинет…</div></div>`;
  let hi;try{hi=await hostInfo(true);}catch(e){enErr='Нет связи с сервером: '+(e.message||e);enMode='welcome';return renderEntry();}
  if(enMode!=='cabinet')return;if(!hi.w.google){enMode='welcome';return renderEntry();}
  if(evSel&&EVC[evSel]){el.innerHTML=evDetail(EVC[evSel]);return;}evSel=null;
  const W=hi.w;if(!profSaved){profSaved=true;const pr={name:String(W.name||W.email||'').slice(0,60),at:NET.now()};if(/^https:\/\//.test(W.photo||''))pr.photo=W.photo.slice(0,400);NET.set('users/'+NET.uid+'/profile',pr).catch(()=>{});}
  const act=hi.can?await activeRoom():null;if(enMode!=='cabinet')return;
  const actH=act?(remoteOn&&S.remote&&S.remote.room===act?`<div class="en-live">🟢 Комната <b>${act}</b> открыта на этом устройстве</div>`:
    `<div class="en-live">🟢 Идёт вечер · комната <b>${act}</b> открыта на другом устройстве<button class="btn pri" id="enRemote" data-room="${act}" style="width:100%;margin-top:10px">🎮 Открыть как пульт</button><button class="btn" id="enMove" data-room="${act}" style="width:100%;margin-top:8px">⤵ Перенести вечер сюда</button><div class="small muted" style="margin-top:6px">Перенос — если то устройство садится или нужно сменить экран: вечер продолжится здесь, телефоны останутся подключены.</div></div>`):'';
  let h=`<div class="en-box wide">${x}<div class="who">${NutsNet.avatar(W)}<span><b>${esc(W.name||W.email)}</b><small>${esc(W.email)}</small></span></div>${er}${actH}
    <button class="btn ${act&&!(remoteOn&&S.remote&&S.remote.room===act)?'':'pri'} en-big" id="enStart">${T().startedAt!=null?'▶ Вернуться к вечеру':'▶ Начать вечер'}</button>
    <div class="small muted en-cap">${hi.can?'Вы ведущий: в таймере можно открыть комнату и управлять игрой с телефона.':'Таймер работает. Чтобы подключать телефоны к своему вечеру, нужно приглашение владельца сайта.'}</div>
    ${codeBox()}
    <div class="en-sec"><div class="blab">Мои вечера</div>${await evHTML()}</div>`;
  {if(PAYC===null){try{PAYC=(await NET.get('users/'+NET.uid+'/pay'))||{};}catch(e){PAYC={};}}if(enMode!=='cabinet')return;
    if(!payDr)payDr={ph:PAYC.ph||'',bank:PAYC.bank||'',share:PAYC.share!==false,other:!!(PAYC.bank&&!BANKS.includes(PAYC.bank))};
    const D=payDr;h+=`<div class="en-sec"><div class="blab">Реквизиты для переводов</div><div class="small muted" style="margin-bottom:8px">Необязательно. Номер увидит только ведущий комнаты, в которую вы входите, — в «Кто кому переводит». В облаке он лежит в вашем закрытом профиле.</div>
      <label class="f">Телефон для СБП<input id="payPh" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" value="${esc(phFmt(D.ph))}"></label>
      <div class="wz-sel">${BANKS.map(b=>`<span class="rchip ${!D.other&&D.bank===b?'on':''}" data-bank="${b}">${b}</span>`).join('')}<span class="rchip ${D.other?'on':''}" data-bank="__other">Другой…</span></div>
      ${D.other?`<input id="payBankO" placeholder="Название банка" maxlength="40" value="${esc(D.bank||'')}" style="margin-bottom:8px">`:''}
      <label class="chk"><input type="checkbox" id="payShare" ${D.share?'checked':''}> Передавать ведущему, когда я в комнате</label>
      <div class="row"><button class="btn sm pri" id="paySave">Сохранить</button>${PAYC.ph?'<button class="btn sm ghost red" id="payDel">Удалить реквизиты</button>':''}</div></div>`;}
  {const P=NutsNet.prov(),mine=W.providers||[],n=mine.length;
    h+=`<div class="en-sec"><div class="blab">Способы входа</div><div class="provlist">`+P.map(k=>{const pid=NutsNet.PID[k],has=mine.find(x=>x.id===pid);
      return `<div>${NutsNet.PICON[pid]}<span class="pnm">${NutsNet.PNAME[pid]}${has?`<small>${esc(has.email||'привязан')}</small>`:''}</span>${has?(n>1?`<button class="btn sm ghost" data-unlink="${pid}">Отвязать</button>`:'<span class="small muted">✓</span>'):`<button class="btn sm" data-link="${k}" ${enBusy?'disabled':''}>${enBusy===k?'…':'Привязать'}</button>`}</div>`;}).join('')+`</div>`+
      (enMail.mode==='link'?NutsNet.mailBox({emailOpen:enMail.open,sent:enMail.sent,emailVal:enMail.val,busy:enBusy}):'')+
      `<div class="small muted" style="margin-top:6px">Входите любым привязанным способом — попадёте в этот же кабинет.</div></div>`;}
  if(hi.admin){const hs=Object.entries(hi.hosts||{});
    h+=`<div class="en-sec"><div class="blab">Ведущие · видите только вы</div>
    <label class="chk"><input type="checkbox" id="enOpen" ${hi.open?'checked':''}> Ведущим может быть любой, кто вошёл в аккаунт с подтверждённой почтой</label>
    <div class="rlist">${hs.map(([k,v])=>`<div><span>${esc((v&&v.email)||k)}</span><button class="btn sm ghost red" data-enrm="${esc(k)}">Убрать</button></div>`).join('')||'<div class="muted small">Пока только вы.</div>'}</div>
    <div class="row" style="flex-wrap:nowrap;margin-top:8px"><input id="enHost" type="email" placeholder="email@gmail.com" autocomplete="off" style="flex:1;min-width:0"><button class="btn" id="enAdd">Пригласить</button></div>
    <div class="small muted" style="margin-top:6px">Приглашённый входит через Google или по почте с этим адресом — и может создавать комнаты для телефонов.</div></div>`;}
  h+=`<div class="en-sec" style="text-align:center"><button class="btn sm ghost" id="enOut">Выйти из аккаунта</button></div>`;
  if(enMode!=='cabinet')return;el.innerHTML=h+ft+`</div>`;}
const sgS=v=>(v>0?'+':v<0?'−':'')+Math.abs(v).toLocaleString('ru-RU',{maximumFractionDigits:2});
function evDetail(e){const d=new Date(e.at).toLocaleString('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}),tm=e.mode==='t';
  const cells=[['Формат',tm?'Турнир':'Кэш'],['Игроков',e.n],['Стартовый стек',fmt(e.st||0)]];
  if(tm){cells.push(['Место',e.pl?(e.pl===1?'🏆 ':'')+e.pl+' из '+e.n:'—']);if(e.kn)cells.push(['Выбил',e.kn]);}
  else cells.push(['Получил фишек',fmt(e.ci||0)],['Ушёл с',e.co!=null?fmt(e.co):'—'],['Итог, фишек',e.net!=null?`<span class="${e.net>0?'pos':e.net<0?'neg':''}">${sgS(e.net)}</span>`:'—'],['Итог, стеков',e.stk!=null?`<span class="${e.stk>0?'pos':e.stk<0?'neg':''}">${sgS(e.stk)}</span>`:'—']);
  cells.push(['Докупов',fU((e.rb||0)-(e.hf||0)*.5)]);if(e.ad)cells.push(['Аддон','да']);
  return `<div class="en-box wide"><button class="en-x" id="enClose" title="К таймеру">✕</button><button class="btn sm ghost" data-evback="1">← Мои вечера</button>
    <div class="wz-h" style="margin-top:12px">${esc(e.name||'Вечер')}</div><div class="muted small">${d}${e.host?' · ведущий '+esc(e.host):''}${e.me?' · вы играли как «'+esc(e.me)+'»':''}</div>
    <div class="evd">${cells.map(([a,b])=>`<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>
    <div class="small muted">В кабинете хранятся только фишки и места — без денег.</div>
    <div class="en-sec"><button class="btn sm ghost red" data-evrm="${esc(e.k)}">Убрать из кабинета</button></div></div>`;}
async function evHTML(){let ev={},ho={};try{ev=(await NET.get('users/'+NET.uid+'/evenings'))||{};}catch(e){}try{ho=(await NET.get('users/'+NET.uid+'/hosted'))||{};}catch(e){}
  EVC={};Object.entries(ev).forEach(([k,v])=>{EVC[k]=Object.assign({k},v);});
  const L=Object.entries(ev).map(([k,v])=>Object.assign({k},v)).sort((a,b)=>b.at-a.at),C=L.filter(e=>e.mode==='c'&&e.stk!=null),Tn=L.filter(e=>e.mode==='t'&&e.pl);
  let h='';
  if(!L.length)h+=`<div class="muted small">Пока пусто. Вечер попадёт сюда, когда ведущий привяжет вас к игроку (🔗 во вкладке «Игроки») и завершит вечер. Проще всего — войти в комнату с телефона через аккаунт.</div>`;
  else{const tot=C.reduce((s,e)=>s+e.stk,0),best=C.length?Math.max(...C.map(e=>e.stk)):null,plus=C.filter(e=>e.stk>0).length,rb=L.reduce((s,e)=>s+(e.rb||0)-(e.hf||0)*.5,0)/L.length;
    const cells=[['Вечеров',L.length]];if(C.length){cells.push(['Итог, стеков',`<span class="${tot>0?'pos':tot<0?'neg':''}">${sgS(Math.round(tot*100)/100)}</span>`],['Лучший вечер',`<span class="${best>0?'pos':''}">${sgS(best)}</span>`],['В плюсе',plus+' из '+C.length]);}
    if(Tn.length)cells.push(['Турниров',Tn.length],['Побед',Tn.filter(e=>e.pl===1).length],['Среднее место',(Tn.reduce((s,e)=>s+e.pl,0)/Tn.length).toLocaleString('ru-RU',{maximumFractionDigits:1})]);
    cells.push(['Докупов в среднем',rb.toLocaleString('ru-RU',{maximumFractionDigits:1})]);
    h+=`<div class="evs">${cells.map(([a,b])=>`<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>`;
    const shown=evMore?L:L.slice(0,10);let lastM='';
    shown.forEach(e=>{const m=new Date(e.at).toLocaleDateString('ru-RU',{month:'long',year:'numeric'});if(m!==lastM){if(lastM)h+='</ul>';h+=`<div class="evm">${m}</div><ul class="evl">`;lastM=m;}
      const d=new Date(e.at).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}),sub=[d,e.host?'ведущий '+esc(e.host):'',e.rb?'докупов '+fU((e.rb||0)-(e.hf||0)*.5):''].filter(Boolean).join(' · ');
      const res=e.mode==='t'?(e.pl?`${e.pl===1?'🏆 ':''}${e.pl} из ${e.n}`:'—'):e.stk==null?'—':`<span class="${e.stk>0?'pos':e.stk<0?'neg':''}">${sgS(e.stk)} ст.</span><small>${sgS(e.net||0)} фиш.</small>`;
      h+=`<li><button class="evrow" data-ev="${esc(e.k)}" aria-label="${esc(e.name||'Вечер')}, ${d} — подробнее"><span class="ed"><b>${esc(e.name||'Вечер')}</b><small>${sub}</small></span><span class="er">${res}</span><span class="chev" aria-hidden="true">›</span></button></li>`;});
    if(lastM)h+='</ul>';if(L.length>shown.length)h+=`<button class="btn sm ghost" data-evmore="1" style="width:100%;margin-top:8px">Показать ещё ${L.length-shown.length}</button>`;}
  if(evUndo)h+=`<div class="snack" role="status"><span>Вечер «${esc(evUndo.rec.name||'Вечер')}» убран</span><button class="btn sm" data-evundo="1">Отменить</button></div>`;
  const H=Object.entries(ho).map(([k,v])=>Object.assign({k},v)).sort((a,b)=>b.at-a.at);
  if(H.length)h+=`<details class="hosted"><summary>Проведённые вами вечера (${H.length})</summary>${H.slice(0,20).map(e=>`<div class="small" style="margin-top:8px"><b>${esc(e.name||'Вечер')}</b> · ${new Date(e.at).toLocaleDateString('ru-RU')} · ${e.mode==='t'?'турнир':'кэш'}, ${e.n} игр.</div><table>${(e.rows||[]).slice().sort((a,b)=>e.mode==='t'?(a.pl||99)-(b.pl||99):(b.stk||0)-(a.stk||0)).map(r=>`<tr><td>${esc(r.n)}</td><td class="r">${e.mode==='t'?(r.pl?r.pl+' место':''):r.stk!=null?`<span class="${r.stk>0?'pos':r.stk<0?'neg':''}">${sgS(r.stk)} ст.</span>`:'—'}</td><td class="r muted">${r.rb?'+'+fU((r.rb||0)-(r.hf||0)*.5):''}</td></tr>`).join('')}</table>`).join('')}</details>`;
  return h;}
async function sendMail(){const v=(($('#authEmail')||{}).value||'').trim().toLowerCase();enMail.val=v;if(!NutsNet.okEmail(v)){enErr='Введите адрес почты, например kolya@mail.ru';return renderEntry();}
  enBusy='send';enErr='';renderEntry();
  try{NET=NET||await NutsNet.connect();try{localStorage.setItem('nuts.emailReq',JSON.stringify({email:v,mode:enMail.mode}));}catch(x){}
    await NET.sendLink(v,location.origin+location.pathname);enMail.sent=v;enMail.open=false;}catch(err){enErr=NutsNet.gErr(err);}
  enBusy=false;renderEntry();}
function joinByCode(){const c=(($('#enCode')||{}).value||'').trim().toUpperCase();if(!/^[A-Z0-9]{4}$/.test(c)){enErr='Код комнаты — 4 символа, например 6D2P';return renderEntry();}location.hash='#r-'+c;location.reload();}
function payRead(){if(!payDr)return;const p=$('#payPh'),o=$('#payBankO'),s=$('#payShare');if(p)payDr.ph=p.value;if(o)payDr.bank=o.value.trim();if(s)payDr.share=s.checked;}
async function entryClick(e){const b=e.target.closest('button,a,[data-bank]');if(!b)return;
  if(b.id==='enClose'){closeEntry();return;}
  if(b.id==='enStart'){closeEntry();if(isFresh()&&!noWiz())openWiz();return;}
  if(b.id==='enGuest'){setEntry('guest');closeEntry();if(isFresh()&&!S.wizDone&&!noWiz())openWiz();return;}
  if(b.id==='enJoin')return joinByCode();
  if(b.id==='enRemote'){location.hash='#r-'+b.dataset.room;location.reload();return;}
  if(b.id==='enMove'){b.disabled=true;return takeOver(b.dataset.room);}
  if(b.dataset.bank){payRead();if(b.dataset.bank==='__other'){payDr.other=true;if(BANKS.includes(payDr.bank))payDr.bank='';}else{payDr.other=false;payDr.bank=b.dataset.bank;}return renderEntry();}
  if(b.id==='paySave'){payRead();const d=String(payDr.ph).replace(/\D/g,'');if(d&&d.length!==11){enErr='Номер телефона — 11 цифр, например +7 916 123-45-67';return renderEntry();}
    const o={ph:d?'+'+d:'',bank:String(payDr.bank||'').slice(0,40),share:!!payDr.share,at:NET.now()};try{if(d){await NET.set('users/'+NET.uid+'/pay',o);PAYC=o;}else{await NET.remove('users/'+NET.uid+'/pay');PAYC={};}enErr='';toast('Реквизиты сохранены');}catch(x){enErr='Не получилось сохранить';}payDr=null;return renderEntry();}
  if(b.id==='payDel'){try{await NET.remove('users/'+NET.uid+'/pay');PAYC={};payDr=null;toast('Реквизиты удалены');}catch(x){enErr='Не получилось удалить';}return renderEntry();}
  if(b.dataset.ev){evSel=b.dataset.ev;return renderEntry();}
  if(b.dataset.evback){evSel=null;return renderEntry();}
  if(b.dataset.evmore){evMore=true;return renderEntry();}
  if(b.dataset.evrm){const k=b.dataset.evrm,rec=EVC[k];try{await NET.remove('users/'+NET.uid+'/evenings/'+k);evUndo={k,rec};setTimeout(()=>{if(evUndo&&evUndo.k===k){evUndo=null;if(enMode==='cabinet'&&!evSel)renderEntry();}},6000);}catch(x){enErr='Не получилось убрать';}evSel=null;return renderEntry();}
  if(b.dataset.evundo&&evUndo){const {k,rec}=evUndo,o=Object.assign({},rec);delete o.k;evUndo=null;try{await NET.set('users/'+NET.uid+'/evenings/'+k,o);}catch(x){enErr='Не получилось вернуть';}return renderEntry();}
  if(b.dataset.evdel){try{await NET.remove('users/'+NET.uid+'/evenings/'+b.dataset.evdel);}catch(x){enErr='Не получилось убрать';}return renderEntry();}
  const au=b.dataset.auth;
  if(au==='google'||au==='microsoft'){enBusy=au;enErr='';renderEntry();try{NET=NET||await NutsNet.connect();await NET.signIn(au);HI=null;profSaved=false;setEntry('google');enMode='cabinet';flushUp();render();}catch(err){enErr=NutsNet.gErr(err);}enBusy=false;renderEntry();refreshAcct();return;}
  if(au==='email'||au==='resend'){e.preventDefault();enMail={open:true,sent:'',mode:enMode==='cabinet'?'link':'signin',val:enMail.sent||enMail.val};enErr='';renderEntry();setTimeout(()=>{const i=$('#authEmail');if(i)i.focus();},50);return;}
  if(au==='send')return sendMail();
  if(b.dataset.link){const k=b.dataset.link;if(k==='email'){enMail={open:true,sent:'',mode:'link',val:''};enErr='';renderEntry();return;}
    enBusy=k;enErr='';renderEntry();try{await NET.link(k);HI=null;profSaved=false;}catch(err){enErr=NutsNet.gErr(err);}enBusy=false;renderEntry();refreshAcct();return;}
  if(b.dataset.unlink){try{await NET.unlink(b.dataset.unlink);HI=null;}catch(err){enErr=NutsNet.gErr(err);}renderEntry();refreshAcct();return;}
  if(b.id==='enOut'){e.preventDefault();if(remoteOn){enErr='Сначала закройте комнату для телефонов (📱 → Закрыть комнату).';return renderEntry();}try{await NET.signOut();}catch(x){}HI=null;profSaved=false;setEntry('');enMode='welcome';renderEntry();refreshAcct();return;}
  if(b.id==='enAdd'){const v=(($('#enHost')||{}).value||'').trim().toLowerCase();if(!/^[^@\s\/#$\[\]]+@[^@\s\/#$\[\]]+\.[a-z]{2,}$/.test(v)){enErr='Введите email, например kolya@gmail.com';return renderEntry();}
    try{await NET.set('hosts/'+ekey(v),{email:v,at:NET.now()});enErr='';}catch(x){enErr='Не получилось: '+(x.message||x);}return renderEntry();}
  if(b.dataset.enrm){try{await NET.remove('hosts/'+b.dataset.enrm);}catch(x){enErr='Не получилось убрать';}return renderEntry();}}
document.addEventListener('change',async e=>{if(e.target.id==='enOpen'){try{await NET.set('settings/openHosting',e.target.checked);enErr='';}catch(x){enErr='Не получилось сохранить';}renderEntry();}});
function refreshAcct(){const b=$('#acctBtn');if(!b)return;if(!NutsNet.configured()){b.style.display='none';return;}const W=NET&&NET.who();
  let C=null;try{C=JSON.parse(localStorage.getItem('nuts.acct')||'null');}catch(e){}
  if(W){if(W.google){C={name:W.name||'',photo:W.photo||'',email:W.email||''};try{localStorage.setItem('nuts.acct',JSON.stringify(C));}catch(e){}}else{C=null;try{localStorage.removeItem('nuts.acct');}catch(e){}}}
  const known=!!W||getEntry()!=='google';
  if(C){b.innerHTML=NutsNet.avatar(C);b.title='Личный кабинет · '+(C.email||'');}
  else if(!known){b.innerHTML='👤';b.title='Подключаюсь…';}
  else{b.innerHTML='👤<span class="lbl"> Войти</span>';b.title='Войти в аккаунт';}
  const f=$('#acctFab');if(f){f.innerHTML=C?NutsNet.avatar(C):'👤';f.title=b.title;}}
$$('.tab').forEach(t=>{if(!t.title)t.title=t.textContent.trim();});
$('#acctFab').onclick=()=>$('#acctBtn').click();
$('#acctBtn').onclick=()=>{const W=NET&&NET.who();openEntry(W&&W.google?'cabinet':(getEntry()==='google'?'cabinet':'welcome'));};
(function initEntry(){refreshAcct();if(!NutsNet.configured())return;const pref=getEntry(),busy=T().startedAt!=null||!!(S.remote&&S.remote.on);
  if(/[?&]oobCode=/.test(location.search)){NutsNet.connect().then(n=>{NET=NET||n;HI=null;refreshAcct();const L=window.NUTS_LINK||{};
      if(L.ok){setEntry('google');openEntry('cabinet');toast(L.mode==='link'?'✉️ Почта привязана':'✉️ Вы вошли по почте');}
      else{openEntry(n.who().google?'cabinet':'welcome');enErr=L.err||'Не получилось войти по ссылке';renderEntry();}}).catch(e=>{openEntry('welcome');enErr='Нет связи с сервером';renderEntry();});return;}
  if(pref==='google'||busy&&S.remote&&S.remote.on)NutsNet.connect().then(n=>{NET=NET||n;refreshAcct();flushUp();render();}).catch(()=>{});
  if(busy)return;if(pref==='')openEntry('welcome');else if(pref==='google')openEntry('cabinet');})();

/* ===== Nav / controls ===== */
function show(v){$$('.tab').forEach(t=>t.classList.toggle('on',t.dataset.v===v));$$('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+v));try{if(location.hash!=='#'+v)history.replaceState(null,'','#'+v);}catch(e){}if(v==='timer')requestAnimationFrame(fit);}
$$('.tab').forEach(t=>t.onclick=()=>show(t.dataset.v));
const h0=location.hash.slice(1);if(['players','results','structure','chips','settings'].includes(h0))show(h0);
$('#bPlay').onclick=toggle;$('#bNext').onclick=()=>step(1);$('#bPrev').onclick=()=>step(-1);
$('#bPlus').onclick=()=>addTime(60000);$('#bMinus').onclick=()=>addTime(-60000);
const lock=()=>{document.body.classList.toggle('locked');render();toast(document.body.classList.contains('locked')?'Кнопки заблокированы':'Разблокировано');};
$('#bLock').onclick=lock;
async function fs(){try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen();kbLock();}else await document.exitFullscreen();}catch(e){toast('Полный экран недоступен здесь');}}
function kbLock(){try{if(navigator.keyboard&&navigator.keyboard.lock)navigator.keyboard.lock(['Escape']).catch(()=>{});}catch(e){}}
let tvFs=false;function tv(on){document.body.classList.toggle('tv',on);if(on){show('timer');}else tvFs=false;requestAnimationFrame(fit);}
$('#fsBtn').onclick=fs;$('#tvBtn').onclick=()=>{tv(true);if(!document.fullscreenElement){tvFs=true;fs();}};$('#tvExit').onclick=()=>{tv(false);if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});};
const onL=id=>{const el=$('#'+id);return !!(el&&el.classList.contains('on'));};
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('#qpop').classList.contains('on')){hidePop();return;}
  if(!onL('help')&&!onL('modal')&&(onL('wiz')||onL('entry')||onL('fin'))){
    if(e.key==='Escape'){e.preventDefault();if(onL('wiz'))closeWiz();else if(onL('entry'))closeEntry();else closeFin();return;}
    if(e.key==='Enter'&&onL('wiz')&&!e.target.matches('input,textarea,select,button')){const b=$('#wiz .wz-nav .btn.pri:not([disabled])');if(b){e.preventDefault();b.click();}}
    return;}
  if($('#help').classList.contains('on')){if(e.key==='Escape'||e.key.toLowerCase()==='c'||e.key.toLowerCase()==='с')closeHelp();return;}
  if($('#modal').classList.contains('on')){if(e.key==='Escape'){closeModal(true);}else if(e.key==='Enter'&&!e.target.matches('textarea')){const b=$('#mbox .mbtns .pri');if(b){e.preventDefault();b.click();}}return;}
  if(e.target.matches('input,select,textarea'))return;
  const k=e.key.toLowerCase(),locked=document.body.classList.contains('locked');
  if((e.ctrlKey||e.metaKey)&&(k==='z'||k==='я')){e.preventDefault();return undo();}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(k==='l'||k==='д')return lock();
  if(k==='escape'&&document.body.classList.contains('tv')){const both=tvFs;tv(false);if(both&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});return;}
  if(k==='escape'&&document.fullscreenElement){document.exitFullscreen().catch(()=>{});return;}
  if(k==='t'||k==='е')return tv(!document.body.classList.contains('tv'));
  if(k==='f'||k==='а')return fs();
  if(k==='c'||k==='с')return openHelp('hands');
  if(e.key==='?'||e.key===',')return openHelp('guide');
  if((k==='r'||k==='к')&&!locked)return resetMenu();
  if(locked)return;
  if(e.code==='Space'){e.preventDefault();if(e.target.blur)e.target.blur();toggle();}else if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowLeft')step(-1);});

/* ===== 5.0: анимации на ТВ ===== */
if(!S.anim)S.anim='full';if(S.tvSeats==null)S.tvSeats=true;
const RMQ=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
const animMode=()=>{const m=S.anim||'full';return m==='full'&&RMQ.matches?'calm':m;};
const isTV=()=>document.body.classList.contains('tv');
const fxOn=()=>isTV()&&animMode()!=='off';
let fxIdx=null,fxSec=null,fxFake=0;
function fxLayer(){let e=$('#fxl');if(!e){e=document.createElement('div');e.id='fxl';document.body.appendChild(e);}return e;}
function fxRe(el,cls){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);}
function fxLevel(i){if(!fxOn())return;const l=L(i);fxRe($('#blinds'),'fx-in');fxRe($('#lvlChip'),'fx-in');fxRe($('#ante'),'fx-in');
  if(animMode()==='full'){const st=$('#v-timer .stage');if(st){const w=document.createElement('div');w.className='fx-sweep';st.appendChild(w);setTimeout(()=>w.remove(),1300);}}
  if(l)fxBanner(l.type==='break'?'brk':'lvl',l.type==='break'?'☕ Перерыв '+l.min+' мин':'Уровень '+lvlNum(i)+' · '+bstr(l));}
function fxBanner(type,text){if(!fxOn())return;const ly=fxLayer();ly.querySelectorAll('.fx-ban').forEach(e=>e.remove());
  const ic={bust:'💥',rebuy:'💸',addon:'➕'}[type]||'';const b=document.createElement('div');b.className='fx-ban '+type;b.textContent=(ic?ic+' ':'')+text;ly.appendChild(b);setTimeout(()=>b.remove(),3700);}
function fxWin(name){if(!fxOn())return;fxWinClose(true);const x=totals(),pr=isT()?payouts(x.pool)[0]:0;
  const w=document.createElement('div');w.id='fxwin';w.innerHTML=`<div class="in"><div class="tro">🏆</div><div class="lb">Победитель</div><div class="nm">${esc(name)}</div>${pr?`<div class="pr">${money(pr)}</div>`:''}<div class="hint">Нажмите, чтобы перейти к итогам</div></div>`;
  if(animMode()==='full'){const C=['#fbbf24','#34d399','#a3e635','#f87171','#60a5fa','#f5f5f4','#c084fc'];for(let i=0;i<70;i++){const c=document.createElement('i');c.className='cf';c.style.left=(Math.random()*100)+'%';c.style.background=C[i%C.length];c.style.animationDuration=(2.6+Math.random()*2.4)+'s';c.style.animationDelay=(Math.random()*1.4)+'s';c.style.width=(6+Math.random()*7)+'px';w.appendChild(c);}}
  w.onclick=()=>fxWinClose();document.body.appendChild(w);clearTimeout(fxWin.t);fxWin.t=setTimeout(()=>fxWinClose(),7000);}
function fxWinClose(now){const w=$('#fxwin');if(!w)return;if(now||animMode()==='off'){w.remove();return;}w.classList.add('out');setTimeout(()=>w.remove(),600);}
document.addEventListener('keydown',e=>{if($('#fxwin')&&!$('#fxwin').classList.contains('out')){e.stopImmediatePropagation();e.preventDefault();fxWinClose();}},true);
function brkHtml(i){const l=L(i);if(!l||l.type!=='break')return'';let nx=null;for(let j=i+1;j<S.levels.length;j++)if(L(j).type==='level'){nx=L(j);break;}
  const cu=colorUpNew(i+1),ch=chipsAsc().filter(c=>cu.includes(c.v));let h='';
  if(nx)h+=`<div class="bi"><div class="blab">После перерыва</div><div class="v">${bstr(nx)}${nx.ante?`<small>${nx.bba?'анте BB':'анте '+fmt(nx.ante)}</small>`:''}</div></div>`;
  if(ch.length)h+=`<div class="bi"><div class="blab">Убрать со стола</div><div class="chiprow">${ch.map(c=>chipEl(c)).join('')}</div></div>`;
  if(S.addonOn)h+=`<div class="bi"><div class="blab">Аддон</div><div class="v">+${fmt(S.addonStack)}<small>за ${money(S.addonCost)}</small></div></div>`;
  return h;}
function tvSeatsHtml(){if(!S.tvSeats||!S.seats||!S.players.some(p=>p.seat))return'';const n=S.seats.n,pts=ellPts(n);let h='';
  for(let i=1;i<=n;i++){const [x,y]=pts[i-1],p=S.players.find(q=>q.seat===i);h+=`<div class="seat ${y<50?'up':'dn'}${p&&p.status==='out'?' out':''}${p?'':' empty'}" style="left:${x}%;top:${y}%"><div class="s">${i}</div><div class="nm">${p?esc(String(p.name).split(' ')[0]):'—'}</div></div>`;
    if(S.seats.dealer===i)h+=`<div class="dpuck" style="left:${x+(50-x)*.3}%;top:${y+(50-y)*.4}%">D</div>`;}
  return`<div class="r tvseat"><div class="l">Рассадка</div><div class="table-ov mini"><div class="felt"></div>${h}</div></div>`;}
function fxRender(){const m=animMode(),b=document.body;b.classList.toggle('anim-full',m==='full');b.classList.toggle('anim-calm',m==='calm');b.classList.toggle('anim-off',m==='off');if(m==='off'||!isTV()){const ly=$('#fxl');if(ly)ly.innerHTML='';}
  const t=T(),l=L(t.idx),brk=!!(l&&l.type==='break')||!!fxDemoBrk;b.classList.toggle('brk-on',brk);
  const bi=$('#brkInfo');if(bi){const bh=brk?brkHtml(fxDemoBrk||t.idx):'';if(bi.innerHTML!==bh){bi.innerHTML=bh;requestAnimationFrame(fit);}}
  const tvs=$('#tvstats');if(tvs){const h=tvSeatsHtml();if(h)tvs.insertAdjacentHTML('beforeend',h);}
  if(fxIdx!==null&&fxIdx!==t.idx&&t.startedAt!=null)fxLevel(t.idx);fxIdx=t.idx;}
let fxDemoBrk=0;
{const _r=render;render=function(){_r.apply(this,arguments);try{fxRender();}catch(e){console.error(e);}};}
{const _l=logEv;logEv=function(type,text){_l(type,text);try{if(type==='bust'||type==='rebuy'||type==='addon')fxBanner(type,String(text).split(' · №')[0]);else if(type==='win')fxWin(String(text).replace(/^Победитель:\s*/,''));}catch(e){console.error(e);}};}
{const _c=renderClock;renderClock=function(){_c();try{const t=T(),l=L(t.idx);let r=rem(),run=t.running;if(fxFake){r=fxFake-Date.now();run=true;if(r<=0){fxFake=0;r=rem();run=t.running;}else $('#clock').textContent=fmtT(r);}
  const last=fxOn()&&run&&l&&(fxFake||l.type==='level')&&r>0&&r<=10000;document.body.classList.toggle('last10',!!last);
  if(last){const sec=Math.ceil(r/1000);if(sec!==fxSec){fxSec=sec;if(animMode()==='full')fxRe($('#clock'),'fx-tick');if(S.sound)beep([[sec<=3?1320:880,.05]]);}}else fxSec=null;}catch(e){console.error(e);}};}
if(/[?&]demo=1\b/.test(location.search)){const d=document.createElement('div');d.id='fxdemo';
  d.innerHTML=`<b>Демо анимаций</b><button data-fx="tv">📺 ТВ</button><button data-fx="lvl">Смена уровня</button><button data-fx="t10">Последние 10 с</button><button data-fx="brk">Перерыв</button><button data-fx="bust">Вылет</button><button data-fx="rebuy">Докуп</button><button data-fx="addon">Аддон</button><button data-fx="win">Победитель</button><button data-fx="mode"></button>`;
  document.body.appendChild(d);const lbl=()=>{d.querySelector('[data-fx=mode]').textContent='Режим: '+({full:'полные',calm:'спокойные',off:'выкл'}[S.anim]||S.anim);};lbl();
  const nm=()=>{const p=S.players.filter(q=>q.status==='in');return p.length?p[Math.floor(Math.random()*p.length)].name:['Гриша','Аня','Борис','Вика'][Math.floor(Math.random()*4)];};
  d.addEventListener('click',e=>{const a=e.target.dataset&&e.target.dataset.fx;if(!a)return;e.target.blur();
    if(a==='tv')return tv(!isTV());
    if(a==='lvl'){const i=Math.min(T().idx+1,S.levels.length-1);const l=L(i);if(fxOn()){fxRe($('#blinds'),'fx-in');fxRe($('#lvlChip'),'fx-in');if(animMode()==='full'){const st=$('#v-timer .stage');const w=document.createElement('div');w.className='fx-sweep';st.appendChild(w);setTimeout(()=>w.remove(),1300);}fxBanner(l.type==='break'?'brk':'lvl',l.type==='break'?'☕ Перерыв '+l.min+' мин':'Уровень '+lvlNum(i)+' · '+bstr(l));}return;}
    if(a==='t10'){fxFake=Date.now()+11000;return;}
    if(a==='brk'){if(fxDemoBrk){fxDemoBrk=0;}else{let j=S.levels.findIndex((z,k)=>k>=T().idx&&z.type==='break');fxDemoBrk=j>=0?j:0;if(!fxDemoBrk)toast('В структуре нет перерыва');}render();return;}
    if(a==='bust')return fxBanner('bust',nm()+' — вылет · '+(2+Math.floor(Math.random()*6))+' место');
    if(a==='rebuy')return fxBanner('rebuy',nm()+' — докуп, снова в игре');
    if(a==='addon')return fxBanner('addon',nm()+' взял аддон (+'+fmt(S.addonStack)+' фишек)');
    if(a==='win')return fxWin(nm());
    if(a==='mode'){S.anim={full:'calm',calm:'off',off:'full'}[S.anim]||'full';save();loadSettings();render();lbl();}});}
if(!S.levels||!S.levels.length)S.levels=generate();
save();loadSettings();render();setInterval(tick,250);if(T().running)awake(true);
})();

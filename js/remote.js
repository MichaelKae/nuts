/* Nuts · экран телефона (пульт и зритель). © MichaelKae, CC BY-NC 4.0 */
(()=>{
const m=location.hash.match(/^#r-([A-Z0-9]{4})(?:-(\d{4}))?/i);if(!m)return;
const room=m[1].toUpperCase(),R0='rooms/'+room;let qrPin=m[2]||'';
if(qrPin){try{history.replaceState(null,'',location.pathname+location.search+'#r-'+room);}catch(e){}}
document.body.classList.add('remote');
const root=document.getElementById('remoteRoot');const q=s=>root.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n||0).toLocaleString('ru-RU');const pad=n=>String(n).padStart(2,'0');
const fmtT=ms=>{ms=Math.max(0,ms);const t=Math.ceil(ms/1000),h=Math.floor(t/3600),mm=Math.floor(t%3600/60),ss=t%60;return h?h+':'+pad(mm)+':'+pad(ss):pad(mm)+':'+pad(ss);};
const LS='nuts.remote';let me={};try{me=JSON.parse(localStorage.getItem(LS))||{};}catch(e){}
const saveMe=()=>{try{localStorage.setItem(LS,JSON.stringify({name:me.name||''}));}catch(e){}};
let NET=null,st=null,isMember=false,isAdmin=false,banned=false,conn=false,err='',joining=false,asking=false,kickedMsg='',stUnsub=null,wasMember=false,hadState=false,closed=false,denied=false;
let pend=0,pendT=null,slow=false,G={google:false},gBusy=false,isOwner=false,dropping=false,kickT=null,rMail={open:false,sent:'',val:''};
function maybeKicked(){clearTimeout(kickT);kickT=setTimeout(()=>{if(!isMember&&!isAdmin&&!closed&&!banned){if(!dropping)kickedMsg='Ведущий отключил вас от комнаты. Можно зайти снова.';dropping=false;render();}},2500);}const PK='nuts.pin.'+room;
try{const pd=JSON.parse(sessionStorage.getItem('nuts.pend')||localStorage.getItem('nuts.pend')||'null');sessionStorage.removeItem('nuts.pend');localStorage.removeItem('nuts.pend');if(pd&&pd.room===room&&pd.pin&&!qrPin&&Date.now()-(pd.at||Date.now())<3600e3)qrPin=pd.pin;}catch(e){}
const haptic=p=>{try{navigator.vibrate&&navigator.vibrate(p);}catch(e){}};
let pendLabel='',askAt=0,rbWait=null,rejUntil=0,rejT=null;const MEK='nuts.me.'+room;
const mine=()=>{if(!st||!st.pl)return null;let m=st.pl.find(x=>x.u&&x.u===NET.uid);if(m)return m;let id=null;try{id=+localStorage.getItem(MEK);}catch(e){}return st.pl.find(x=>x.id===id)||null;};
function onMemberRq(v){if(v.rq&&rbWait&&v.rq.at>=rbWait.at-2000){const ok=v.rq.r==='ok';rbWait=null;rtoast(ok?'✓ Докуп оформлен':'✕ Ведущий отклонил докуп');haptic(ok?[12,60,12]:[30,60,30]);render();}}
function rbCard(){if(!st||!st.pl||!st.pl.length)return '';const me=mine(),T=st.mode==='tournament';
  if(rbWait)return `<div class="card" style="text-align:center"><span class="muted">⏳ Запрос на докуп отправлен — ждём ведущего…</span><div style="margin-top:6px"><a href="#" id="rbCancel" style="color:var(--muted)">отменить</a></div></div>`;
  if(!me)return `<div class="card"><div class="small muted" style="margin-bottom:8px">Кто вы за столом? Тогда можно будет попросить докуп с телефона.</div><div class="roster">${st.pl.map(x=>`<span class="rchip" data-me="${x.id}">${esc(x.n)}</span>`).join('')}</div></div>`;
  const win=T&&me.pl===1;
  return `<div class="card rme"><div class="rme-h"><b>${esc(me.n)}</b>${me.u?' 🔗':` <a href="#" id="rbWho" style="color:var(--muted);font-size:13px">не вы?</a>`}</div><div class="small muted">${me.st==='out'?(T&&me.pl?me.pl+' место':'вылет'):'в игре'}${me.rb?' · докупов: '+String(me.rb-(me.hf||0)*.5).replace('.',','):''}</div>${win?'':`<button class="btn pri" id="rbAsk" style="width:100%;margin-top:10px">💸 Хочу докупиться</button>`}</div>`;}
function askRebuy(k){const p=mine(),r=st.r||{};if(!p)return;
  {const w0=[];if(r.until&&r.lvl>r.until)w0.push(`окно докупов закрылось после ${r.until} уровня`);if(p.st==='in'&&r.when==='bust')w0.push('по правилам докуп только после вылета');if(r.max&&(p.rb-p.hf*.5)+.5>r.max)w0.push(`лимит докупов (${r.max}) исчерпан`);
   if(w0.length)return sheet('Докуп сейчас нельзя',w0.join(', ')+'. Если что-то не так — скажите ведущему.',[{t:'Понятно',cls:'pri'}]);}
  if(r.half&&k==null)return sheet('Докуп: '+esc(p.n),'На сколько докупаетесь?',[{t:`💸 Весь стек · +${fmt(r.rs)} за ${fmt(r.rc)} ${st.cur||'₽'}`,cls:'pri',fn:()=>askRebuy(1)},{t:`💸 Половина · +${fmt(r.rs/2)} за ${fmt(r.rc/2)} ${st.cur||'₽'}`,fn:()=>askRebuy(.5)},{t:'Отмена',cls:'ghost'}]);
  k=k||1;const units=p.rb-p.hf*.5,why=[];
  if(r.max&&units+k>r.max)why.push(`лимит докупов (${r.max}) исчерпан`);if(r.until&&r.lvl>r.until)why.push(`окно докупов закрылось после ${r.until} уровня`);
  if(p.st==='in'&&r.when==='bust')why.push('по правилам докуп только после вылета');
  if(why.length)return sheet('Докуп сейчас нельзя',why.join(', ')+'. Если что-то не так — скажите ведущему.',[{t:'Понятно',cls:'pri'}]);
  rbWait={pid:p.id,k,at:NET.now()};haptic(15);render();req({want:'rebuy',pid:p.id,k}).catch(()=>{rbWait=null;rtoast('Не удалось отправить запрос');render();});
  const at=rbWait.at;setTimeout(()=>{if(rbWait&&rbWait.at===at){rbWait=null;rtoast('Ведущий не ответил на запрос');render();}},120000);}
function rtoast(t){let el=document.getElementById('rtoast');if(!el){el=document.createElement('div');el.id='rtoast';document.body.appendChild(el);}el.textContent=t;el.classList.add('on');clearTimeout(rtoast.t);rtoast.t=setTimeout(()=>el.classList.remove('on'),2400);}
function send(c,label){pendLabel=label||'';pend++;clearTimeout(pendT);pendT=setTimeout(()=>{if(pend){slow=true;render();}},5000);
  if(st&&st.t){const t=st.t,now=NET.now();
    if(c.t==='toggle'){if(t.run){t.rem=Math.max(0,t.end-now);t.run=false;}else{t.end=now+(t.st?t.rem:(t.rem||t.len));t.run=true;t.st=true;}render();}
    else if(c.t==='time'){if(t.run)t.end=Math.max(now+1000,t.end+c.d*60000);else t.rem=Math.max(1000,t.rem+c.d*60000);tickR();}}
  return NET.push(R0+'/cmds',Object.assign({by:NET.uid,at:NET.now()},c)).catch(()=>{slow=true;render();});}
let PAYI=null;
const req=v=>{const o={name:me.name||'Гость',at:NET.now()};if(PAYI&&v&&v.pin)o.pay=PAYI;if(G.google){o.g=true;if(G.photo&&/^https:\/\//.test(G.photo))o.ph=G.photo.slice(0,400);}return NET.set(R0+'/join/'+NET.uid,Object.assign(o,v));};
const aBtns=()=>NutsNet.authBtns({busy:gBusy,emailOpen:rMail.open,sent:rMail.sent,emailVal:rMail.val});
const whoCard=()=>`<div class="who">${NutsNet.avatar(G)}<span><b>${esc(G.name||G.email||'Аккаунт')}</b><small>${esc(NutsNet.provLabel(G)||G.email||'')}</small></span><a href="#" id="rgOut">выйти</a></div>`;
const curPin=()=>qrPin||((q('#rjPin')||{}).value||'').trim()||sessionStorage.getItem(PK)||'';
async function sendMailR(upgrade){const v=((q('#authEmail')||{}).value||'').trim().toLowerCase(),pin=curPin();rMail.val=v;
  if(!upgrade&&!/^\d{4}$/.test(pin)){err='Сначала введите PIN с экрана игры';render();return;}
  if(!NutsNet.okEmail(v)){err='Введите адрес почты, например kolya@mail.ru';render();return;}
  gBusy='send';err='';render();
  try{const typed=((q('#rjName')||{}).value||'').trim();if(typed){me.name=typed.slice(0,30);saveMe();}
    localStorage.setItem('nuts.emailReq',JSON.stringify({email:v,mode:'signin'}));localStorage.setItem('nuts.pend',JSON.stringify({room,pin,at:Date.now()}));
    await NET.sendLink(v,location.origin+location.pathname+'?nr='+room);rMail={open:false,sent:v,val:v};}catch(e){err=NutsNet.gErr(e);}
  gBusy=false;render();}
async function doGoogle(upgrade,kind){const before=NET.uid,typed=((q('#rjName')||{}).value||'').trim(),pin=curPin();
  if(!upgrade&&!qrPin&&!/^\d{4}$/.test(pin)){err='Сначала введите PIN с экрана игры';render();return;}
  gBusy=kind||'google';err='';render();
  try{G=await NET.signIn(kind||'google');}catch(e){gBusy=false;err=NutsNet.gErr(e);render();return;}
  gBusy=false;if(!typed&&G.name){me.name=G.name.slice(0,30);saveMe();}else if(typed){me.name=typed.slice(0,30);saveMe();}
  if(NET.uid!==before){try{sessionStorage.setItem('nuts.pend',JSON.stringify({room,pin,at:Date.now()}));}catch(e){}location.reload();return;}
  if(upgrade){if(pin)await req({pin}).catch(()=>{});render();setTimeout(()=>{if(!isAdmin){asking=true;render();req({want:'remote'}).catch(()=>{asking=false;render();});setTimeout(()=>{if(asking&&!isAdmin){asking=false;render();}},60000);}},900);return;}
  if(!qrPin)qrPin=pin;const f=q('#rjName');if(f)f.value=me.name||'';joinRoom();}
function sheet(title,text,btns){const w=document.createElement('div');w.className='rmodal';w.innerHTML=`<div class="mbox"><h3>${title}</h3>${text?`<p>${text}</p>`:''}<div class="mbtns col"></div></div>`;
  const bx=w.querySelector('.mbtns');btns.forEach(b=>{const e=document.createElement('button');e.className='btn '+(b.cls||'');e.textContent=b.t;e.onclick=()=>{w.remove();b.fn&&b.fn();};bx.appendChild(e);});
  w.addEventListener('click',e=>{if(e.target===w)w.remove();});document.body.appendChild(w);}
const header=()=>`<div class="rhead"><div class="brand"><i>♠</i>Nuts <span style="font-size:10px;color:var(--dim);font-family:var(--ui)">v${window.NUTS_VER}</span></div><span class="small muted">${isAdmin?(isOwner?'пульт · ведущий':'пульт'):isMember?'зритель':''}</span><span class="room"><span class="dot ${conn?'on':''}"></span> ${room}</span></div>`;
const foot=()=>`<div class="hint" style="text-align:center;margin-top:14px">Звук — только на главном экране${isMember?' · <a href="#" id="rLeave" style="color:var(--muted)">выйти</a>':''}${G.google?' · <a href="#" id="rgOut" style="color:var(--muted)">выйти из Google</a>':''}</div>`;
function render(){try{render0();}catch(e){root.innerHTML=header()+`<div class="card" style="color:var(--red)">Ошибка пульта: ${esc(e.message||e)}. Обновите страницу.</div>`;}}
function render0(){
  if(!NutsNet.configured()){root.innerHTML=header()+`<div class="card">Пульт не настроен на этом сайте.</div>`;return;}
  if(!NET){root.innerHTML=header()+`<div class="card muted">${err?esc(err):'Подключаюсь…'}</div>`;return;}
  if(banned){root.innerHTML=header()+`<div class="card"><h3>⛔ Доступ закрыт</h3><p class="muted">Это устройство заблокировано в комнате ${room}. Если это ошибка — попросите ведущего создать новую комнату.</p></div>`;return;}
  if(denied){root.innerHTML=header()+`<div class="card"><h3>⚠️ Нет доступа к базе</h3><p class="muted">Сервер отклонил запрос. Похоже, на стороне игры не обновлены правила базы. Сообщите ведущему.</p></div>`;return;}
  if(closed&&!isMember&&!isAdmin){root.innerHTML=header()+`<div class="card"><h3>🏁 Комната ${room} закрыта</h3><p class="muted">Ведущий завершил игру в этой комнате. Если играете дальше — отсканируйте новый QR-код с экрана игры.</p></div>`;return;}
  if(dropping&&!isMember&&!isAdmin){root.innerHTML=header()+`<div class="card muted" style="text-align:center">Передаём пульт…</div>`;return;}
  if(!isMember&&!isAdmin){const needPin=!qrPin,pv=((q('#rjPin')||{}).value)||'',nf=q('#rjName'),nv=nf?nf.value:(me.name||'');
    const pinF=needPin?`<label class="f">PIN (показан на экране игры)<input id="rjPin" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off" value="${esc(pv)}"></label>`:'';
    const nameF=`<label class="f">${G.google?'Имя в игре':'Ваше имя'}<input id="rjName" value="${esc(nv)}" placeholder="Как вас зовут за столом" autocomplete="off" maxlength="30"></label>`;
    const er=err?`<p style="color:var(--red);margin:0 0 10px">${esc(err)}</p>`:'',go=t=>`<button class="btn ${t?'':'pri'}" id="rjGo" style="width:100%" ${joining?'disabled':''}>${joining?'Подключаюсь…':(t||'Войти в комнату')}</button>`;
    root.innerHTML=header()+`<div class="card rjoin"><h3>Комната ${room}</h3>${kickedMsg?`<p style="color:var(--gold);margin:0 0 10px">${esc(kickedMsg)}</p>`:''}`+
      (G.google?whoCard()+nameF+pinF+er+go():
       pinF+er+aBtns()+`<p class="small muted" style="margin:8px 0 0">С аккаунтом ведущий узнает вас на любом устройстве и сможет давать пульт без подтверждения.</p><div class="orline">или просто по имени</div>`+nameF+go('Войти по имени'))+`</div>`;return;}
  const stale=st&&st.ver&&st.ver!==window.NUTS_VER?`<div class="card" style="border-color:rgba(251,191,36,.4)">На главном экране версия ${esc(st.ver)}, а здесь ${window.NUTS_VER}. <button class="btn sm gold" id="rReload">Обновить</button></div>`:'';
  if(!st){root.innerHTML=header()+`<div class="card muted">Ждём экран игры…</div>${foot()}`;return;}
  const l=st.lv,nx=st.nx,brk=l&&l.ty==='break';
  let h=header()+`<div class="card rtimer"><div class="lvlchip ${brk?'brk':''}">${l?(brk?'☕ Перерыв':'Уровень '+l.n+' из '+st.tot):''}</div>
    <div class="clock" id="rClock">--:--</div><div class="blinds ${brk?'brk':''}">${l?(brk?'Перерыв':fmt(l.sb)+' / '+fmt(l.bb)):''}</div>
    ${l&&l.an?`<div class="ante">${l.ab?'Анте большого блайнда':'Анте'} ${fmt(l.an)}</div>`:''}<div class="nx">Далее: ${nx?(nx.ty==='break'?'перерыв':fmt(nx.sb)+' / '+fmt(nx.bb)+(nx.an?(nx.ab?' · анте BB':' · анте '+fmt(nx.an)):'')):'—'}</div></div>
    <div class="rstat"><div><small>${st.mode==='tournament'?'Призовой':'Банк'}</small><b>${fmt(st.x.bank)}</b></div><div><small>Игроков</small><b>${st.x.inP}/${st.x.n}</b></div><div><small>Ср. стек</small><b>${st.x.inP?fmt(st.x.avg):'—'}</b></div></div>`;
  if(isAdmin&&st.rq&&st.rq.length){const q0=st.rq[0];h+=`<div class="card" style="border-color:rgba(52,211,153,.45)">💸 <b>${esc(q0.n)}</b> просит докуп · ${q0.k<1?'половина':'весь стек'}${st.rq.length>1?` <span class="muted small">· ещё ${st.rq.length-1}</span>`:''}<div class="row" style="margin-top:10px;flex-wrap:nowrap"><button class="btn red" data-rq="0" data-u="${esc(q0.u)}" style="flex:1">Отклонить</button><button class="btn pri" data-rq="1" data-u="${esc(q0.u)}" data-n="${esc(q0.n)}" style="flex:1">Оформить</button></div></div>`;}
  if(isAdmin){
    h+=`<div class="rctrl"><button class="btn" data-c="prev" ${st.first?'disabled':''}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg></button>
      <button class="btn" data-c="minus">−1м</button><button class="btn pri" data-c="toggle">${st.t.run?'⏸ Пауза':st.t.st?'▶ Дальше':'▶ Старт'}</button>
      <button class="btn" data-c="plus">+1м</button><button class="btn" data-c="next" ${st.last?'disabled':''}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg></button></div>`;
    const P=[...st.pl].sort((a,b)=>(a.st===b.st?0:a.st==='in'?-1:1)||(a.pl||0)-(b.pl||0)),r=st.r,T=st.mode==='tournament';
    h+=`<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h3 style="margin:0">Игроки</h3><button class="btn sm" data-c="undo" ${st.undo?'':'disabled'}>↶ Отменить</button></div>`+
    P.map(p=>{const win=T&&p.pl===1,acts=[];
      if(p.st==='in'){if(!win&&st.x.inP>1)acts.push(['bust','💥','red']);if(!win&&r.when!=='bust')acts.push(['rebuy','💸','']);if(r.addon&&!p.ad&&!win)acts.push(['addon','➕','']);}
      else{acts.push(['rebuy','💸 В игру','pri']);acts.push(['back','↩',''])}
      return`<div class="rpl ${p.st}"><span class="nm">${win?'🏆 ':''}${esc(p.n)}<small>${p.st==='out'?(T&&p.pl?p.pl+' место':'вылет'):''}${p.rb?' +'+String(p.rb-(p.hf||0)*.5).replace('.',','):''}${p.ad?' · аддон':''}</small></span>${acts.map(([a,t,c])=>`<button class="btn ${c}" data-p="${p.id}" data-a="${a}">${t}</button>`).join('')}</div>`;}).join('')+
    (P.length?'':'<div class="muted small" style="padding:6px 2px">Игроков пока нет — добавьте ниже.</div>')+
    `<div class="row" style="margin-top:10px;flex-wrap:nowrap"><input id="rAdd" placeholder="Новый игрок" autocomplete="off"><button class="btn pri" data-c="add">＋</button></div></div>
    <div class="hint" style="text-align:center"><a href="#" id="rDrop" style="color:var(--muted)">Отдать пульт</a></div>`;
  }else{
    h+=st.remote?`<div class="card small muted" style="text-align:center">🎮 Пульт у: <b>${esc(st.remote)}</b></div>`:
      st.go&&!G.google?`<div class="card rup" style="text-align:center"><p class="small muted" style="margin:0 0 10px">Пультом может стать только тот, кто вошёл в аккаунт.</p>${err?`<p style="color:var(--red);margin:0 0 10px">${esc(err)}</p>`:''}${aBtns()}</div>`:
      `<div class="card" style="text-align:center">${asking?'<span class="muted">⏳ Ждём разрешения на экране игры…</span>':Date.now()<rejUntil?`<button class="btn" disabled style="width:100%">⏳ Снова через ${Math.ceil((rejUntil-Date.now())/1000)} с</button>`:'<button class="btn pri" id="rAsk" style="width:100%">📱 Стать пультом</button>'}</div>`;}
  if(!isAdmin)h+=rbCard();
  const slowBox=slow?`<div class="card" style="border-color:rgba(248,113,113,.45)">⏳ Экран игры не отвечает. Проверьте, что вкладка с таймером открыта на ноутбуке и есть интернет — команда выполнится, когда связь вернётся.</div>`:'';
  root.innerHTML=stale+slowBox+h+cmbHTML()+foot();tickR();if(pend)root.querySelectorAll('[data-c],[data-p]').forEach(x=>x.classList.add('busy'));}
function tickR(){const c=q('#rClock');if(!c||!st)return;const r=st.t.run?st.t.end-NET.now():st.t.rem;c.textContent=fmtT(r);c.classList.toggle('warn',r<=60000&&st.t.run&&st.lv&&st.lv.ty==='level');c.classList.toggle('paused',!st.t.run&&st.t.st);}
setInterval(tickR,250);
function bustThenR(p,a){const r=st.r,two=kk=>{haptic(30);send(Object.assign({t:'p',id:p.id,a:'bust',h:1},kk?{k:kk}:{}));send({t:'p',id:p.id,a},p.n+' — вылет и '+(a==='rebuy50'?'докуп 50%':'докуп'));};
  if(r.bounty){const others=st.pl.filter(x=>x.st==='in'&&x.id!==p.id);return sheet('Кто выбил '+esc(p.n)+'?','',others.map(o=>({t:o.n,fn:()=>two(o.id)})).concat([{t:'Никто — баунти в призовой фонд',fn:()=>two()},{t:'Отмена',cls:'ghost'}]));}
  two();}
let cmbOpen=(()=>{try{return localStorage.getItem('nuts.combos')==='1';}catch(e){return false;}})();
const cmbHTML=()=>`<details class="card rcombo" ${cmbOpen?'open':''}><summary>🃏 Комбинации · от старшей</summary><div class="hl">${(window.NUTS_HANDS||[]).map((x,i)=>`<div><span><i>${i+1}</i>${x[0]}</span><span class="c">${x[3].split(' ').map(c=>/[♥♦]/.test(c)?'<span class="r">'+c+'</span>':c).join(' ')}</span></div>`).join('')}</div></details>`;
root.addEventListener('toggle',e=>{if(e.target.classList&&e.target.classList.contains('rcombo')){cmbOpen=e.target.open;try{localStorage.setItem('nuts.combos',cmbOpen?'1':'0');}catch(x){}}},true);
function playerCmd(p,a){const r=st.r,k=a==='rebuy50'?.5:1,LB={bust:p.n+' — вылет',rebuy:p.n+(p.st==='out'?' — докуп, снова в игре':' — докуп'),rebuy50:p.n+' — докуп 50%',addon:p.n+' — аддон',back:p.n+' — снова в игре'},go=extra=>{haptic(a==='bust'?30:15);send(Object.assign({t:'p',id:p.id,a},extra||{}),LB[a]);};
  if(a==='bust'){if(r.bounty){const others=st.pl.filter(x=>x.st==='in'&&x.id!==p.id);return sheet('Вылет: '+esc(p.n),'Кто выбил?',others.map(o=>({t:o.n,fn:()=>go({k:o.id})})).concat([{t:'Никто — баунти в призовой фонд',fn:()=>go()},{t:'Отмена',cls:'ghost'}]));}
    return sheet('Вылет: '+esc(p.n)+'?','',[{t:'💥 Да, вылет',cls:'red',fn:()=>go()},{t:'Отмена',cls:'ghost'}]);}
  if(a==='rebuy'&&r.half&&!playerCmd.k){const cur=st.cur||'₽';return sheet('Докуп: '+esc(p.n),'На сколько докупается?',[{t:`💸 Весь стек · +${fmt(r.rs)} за ${fmt(r.rc)} ${cur}`,cls:'pri',fn:()=>{playerCmd.k=1;try{playerCmd(p,'rebuy');}finally{playerCmd.k=0;}}},{t:`💸 Половина · +${fmt(r.rs/2)} за ${fmt(r.rc/2)} ${cur}`,fn:()=>{playerCmd.k=1;try{playerCmd(p,'rebuy50');}finally{playerCmd.k=0;}}},{t:'Отмена',cls:'ghost'}]);}
  if(a==='back')return sheet('Вернуть '+esc(p.n)+'?','Без докупа — если вылет отметили по ошибке.',[{t:'↩ Вернуть в игру',cls:'pri',fn:()=>go()},{t:'Отмена',cls:'ghost'}]);
  if(a==='rebuy'||a==='rebuy50'){const units=p.rb-p.hf*.5,why=[];
    if(r.max&&units+k>r.max)why.push(`лимит докупов (${r.max}) исчерпан`);if(r.until&&r.lvl>r.until)why.push(`окно докупов закрылось после ${r.until} уровня`);
    if(p.st==='in'&&r.when==='bust')why.push('докуп только после вылета');
    const label=(k<1?'Докуп 50%':'Докуп')+': '+esc(p.n);
    if(why.length)return sheet(label,'Не по правилам: '+why.join(', ')+'. Всё равно оформить?',[{t:'Оформить',cls:'pri',fn:()=>go()},{t:'Отмена',cls:'ghost'}]);
    if(p.st==='in'&&r.when==='short'){const lim=k<1?Math.round(r.start/2):r.start;return sheet(label,`Стек не больше ${k<1?'половины стартового':'стартового'} (${fmt(lim)})?`,[{t:'Да, стек не больше '+fmt(lim),cls:'pri',fn:()=>go()},{t:'💥 Вылетел — вылет и докуп',fn:()=>bustThenR(p,a)},{t:'Отмена',cls:'ghost'}]);}
    return go();}
  go();}
async function joinRoom(){const nm=((q('#rjName')||{}).value||'').trim();const pin=qrPin||((q('#rjPin')||{}).value||'').trim();
  if(!nm){err='Введите имя';render();return;}if(!/^\d{4}$/.test(pin)){err='Введите 4 цифры PIN';render();return;}
  me.name=nm.slice(0,30);saveMe();try{sessionStorage.setItem(PK,pin);}catch(e){}err='';kickedMsg='';joining=true;render();
  try{await req({pin});}catch(e){joining=false;err='Не удалось отправить: '+(e.message||e);render();return;}
  setTimeout(()=>{if(joining&&!isMember&&!isAdmin){joining=false;if(qrPin)qrPin='';err='Экран игры не подтвердил вход. Проверьте PIN и что комната на ноутбуке открыта.';render();}},7000);}
root.addEventListener('click',e=>{const b=e.target.closest('button,a,[data-me]');if(!b)return;
  if(b.id==='rjGo')return joinRoom();
  const au=b.dataset.auth,up=!!b.closest('.rup');
  if(au==='google'||au==='microsoft')return doGoogle(up,au);
  if(au==='email'||au==='resend'){e.preventDefault();rMail={open:true,sent:'',val:rMail.sent||rMail.val};err='';render();setTimeout(()=>{const i=q('#authEmail');if(i)i.focus();},50);return;}
  if(au==='send')return sendMailR(up);
  if(b.id==='rgOut'){e.preventDefault();(async()=>{if(isMember||isAdmin)await req({want:'leave'}).catch(()=>{});try{await NET.signOut();}catch(x){}me.name='';saveMe();location.hash='#r-'+room;location.reload();})();return;}
  if(b.id==='rReload'){location.href=location.pathname+'?v='+Date.now()+location.hash;return;}
  if(b.id==='rLeave'){e.preventDefault();req({want:'leave'}).catch(()=>{});setTimeout(()=>{location.hash='';location.reload();},400);return;}
  if(b.id==='rAsk'&&isOwner){NET.set(R0+'/admins/'+NET.uid,{name:String(G.name||me.name||'Ведущий').slice(0,30),at:NET.now(),g:true}).catch(()=>{});return;}
  if(b.dataset.me){try{localStorage.setItem(MEK,b.dataset.me);}catch(x){}render();return;}
  if(b.id==='rbWho'){e.preventDefault();try{localStorage.removeItem(MEK);}catch(x){}render();return;}
  if(b.id==='rbAsk'){return askRebuy(null);}
  if(b.id==='rbCancel'){e.preventDefault();rbWait=null;req({want:'rqcancel'}).catch(()=>{});render();return;}
  if(b.dataset.rq&&isAdmin){haptic(15);send({t:'rq',u:b.dataset.u,ok:b.dataset.rq==='1'},b.dataset.rq==='1'?(b.dataset.n||'Игрок')+' — докуп оформлен':'Запрос на докуп отклонён');return;}
  if(b.id==='rAsk'){askAt=NET.now();asking=true;render();req({want:'remote'}).catch(()=>{asking=false;render();});setTimeout(()=>{if(asking&&!isAdmin){asking=false;render();}},60000);return;}
  if(b.id==='rDrop'){e.preventDefault();sheet('Отдать пульт?','Вы останетесь зрителем, а стать пультом сможет кто-то другой.',[{t:'Отдать',cls:'pri',fn:()=>{dropping=true;req({want:'drop'}).catch(()=>{dropping=false;render();});}},{t:'Отмена',cls:'ghost'}]);return;}
  if(!isAdmin||!st)return;
  try{if(navigator.wakeLock&&!window.__wl)navigator.wakeLock.request('screen').then(w=>window.__wl=w).catch(()=>{});}catch(err){}
  b.classList.add('busy');
  const c=b.dataset.c;
  haptic(12);if(c==='toggle')send({t:'toggle'});else if(c==='prev')send({t:'step',d:-1});else if(c==='next')send({t:'step',d:1});
  else if(c==='minus')send({t:'time',d:-1});else if(c==='plus')send({t:'time',d:1});else if(c==='undo')send({t:'undo'},'Последнее действие отменено');
  else if(c==='add'){const v=q('#rAdd').value.split(',').map(x=>x.trim()).filter(Boolean);if(v.length){send({t:'add',names:v},v.join(', ')+' — за столом');q('#rAdd').value='';}}
  else if(b.dataset.p){const p=st.pl.find(x=>x.id==b.dataset.p);if(p)playerCmd(p,b.dataset.a);}});
root.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='authEmail')sendMailR(!!e.target.closest('.rup'));if(e.key==='Enter'&&e.target.id==='rAdd')q('[data-c=add]').click();if(e.key==='Enter'&&(e.target.id==='rjPin'||e.target.id==='rjName'))joinRoom();});
function watchState(){const on=isMember||isAdmin;
  if(on&&!stUnsub){stUnsub=NET.onValue(R0+'/state',v=>{if(isAdmin&&v&&v.rq&&v.rq.length>((st&&st.rq)?st.rq.length:0))haptic([20,50,20]);if(pend&&pendLabel&&v){rtoast('✓ '+pendLabel);haptic([12,60,12]);}pendLabel='';pend=0;clearTimeout(pendT);slow=false;if(v)hadState=true;else if(hadState)closed=true;if(v){v.pl=Array.isArray(v.pl)?v.pl:Object.values(v.pl||{});v.rq=Array.isArray(v.rq)?v.rq:Object.values(v.rq||{});v.x=v.x||{inP:0,n:0,reb:0,bank:0,avg:0};v.r=v.r||{};v.t=v.t||{};}st=v;render();});}
  if(!on&&stUnsub){try{stUnsub();}catch(e){}stUnsub=null;st=null;}}
(async()=>{render();try{NET=await NutsNet.connect();}catch(e){err='Нет связи с сервером: '+(e.message||e);render();return;}
  G=NET.who();if(G.google){try{const pv=await NET.get('users/'+NET.uid+'/pay');if(pv&&pv.share&&pv.ph)PAYI={ph:String(pv.ph),b:String(pv.bank||'')};}catch(e){}}
  if(G.google&&!me.name&&G.name){me.name=G.name.slice(0,30);saveMe();}
  try{isOwner=G.google&&(await NET.get(R0+'/owner'))===NET.uid;}catch(e){}
  if(isOwner)NET.set(R0+'/admins/'+NET.uid,{name:String(G.name||me.name||'Ведущий').slice(0,30),at:NET.now(),g:true}).catch(()=>{});
  NET.onConn(c=>{conn=c;const d=q('.dot');if(d)d.classList.toggle('on',c);});
  const onDen=()=>{denied=true;render();};
  NET.onValue(R0+'/banned/'+NET.uid,v=>{banned=!!v;render();},onDen);
  NET.onValue(R0+'/admins/'+NET.uid,v=>{const wasA=isAdmin;isAdmin=!!v;if(isAdmin){asking=false;joining=false;}else if(wasA&&!isMember&&!closed)maybeKicked();watchState();render();},onDen);
  NET.onValue(R0+'/members/'+NET.uid,v=>{if(v&&v.rej&&asking&&v.rej>=askAt-2000){asking=false;rejUntil=Date.now()+30000;rtoast('✕ Ведущий отклонил запрос');haptic([30,60,30]);clearInterval(rejT);rejT=setInterval(()=>{if(Date.now()>=rejUntil)clearInterval(rejT);render();},1000);}if(v)onMemberRq(v);isMember=!!v;if(isMember){joining=false;err='';wasMember=true;if(!isAdmin)dropping=false;}else if(wasMember&&!isAdmin){if(!closed)maybeKicked();wasMember=false;}watchState();render();},onDen);
  render();
  if(qrPin&&me.name&&!isOwner)setTimeout(()=>{if(!isMember&&!isAdmin&&!banned)joinRoom();},600);})();
})();

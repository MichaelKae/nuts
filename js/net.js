/* Nuts · связь с Firebase, вход, общие UI-помощники. © MichaelKae, CC BY-NC 4.0 */
window.NUTS_HANDS=[['Роял-флеш','Royal flush','Туз, король, дама, валет, десятка одной масти. Сильнее не бывает.','A♠ K♠ Q♠ J♠ 10♠',5],
  ['Стрит-флеш','Straight flush','Пять карт подряд одной масти.','9♥ 8♥ 7♥ 6♥ 5♥',5],
  ['Каре','Four of a kind','Четыре карты одного достоинства.','Q♣ Q♦ Q♥ Q♠ 7♦',4],
  ['Фулл-хаус','Full house','Тройка + пара. Между двумя фулл-хаусами сильнее тот, у кого старше тройка.','K♠ K♥ K♦ 4♣ 4♥',5],
  ['Флеш','Flush','Пять карт одной масти, не подряд. Сравнивают по старшей карте.','A♦ J♦ 8♦ 6♦ 2♦',5],
  ['Стрит','Straight','Пять карт подряд, масти любые. Туз может быть и младшей: A-2-3-4-5.','10♣ 9♦ 8♠ 7♥ 6♣',5],
  ['Сет / тройка','Three of a kind','Три карты одного достоинства.','7♠ 7♥ 7♦ K♣ 2♠',3],
  ['Две пары','Two pair','Две разные пары. Сначала сравнивают старшую пару, потом младшую, потом кикер.','J♥ J♣ 4♠ 4♦ A♥',4],
  ['Пара','One pair','Две карты одного достоинства.','10♠ 10♥ K♦ 6♣ 3♠',2],
  ['Старшая карта','High card','Ничего не собралось — решает самая старшая карта.','A♣ Q♦ 9♠ 5♥ 3♣',1]];
window.NUTS_VER='5.0.3';
window.NutsNet=(()=>{
  const SDK='https://www.gstatic.com/firebasejs/10.12.2/';
  const load=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Нет связи с '+new URL(src).host));document.head.appendChild(s);});
  let ready=null;
  try{const q0=new URLSearchParams(location.search),nr=q0.get('nr');if(nr&&/^[A-Z0-9]{4}$/i.test(nr)&&!/^#r-/i.test(location.hash))history.replaceState(null,'',location.pathname+location.search+'#r-'+nr.toUpperCase());}catch(e){}
  const prov=()=>(window.NUTS_FB&&Array.isArray(window.NUTS_FB.providers)&&window.NUTS_FB.providers)||['google','email'];
  const configured=()=>!!(window.NUTS_FB_ADAPTER||(window.NUTS_FB&&window.NUTS_FB.databaseURL));
  function connect(){if(ready)return ready;
    ready=(async()=>{
      if(window.NUTS_FB_ADAPTER)return await window.NUTS_FB_ADAPTER();
      await load(SDK+'firebase-app-compat.js');await load(SDK+'firebase-auth-compat.js');await load(SDK+'firebase-database-compat.js');
      if(!firebase.apps.length)firebase.initializeApp(window.NUTS_FB);
      const ack=window.NUTS_FB.appCheckKey;
      if(ack&&location.protocol.startsWith('http')){try{await load(SDK+'firebase-app-check-compat.js');firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(ack),true);}catch(e){console.warn('App Check не загрузился',e);}}
      const auth=firebase.auth();await new Promise(r=>{const off=auth.onAuthStateChanged(()=>{off();r();});});
      if(!auth.currentUser)await auth.signInAnonymously();const db=firebase.database();
      const who=()=>{const u=auth.currentUser;if(!u)return{uid:null,google:false,verified:false,name:'',photo:'',email:'',providers:[]};const pd=(u.providerData||[]).filter(Boolean);
        const g=pd.find(x=>x.providerId==='google.com')||pd.find(x=>x.providerId==='microsoft.com')||pd[0];
        return{uid:u.uid,google:!u.isAnonymous&&pd.length>0,verified:!!u.emailVerified,name:(g&&g.displayName)||u.displayName||'',photo:(g&&g.photoURL)||u.photoURL||'',email:u.email||(g&&g.email)||'',providers:pd.map(x=>({id:x.providerId,email:x.email||''}))};};
      const PROV={google:()=>{const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});return p;},
        microsoft:()=>{const p=new firebase.auth.OAuthProvider('microsoft.com');p.setCustomParameters({prompt:'select_account'});return p;}};
      const fresh=async()=>{try{await auth.currentUser.getIdToken(true);}catch(e){}return who();};
      async function signIn(kind){const pr=PROV[kind](),u=auth.currentUser;
        try{if(u&&u.isAnonymous)await u.linkWithPopup(pr);else await auth.signInWithPopup(pr);}
        catch(e){if((e.code==='auth/credential-already-in-use'||e.code==='auth/email-already-in-use')&&e.credential)await auth.signInWithCredential(e.credential);else throw e;}
        return fresh();}
      async function link(kind){await auth.currentUser.linkWithPopup(PROV[kind]());return fresh();}
      async function unlink(pid){await auth.currentUser.unlink(pid);return fresh();}
      const sendLink=(email,url)=>auth.sendSignInLinkToEmail(email,{url,handleCodeInApp:true});
      const isLink=h=>auth.isSignInWithEmailLink(h);
      async function finishLink(email,href,mode){const u=auth.currentUser,cred=firebase.auth.EmailAuthProvider.credentialWithLink(email,href);
        if(u&&!u.isAnonymous&&mode==='link')await u.linkWithCredential(cred);
        else if(u&&u.isAnonymous){try{await u.linkWithCredential(cred);}catch(e){if(/already-in-use|already-linked/.test(e.code||''))await auth.signInWithEmailLink(email,href);else throw e;}}
        else await auth.signInWithEmailLink(email,href);
        return fresh();}
      async function signOut(){await auth.signOut();await auth.signInAnonymously();return who();}
      let off=0,conn=false;const cl=[];db.ref('.info/serverTimeOffset').on('value',x=>off=x.val()||0);
      db.ref('.info/connected').on('value',x=>{conn=!!x.val();cl.forEach(f=>f(conn));});
      return{get uid(){return auth.currentUser?auth.currentUser.uid:null;},who,google:()=>signIn('google'),signIn,link,unlink,sendLink,isLink,finishLink,signOut,now:()=>Date.now()+off,
        get:async p=>(await db.ref(p).get()).val(),set:(p,v)=>db.ref(p).set(v),update:(p,o)=>db.ref(p).update(o),remove:p=>db.ref(p).remove(),push:(p,v)=>db.ref(p).push(v),
        onValue:(p,cb,onErr)=>{const r=db.ref(p),h=x=>cb(x.val());r.on('value',h,e=>{onErr&&onErr(e);});return()=>r.off('value',h);},
        onChild:(p,cb)=>{const r=db.ref(p),h=x=>cb(x.key,x.val());r.on('child_added',h);return()=>r.off('child_added',h);},
        onConn:f=>{cl.push(f);f(conn);}};})();
    ready=ready.then(async api=>{await completeLink(api);return api;});
    ready.catch(()=>{ready=null;});return ready;}
  async function completeLink(api){const h=location.href;if(!api.isLink||!api.isLink(h))return;let rq={};try{rq=JSON.parse(localStorage.getItem('nuts.emailReq')||'{}');}catch(e){}
    const clean=()=>{try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}};
    let email=rq.email;if(!email){const w=api.who&&api.who();if(w&&w.google&&w.email)email=w.email;}if(!email)email=(window.prompt('Введите email, на который пришла ссылка для входа')||'').trim();
    if(!email){clean();window.NUTS_LINK={ok:false,err:'Вход по ссылке отменён: не указан email.'};return;}
    try{await api.finishLink(email,h,rq.mode||'signin');window.NUTS_LINK={ok:true,mode:rq.mode||'signin'};try{localStorage.removeItem('nuts.emailReq');}catch(e){}}
    catch(e){window.NUTS_LINK={ok:false,mode:rq.mode||'signin',err:gErr(e)};}
    clean();}
  const CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code=()=>Array.from({length:4},()=>CH[Math.floor(Math.random()*CH.length)]).join('');
  const base=()=>location.protocol.startsWith('http')?location.origin+location.pathname:'https://michaelkae.github.io/nuts/';
  const joinUrl=room=>base()+'#r-'+room;
  async function qrSvg(text){if(!window.qrcode){try{await load('lib/qrcode.js');}catch(e){await load('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js');}}const q=qrcode(0,'M');q.addData(text);q.make();return q.createSvgTag({cellSize:6,margin:2,scalable:true});}
  const inApp=()=>/FBAN|FBAV|Instagram|Line\/|Telegram|VKClient|; wv\)/i.test(navigator.userAgent);
  function gErr(e){const c=(e&&e.code)||'',IA='Во встроенном браузере вход через Google и Microsoft не работает. Откройте страницу в Chrome или Safari (меню ⋮ → «Открыть в браузере») или войдите по почте.';
    if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request'||c==='auth/user-cancelled')return inApp()?IA:'';
    if(c==='auth/account-exists-with-different-credential')return 'Этот email уже используется с другим способом входа. Войдите тем способом, а этот привяжите в кабинете.';
    if(c==='auth/credential-already-in-use'||c==='auth/email-already-in-use')return 'Этот аккаунт уже привязан к другому профилю Nuts.';
    if(c==='auth/provider-already-linked')return 'Этот способ входа уже привязан.';
    if(c==='auth/invalid-action-code'||c==='auth/expired-action-code')return 'Ссылка из письма устарела или уже использована — запросите новую.';
    if(c==='auth/invalid-email')return 'Похоже, в адресе почты опечатка.';
    if(c==='auth/missing-email')return 'Введите адрес почты.';
    if(c==='auth/quota-exceeded')return 'Лимит писем на сегодня исчерпан — попробуйте завтра или войдите через Google.';
    if(c==='auth/requires-recent-login')return 'Для этого нужно войти заново: выйдите и войдите снова, потом повторите.';
    if(c==='auth/no-such-provider')return 'Этот способ входа не привязан.';
    if(inApp()||c==='auth/operation-not-supported-in-this-environment'||c==='auth/web-storage-unsupported')return IA;
    if(c==='auth/popup-blocked')return 'Браузер заблокировал окно входа. Разрешите всплывающие окна для сайта и нажмите ещё раз.';
    if(c==='auth/unauthorized-domain'||c==='auth/unauthorized-continue-uri')return 'Сайт не добавлен в Firebase → Authentication → Settings → Authorized domains.';
    if(c==='auth/operation-not-allowed')return 'Этот способ входа не включён в Firebase (Authentication → Sign-in method).';
    if(c==='auth/network-request-failed')return 'Нет интернета — не получилось войти.';
    return 'Не получилось войти: '+((e&&e.message)||e);}
  const e_=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const avatar=w=>w&&w.photo?`<img class="av" src="${e_(w.photo)}" referrerpolicy="no-referrer" alt="">`:`<span class="av">${e_(((w&&(w.name||w.email))||'?').trim().charAt(0).toUpperCase()||'?')}</span>`;
  const GICON='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
  const MSICON='<svg viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>';
  const PNAME={'google.com':'Google','microsoft.com':'Microsoft','password':'Почта'},PICON={'google.com':GICON,'microsoft.com':MSICON,'password':'<span class="pi">✉️</span>'},PID={google:'google.com',microsoft:'microsoft.com',email:'password'};
  function authBtns(o){o=o||{};const P=prov(),b=[],dis=o.busy?'disabled':'';
    if(P.includes('google'))b.push(`<button class="btn abtn ab-g" data-auth="google" ${dis}>${GICON}<span>${o.busy==='google'?'Входим…':'Войти через Google'}</span></button>`);
    if(P.includes('microsoft'))b.push(`<button class="btn abtn ab-m" data-auth="microsoft" ${dis}>${MSICON}<span>${o.busy==='microsoft'?'Входим…':'Войти через Microsoft'}</span></button>`);
    if(P.includes('email'))b.push(`<button class="btn abtn ab-e ${o.emailOpen||o.sent?'on':''}" data-auth="email" ${dis}><span class="pi">✉️</span><span>Войти по почте</span></button>`);
    return `<div class="authcol">${b.join('')}</div>`+mailBox(o);}
  function mailBox(o){if(o.sent)return `<div class="authmail">📬 Ссылка отправлена на <b>${e_(o.sent)}</b>. Откройте её из письма на этом устройстве. Нет письма пару минут — загляните в «Спам». <a href="#" data-auth="resend">Отправить ещё раз</a></div>`;
    if(o.emailOpen)return `<div class="authmail"><div class="row" style="flex-wrap:nowrap;gap:8px"><input type="email" id="authEmail" placeholder="you@mail.ru" autocomplete="email" inputmode="email" style="flex:1;min-width:0" value="${e_(o.emailVal||'')}"><button class="btn pri" data-auth="send" ${o.busy?'disabled':''}>${o.busy==='send'?'Шлём…':'Прислать'}</button></div><div class="small muted" style="margin-top:6px">Пришлём письмо со ссылкой — без пароля.</div></div>`;
    return '';}
  const okEmail=v=>/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v);
  const provLabel=w=>{const p=(w&&w.providers||[])[0];return p?'вход через '+(p.id==='password'?'почту':PNAME[p.id]||p.id):'';};
  return{configured,connect,code,joinUrl,qrSvg,gErr,avatar,GICON,MSICON,inApp,prov,authBtns,mailBox,okEmail,PNAME,PICON,PID,provLabel};
})();
if('serviceWorker' in navigator&&window.isSecureContext&&location.protocol.startsWith('http')&&!window.NUTS_NOSW)window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
window.NUTS_INSTALL=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.NUTS_INSTALL=e;try{document.dispatchEvent(new Event('nuts-install'));}catch(x){}});

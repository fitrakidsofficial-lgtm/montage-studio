import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import fs from 'fs';
const b64 = f => fs.readFileSync(f).toString('base64');
const LG=b64('/tmp/calli/luckiest-guy-latin.woff2'), IT=b64('/tmp/calli/itim-latin.woff2'), NSA=b64('/tmp/calli/noto-arabic.woff2');
const LOGO = JSON.parse(fs.readFileSync('/tmp/calli/logos.json','utf8')).A;
const T={cream:'#FFF8EC',gold:'#FFC93C',coral:'#FF6B5A',ink:'#06333B'};

const W=1080,H=1920,FPS=25,DUR=11;   // 11 s
const OPTS=[[1,"Il est le plus grand"],[2,"Il n'a besoin de personne"],[3,"Il existe depuis toujours"]];
const WIN=2;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"LG";src:url(data:font/woff2;base64,${LG}) format("woff2");font-display:block}
@font-face{font-family:"IT";src:url(data:font/woff2;base64,${IT}) format("woff2");font-display:block}
@font-face{font-family:"NSA";src:url(data:font/woff2;base64,${NSA}) format("woff2");font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:"LG";
 background:radial-gradient(76% 46% at 50% 40%, #17C3B2 0%, #0A6F72 84%)}
.wrap{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;padding:150px 100px 268px}
.steps{width:100%;display:flex;gap:9px}
.st{flex:1;height:18px;border-radius:999px;background:rgba(255,255,255,.22);border:4px solid ${T.cream}}
.st.done{background:${T.gold};border-color:${T.gold}} .st.now{background:${T.coral}}
.head{margin-top:22px;width:100%;display:flex;justify-content:space-between}
.pill{background:${T.cream};color:${T.ink};font-size:32px;letter-spacing:.1em;padding:11px 24px 7px;border-radius:999px;
 box-shadow:0 6px 0 rgba(0,0,0,.3)} .pill.acc{background:${T.gold}}
.q{margin-top:38px;font-size:60px;text-align:center;color:#fff;-webkit-text-stroke:12px ${T.ink};paint-order:stroke fill;
 line-height:1.05;filter:drop-shadow(0 10px 0 rgba(0,0,0,.34))}
.q em{font-style:normal;color:${T.gold}}
.hero{margin-top:38px;width:100%;background:${T.cream};border:12px solid ${T.gold};border-radius:44px;padding:18px 30px;
 transform:rotate(-1.2deg);box-shadow:0 16px 0 rgba(0,0,0,.32)}
.ar{font-family:"NSA";direction:rtl;color:${T.ink};font-size:132px;line-height:1;height:158px;
 display:flex;align-items:center;justify-content:center}
.tr{font-family:"LG";font-size:44px;color:#2E7D6C;text-align:center;margin-top:6px;height:0;overflow:hidden}
.ops{margin-top:175px;width:100%;display:flex;flex-direction:column;gap:48px}
.op{display:flex;align-items:center;gap:24px;background:${T.cream};border-radius:40px;padding:26px 32px;
 box-shadow:0 12px 0 rgba(0,0,0,.28)}
.op .n{flex:0 0 78px;height:78px;border-radius:50%;background:${T.coral};color:#fff;font-size:42px;
 display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -5px 0 rgba(0,0,0,.24)}
.op .t{font-family:"IT";font-size:48px;color:${T.ink}}
.timer{margin-top:auto;width:100%;display:flex;align-items:center;gap:20px}
.bar{flex:1;height:50px;border-radius:999px;background:rgba(0,0,0,.3);border:8px solid ${T.cream};overflow:hidden}
.fill{height:100%;background:linear-gradient(90deg,${T.gold},${T.coral})}
.foot{margin-top:34px;width:100%;display:flex;justify-content:space-between;align-items:center}
.score{background:${T.coral};color:#fff;font-size:32px;padding:11px 24px 7px;border-radius:999px;box-shadow:0 6px 0 rgba(0,0,0,.3)}
.sig{display:flex;align-items:center;gap:14px;font-size:28px;letter-spacing:.22em;color:rgba(255,255,255,.9)}
.sig svg{width:52px;height:52px}
</style></head><body>
<div class="wrap">
 <div class="steps">${Array.from({length:10},(_,i)=>`<div class="st ${i<3?'done':i===3?'now':''}"></div>`).join('')}</div>
 <div class="head"><div class="pill">4 / 10</div><div class="pill acc" id="type">LE SENS</div></div>
 <div class="q" id="q">CE MOT VEUT DIRE <em>QUOI&nbsp;?</em></div>
 <div class="hero" id="hero"><div class="ar">الصَّمَد</div><div class="tr" id="tr">IL N'A BESOIN DE PERSONNE</div></div>
 <div class="ops" id="ops">${OPTS.map(([n,t])=>`<div class="op" data-n="${n}"><div class="n">${n}</div><div class="t">${t}</div><div class="ck" style="margin-left:auto;font-size:52px;color:${T.ink};opacity:0">✓</div></div>`).join('')}</div>
 <div class="timer"><div id="bolt"><svg viewBox="0 0 24 24" width="56" height="56"><path d="M13.5 2 4 13.5h6L9.5 22 20 10.2h-6.4z" fill="${T.gold}" stroke="${T.ink}" stroke-width="1.6" stroke-linejoin="round"/></svg></div>
  <div class="bar"><div class="fill" id="fill" style="width:100%"></div></div></div>
 <div class="foot"><div class="score" id="score">SCORE 3</div><div class="sig">${LOGO} MISSION SOURATES</div></div>
</div>
<script>
const WIN=${WIN};
function ease(x){return 1-Math.pow(1-x,3);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
window.render = function(t){
  const hero=document.getElementById('hero'), q=document.getElementById('q');
  const ops=[...document.querySelectorAll('.op')], fill=document.getElementById('fill');
  const tr=document.getElementById('tr'), type=document.getElementById('type'), score=document.getElementById('score');
  // 0-0.5 question
  const aQ=ease(clamp(t/0.5,0,1));
  q.style.opacity=aQ; q.style.transform='translateY('+(1-aQ)*40+'px)';
  // 0.4-1.0 le mot
  const aH=ease(clamp((t-0.4)/0.6,0,1));
  hero.style.opacity=aH; hero.style.transform='rotate(-1.2deg) scale('+(0.86+0.14*aH)+')';
  // 0.9-1.8 reponses en cascade
  ops.forEach((o,i)=>{const a=ease(clamp((t-0.9-i*0.18)/0.5,0,1));
    o.style.opacity=a; o.style.transform='translateX('+(1-a)*90+'px)';});
  // 2.0-5.0 chrono
  const p=clamp((t-2)/3,0,1); fill.style.width=(100-p*100)+'%';
  // 5.2 reveal
  if(t>=5.2){
    const a=ease(clamp((t-5.2)/0.45,0,1));
    ops.forEach(o=>{const n=+o.dataset.n;
      if(n===WIN){o.style.background='${T.gold}'; o.style.transform='scale('+(1+0.05*a)+')';
        o.querySelector('.n').style.background='${T.ink}'; o.querySelector('.ck').style.opacity=a;
        o.style.boxShadow='0 12px 0 rgba(0,0,0,.28), 0 0 '+(70*a)+'px rgba(255,201,60,.95)';}
      else {o.style.opacity=String(1-0.7*a);}});
    type.textContent='BONNE RÉPONSE';
    const h=ease(clamp((t-5.5)/0.5,0,1));
    tr.style.height=(70*h)+'px'; tr.style.opacity=h;
    q.innerHTML='C\\'EST LA <em>2 !</em>';
  }
  // 6.6 score +1
  if(t>=6.6){score.textContent='SCORE 4'; score.style.transform='scale('+(1+0.12*Math.max(0,1-(t-6.6)/0.4))+')';}
  // 8.6-11 sortie
  if(t>=8.6){const a=ease(clamp((t-8.6)/0.7,0,1));
    document.querySelector('.wrap').style.opacity=String(1-a*0.0);}
};
window.render(0);
</script></body></html>`;

fs.writeFileSync('/tmp/calli/anim.html', html);
const br = await chromium.launch();
const p = await br.newPage({ viewport:{width:W,height:H} });
await p.setContent(html);
await p.evaluate(()=>document.fonts.ready);
await p.waitForTimeout(600);
const N = FPS*DUR;
for (let i=0;i<N;i++){
  const t = i/FPS;
  await p.evaluate((tt)=>window.render(tt), t);
  await p.screenshot({path:`/tmp/calli/frames/f${String(i).padStart(4,'0')}.jpg`, type:'jpeg', quality:92});
}
await br.close();
console.log('frames', N);

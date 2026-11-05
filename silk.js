(() => {
'use strict';
const garden=window.ListeningGarden, $=id=>document.getElementById(id);
const section=$('silk'),stage=$('silk-stage'),art=$('silk-instrument'),svg=$('silk-strings'),notes=$('silk-notes');
const keys='ASDFGHJKLQWERTYUIOPZX'.split('');
const interpolate=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const variants={
  guqin:{name:'Guqin',native:'古琴 · Гуцинь',meta:'7 STRINGS · PLUCKED ZITHER',description:'Quiet, resonant and unhurried. Seven strings for a conversation with yourself.',hint:'Brush across the seven strings.',alt:'Seven-string guqin with a dark lacquered body and pale hui markers',tuning:[36,38,41,43,45,48,50],segments:[.342,.39,.439,.486,.532,.58,.629].map((y,i)=>[[.093,y],[.956,.44+i*.0217]])},
  guzheng:{name:'Guzheng',native:'古筝 · Гучжэн',meta:'21 STRINGS · BRIDGED ZITHER',description:'A cascade of bright notes over a long wooden soundboard. Let your fingers follow the water.',hint:'Sweep the strings. Scroll the notes for all 21.',alt:'Long wooden guzheng with strings and a diagonal row of movable bridges',tuning:[38,40,42,45,47,50,52,54,57,59,62,64,66,69,71,74,76,78,81,83,86],segments:Array.from({length:21},(_,i)=>[interpolate([.12,.214],[.093,.679],i/20),interpolate([.875,.277],[.925,.692],i/20)])},
  pipa:{name:'Pipa',native:'琵琶 · Пипа',meta:'4 STRINGS · PLUCKED LUTE',description:'Four strings, a pear-shaped body and a voice that dances. Find a rhythm of your own.',hint:'Pluck the four strings, one at a time or together.',alt:'Honey-coloured pear-shaped pipa with four strings, frets and tuning pegs',tuning:[45,50,52,57],segments:[.487,.501,.515,.528].map((x,i)=>[[x,.212],[[.467,.49,.514,.538][i],.893]])},
  erhu:{name:'Erhu',native:'二胡 · Эрху',meta:'2 STRINGS · BOWED FIDDLE',description:'A slender bow, two strings and a singing voice. Hold a note; slide upward to let it rise.',hint:'Hold a string. Slide up to change the pitch.',alt:'Two-string erhu with a hexagonal resonator and horsehair bow',tuning:[62,69],segments:[[[.468,.372],[.446,.949]],[[.478,.372],[.462,.949]]]}
};
let kind='guqin',wanted=kind,mode='press',keyboardOffset=0,token=0,cancelEpoch=0,transitioning=false,visible=false,frame=0;
let strings=[],buttons=[];
const held=new Map(),pointers=new Map(),cache=new Map();
const noteName=value=>{const midi=Math.round(value);return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]+(Math.floor(midi/12)-1);};
const touchModel=window.StringTouch;
const hints={guqin:'Press along a string; slide to change pitch.',guzheng:'Press left of a bridge; pluck right with another finger.',pipa:'Touch different frets; slide toward the body.',erhu:'Hold to bow. Slide toward the body for higher notes.'};
function preload(name){
  if(!cache.has(name))cache.set(name,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{cache.delete(name);reject(new Error('Image unavailable'));};img.src=`assets/${name}.png`;}));
  return cache.get(name);
}
function element(name,attributes){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const[key,value]of Object.entries(attributes))el.setAttribute(key,value);return el;}
function geometry(){
  const rect=stage.getBoundingClientRect(),box=art.getBoundingClientRect();if(!rect.width||!rect.height)return;
  let paintedWidth=box.width,paintedHeight=box.height;
  if(getComputedStyle(art).objectFit==='contain'&&art.naturalWidth){const scale=Math.min(box.width/art.naturalWidth,box.height/art.naturalHeight);paintedWidth=art.naturalWidth*scale;paintedHeight=art.naturalHeight*scale;}
  const point=p=>[(box.left-rect.left+(box.width-paintedWidth)/2+p[0]*paintedWidth)/rect.width*1000,(box.top-rect.top+(box.height-paintedHeight)/2+p[1]*paintedHeight)/rect.height*600];
  strings.forEach((s,i)=>{[s.a,s.b]=variants[kind].segments[i].map(point);s.hit.setAttribute('d',`M${s.a} L${s.b}`);for(const mark of s.markers){const p=interpolate(s.a,s.b,mark.t);mark.element.setAttribute('cx',p[0]);mark.element.setAttribute('cy',p[1]);}});draw(performance.now());
}
function draw(now){
  let alive=false;
  strings.forEach((s,i)=>{
    const active=[...held.values()].some(v=>v.index===i),age=(now-s.struck)/1000;
    const energy=active?.45:Math.exp(-age*4),lit=energy>.025;
    const amplitude=garden.motion&&lit?energy*6*Math.sin(age*90):0;
    const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1],length=Math.hypot(dx,dy)||1;
    const midpoint=[(s.a[0]+s.b[0])/2-dy/length*amplitude,(s.a[1]+s.b[1])/2+dx/length*amplitude];
    s.wire.setAttribute('d',`M${s.a} Q${midpoint} ${s.b}`);s.wire.classList.toggle('vibrating',lit);
    const contact=interpolate(s.a,s.b,s.contact);s.glow.setAttribute('cx',contact[0]);s.glow.setAttribute('cy',contact[1]);s.glow.setAttribute('r',active?4.5:2.5);s.glow.classList.toggle('lit',lit);
    buttons[i].classList.toggle('active',lit);alive ||= lit;
  });
  return alive;
}
function animate(now){frame=0;if(!visible||document.hidden)return;if(draw(now))frame=requestAnimationFrame(animate);}
function resume(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(animate);}
function bendStrings(index){
  if(kind!=='guzheng'||!strings[index])return;
  const amount=Math.max(0,...[...held.values()].filter(h=>h.index===index&&h.response.pressOnly).map(h=>h.response.offset));
  for(const voice of strings[index].voices){if(voice.ended)strings[index].voices.delete(voice);else voice.pitch(variants.guzheng.tuning[index]+amount);}
}
function release(id){const h=held.get(id);if(!h)return;if(h.kind==='erhu')h.voice?.stop();held.delete(id);bendStrings(h.index);resume();}
function stopAll(){cancelEpoch++;for(const id of held.keys())release(id);for(const s of strings){for(const voice of s.voices)voice.stop();s.voices.clear();}pointers.clear();}
function feedback(index,response){$('silk-feedback').textContent=response.pressOnly?`String ${index+1} · bend +${response.offset.toFixed(1)} st · pluck with another finger`:`${noteName(variants[kind].tuning[index]+response.offset)} · ${response.label} · +${response.offset.toFixed(1)} st`;}
function gesture(index,point,pressure=.45){const t=touchModel.projection(point,strings[index].a,strings[index].b);return{t,response:touchModel.response(kind,t,mode,pressure,index)};}
async function play(index,id,strength=.48,touch=null){
  if(transitioning)return;release(id);
  const response=touch?.response||{offset:mode==='open'?0:mode==='harmonic'?12:keyboardOffset,brightness:.5,pressOnly:false,label:mode==='harmonic'?'Harmonic':'Pluck'};
  const entry={index,kind,epoch:cancelEpoch,voice:null,response};held.set(id,entry);
  strings[index].contact=touch?.t??.5;strings[index].struck=performance.now();feedback(index,response);resume();
  await garden.unlockInstruments();
  // A short tap, a page change, or lost focus may finish before audio unlocks.
  if(entry.kind!==kind||entry.epoch!==cancelEpoch)return;
  const midi=variants[kind].tuning[index]+response.offset;
  if(response.pressOnly){bendStrings(index);return;}
  if(kind==='erhu'){if(held.get(id)===entry)entry.voice=garden.sound.bow(midi,strength);}
  else {entry.voice=garden.sound.startPluck(midi,kind,strength,{brightness:response.brightness});for(const voice of strings[index].voices)if(voice.ended)strings[index].voices.delete(voice);if(entry.voice)strings[index].voices.add(entry.voice);bendStrings(index);}
}
function position(event){const r=stage.getBoundingClientRect();return[(event.clientX-r.left)/r.width*1000,(event.clientY-r.top)/r.height*600];}
function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function nearest(p){let index=-1,best=Infinity;strings.forEach((s,i)=>{const d=distance(p,s.a,s.b);if(d<best){best=d;index=i;}});return best<100?index:-1;}
function render(){
  const v=variants[kind];section.dataset.kind=kind;art.src=`assets/${kind}.png`;art.alt=v.alt;
  if(mode==='harmonic'&&kind!=='guqin')mode='press';keyboardOffset=0;
  $('silk-title').textContent=v.name;$('silk-native').textContent=v.native;$('silk-meta').textContent=v.meta;$('silk-description').textContent=v.description;
  $('silk-hint').replaceChildren(document.createTextNode(hints[kind]));
  const hint=document.createElement('span');hint.textContent=` Keys ${keys.slice(0,Math.min(8,v.tuning.length)).join(' ')}${v.tuning.length>8?'…':''} · ↑↓ pitch.`;$('silk-hint').append(hint);
  stage.setAttribute('aria-label',`Play ${v.name}. ${v.hint} Keyboard: ${keys.slice(0,v.tuning.length).join(' ')}.`);
  svg.replaceChildren();notes.replaceChildren();notes.scrollLeft=0;strings=[];buttons=[];
  v.tuning.forEach((midi,i)=>{
    const hit=element('path',{class:'silk-hit'}),wire=element('path',{class:'silk-wire'}),glow=element('circle',{class:'silk-glow',r:2.5});svg.append(hit,wire,glow);
    strings.push({a:[0,0],b:[0,0],hit,wire,glow,struck:-Infinity,contact:.5,markers:[],voices:new Set()});
    const button=document.createElement('button');button.className='silk-note';button.type='button';button.setAttribute('aria-label',`${v.name} string ${i+1}, ${noteName(midi)}. Key ${keys[i]}`);
    button.append(document.createTextNode(noteName(midi)));const label=document.createElement('small');label.textContent=keys[i];button.append(label);
    button.addEventListener('pointerdown',e=>{if(e.button!==0)return;button.setPointerCapture(e.pointerId);play(i,`note:${e.pointerId}`);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>release(`note:${e.pointerId}`));
    button.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();play(i,`button:${i}`);}});
    button.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release(`button:${i}`);}});
    button.addEventListener('click',e=>{if(e.detail===0){const id=`assist:${i}`;play(i,id);setTimeout(()=>release(id),kind==='erhu'?500:100);}});
    notes.append(button);buttons.push(button);
  });
  document.querySelectorAll('.silk-choice').forEach(button=>{const selected=button.dataset.silk===kind;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  updateTechnique();geometry();
}
function updateTechnique(){
  const instruction=mode==='open'?'Pluck at different points to change the tone.':mode==='harmonic'?'Touch the marked nodes for bell-like harmonics.':hints[kind];
  $('silk-hint').firstChild.textContent=instruction;
  document.querySelectorAll('[data-technique]').forEach(button=>{button.hidden=button.dataset.technique==='harmonic'&&kind!=='guqin';button.setAttribute('aria-pressed',String(button.dataset.technique===mode));if(button.dataset.technique==='press')button.textContent=kind==='pipa'?'Frets':kind==='erhu'?'Finger & bow':kind==='guzheng'?'Press & bend':'Press & slide';});
  for(const s of strings){for(const marker of s.markers)marker.element.remove();s.markers=[];const positions=mode==='open'?[]:kind==='guqin'?[.2,.25,1/3,.5,2/3,.75]:kind==='pipa'?[2,4,5,7,9,12].map(f=>1-Math.pow(2,-f/12)):[];
    for(const t of positions){const dot=element('circle',{class:'silk-guide',r:1.6});svg.append(dot);s.markers.push({t,element:dot});}}
  $('silk-feedback').textContent=mode==='open'?'Open strings · touch near an end for a brighter tone.':mode==='harmonic'?'Light touches at the marked nodes produce harmonics.':'Touch along a string to choose its pitch.';geometry();
  window.dispatchEvent(new Event('garden-preference-change'));
  stage.setAttribute('aria-label',`Play ${variants[kind].name}. ${instruction} Mode: ${mode}. Up and down arrows change keyboard pitch.`);
}
document.querySelectorAll('[data-technique]').forEach(button=>button.addEventListener('click',()=>{stopAll();mode=button.dataset.technique;keyboardOffset=0;updateTechnique();}));
async function select(next){
  if(next===wanted)return;wanted=next;const mine=++token;transitioning=true;stopAll();
  for(const effect of stage.getAnimations())effect.cancel();
  try{await preload(next);}catch{if(mine===token){wanted=kind;transitioning=false;garden.toast('The instrument image could not load. Please try again.');}return;}
  if(mine!==token)return;
  if(garden.motion)await stage.animate([{opacity:1,transform:'translateY(0) rotateY(0deg)'},{opacity:0,transform:'translateY(18px) rotateY(-9deg) scale(.96)'}],{duration:220,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});
  if(mine!==token)return;kind=next;
  for(const effect of stage.getAnimations())effect.cancel();render();
  if(garden.motion)await stage.animate([{opacity:0,transform:'translateY(-14px) rotateY(9deg) scale(.96)'},{opacity:1,transform:'translateY(0) rotateY(0deg) scale(1)'}],{duration:620,easing:'cubic-bezier(.16,1,.3,1)'}).finished.catch(()=>{});
  if(mine===token){transitioning=false;geometry();}
}
function step(direction){const names=Object.keys(variants);select(names[(names.indexOf(wanted)+direction+names.length)%names.length]);}
$('silk-previous').addEventListener('click',()=>step(-1));$('silk-next').addEventListener('click',()=>step(1));
document.querySelectorAll('.silk-choice').forEach(button=>button.addEventListener('click',()=>select(button.dataset.silk)));
svg.addEventListener('pointerdown',event=>{
  if(transitioning||event.button!==0)return;const p=position(event),index=nearest(p);if(index<0)return;
  event.preventDefault();svg.setPointerCapture(event.pointerId);stage.focus({preventScroll:true});
  const pressure=event.pressure>0&&event.pressure!==.5?event.pressure:.45;
  const touch=gesture(index,p,pressure);
  pointers.set(event.pointerId,{index,p,start:p,time:performance.now(),pressOnly:touch.response.pressOnly});play(index,`surface:${event.pointerId}`,.3+pressure*.35,touch);
});
svg.addEventListener('pointermove',event=>{
  const pointer=pointers.get(event.pointerId);if(!pointer||transitioning)return;
  const p=position(event),index=nearest(p),now=performance.now();
  const id=`surface:${event.pointerId}`,h=held.get(id);
  const pressure=event.pressure>0&&event.pressure!==.5?event.pressure:Math.min(.95,.3+Math.abs(p[1]-pointer.start[1])*.025);
  if(kind==='erhu'||pointer.pressOnly||index===pointer.index||index<0){
    const touch=gesture(pointer.index,p,pressure);
    if(h){if(pointer.pressOnly){touch.response.pressOnly=true;touch.response.offset=pressure*4;}h.response=touch.response;
      h.voice?.pitch(variants[kind].tuning[pointer.index]+touch.response.offset);h.voice?.brightness?.(touch.response.brightness);
      h.voice?.expression?.(.3+Math.min(.4,Math.abs(p[0]-pointer.p[0])*.016));
      strings[pointer.index].contact=touch.t;feedback(pointer.index,touch.response);bendStrings(pointer.index);resume();}
  }else if(index>=0&&index!==pointer.index&&now-pointer.time>22){
    // Fill crossed strings so a quick sweep still sounds like a glissando.
    const direction=index>pointer.index?1:-1;
    for(let i=pointer.index+direction;direction>0?i<=index:i>=index;i+=direction){
      const touch=gesture(i,p,pressure),voiceId=i===index?id:`sweep:${event.pointerId}:${i}`;
      play(i,voiceId,.35+Math.min(.3,Math.hypot(p[0]-pointer.p[0],p[1]-pointer.p[1])*.01),touch);if(i!==index)setTimeout(()=>release(voiceId),100);
    }
    pointer.index=index;pointer.time=now;pointer.pressOnly=held.get(id)?.response.pressOnly||false;
  }
  pointer.p=p;
});
function releasePointer(event){release(`surface:${event.pointerId}`);pointers.delete(event.pointerId);}
for(const type of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,releasePointer);
section.addEventListener('keydown',event=>{
  if(event.repeat||event.altKey||event.metaKey||event.ctrlKey||event.target.matches('input,textarea'))return;
  const index=keys.indexOf(event.code.replace('Key',''));
  if(index>=0&&index<strings.length){event.preventDefault();play(index,`key:${event.code}`);}
  else if(event.target===stage&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();keyboardOffset=Math.max(0,Math.min(24,keyboardOffset+(event.key==='ArrowUp'?1:-1)));$('silk-feedback').textContent=`Keyboard position: +${keyboardOffset} semitones`;}
  else if(event.target===stage&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}
});
window.addEventListener('keyup',event=>release(`key:${event.code}`));window.addEventListener('blur',stopAll);
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){geometry();resume();Promise.allSettled(Object.keys(variants).map(preload));}else{stopAll();cancelAnimationFrame(frame);frame=0;}},{threshold:0}).observe(section);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAll();cancelAnimationFrame(frame);frame=0;}else resume();});
window.addEventListener('listening-garden-motion',()=>{for(const effect of stage.getAnimations())effect.finish();draw(performance.now());resume();});
new ResizeObserver(()=>{if(!transitioning)geometry();}).observe(stage);art.addEventListener('load',geometry);
window.GardenSilk=Object.freeze({get kind(){return kind;},get mode(){return mode;},async restore(saved){if(variants[saved.kind])await select(saved.kind);if(['open','press','harmonic'].includes(saved.mode)){mode=saved.mode==='harmonic'&&kind!=='guqin'?'press':saved.mode;updateTechnique();}}});
render();
})();

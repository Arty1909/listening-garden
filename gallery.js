(() => {
'use strict';
const garden = window.ListeningGarden;
const section = document.getElementById('instruments');
const stage = document.getElementById('instrument-stage');
const canvas = document.getElementById('strings');
const context = canvas.getContext('2d');
const story = document.getElementById('instrument-story');
const roof = document.getElementById('roof-sculpture');
const choices = [...document.querySelectorAll('.instrument-choice')];
const variants = [
  { key:'gold', name:'Golden courtyard', place:'CHINA · 缘', title:'Golden\ncourtyard', description:'Warm bronze tones beneath golden eaves. Brush a passing thought into the wind.', voice:'THE VOICE OF BRONZE', roof:'Golden Chinese pagoda roof', alphabet:'风月山水花雨云林心安静听竹梦春秋天地光影清和缘', color:[224,209,155], accent:[175,234,201], anchor:221, left:147, gap:9, length:7.9 },
  { key:'red', name:'Red rain', place:'JAPAN · 雨', title:'Red\nrain', description:'A soft, plucked note. A ripple of rain. Let the space between the sounds linger.', voice:'THE VOICE OF STRINGS', roof:'Vermilion Japanese roof', alphabet:'あいうえおかきくけこさしすせそたちつてとなにぬねの雨風花月', color:[241,178,165], accent:[231,220,183], anchor:208, left:143, gap:9.25, length:8.1 },
  { key:'steppe', name:'Steppe wind', place:'KAZAKHSTAN · ЖЕЛ', title:'Steppe\nwind', description:'An open sky, a wandering breeze. Long, soft notes with nowhere they need to be.', voice:'THE VOICE OF THE WIND', roof:'Ivory circular yurt canopy', alphabet:'АӘБВГҒДЕЖЗИІЙКҚЛМНҢОӨПРСТУҰҮФХҺЦЧШЫЭЮЯ', color:[209,230,211], accent:[165,209,214], anchor:219, left:131, gap:9.95, length:7.8 }
];
const columns = 35, rows = 52;
let current = 0, wanted = 0, changeToken = 0, transitioning = false;
let visible = false, animation = 0, lastTime = 0, time = 0, scaleX = 1, scaleY = 1;
let nodes = [], sparks = [], ripples = [], lastNoteColumn = -1, lastNoteTime = 0;
const pointer = { x:-1000, y:-1000, vx:0, vy:0, active:false };
const energy = Array(8).fill(0);
function initializeCloth() {
  const v = variants[current];
  nodes = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const hem = .97 + .03 * Math.sin(col / (columns - 1) * Math.PI);
    nodes.push({ x:v.left + col * v.gap, y:v.anchor + row * v.length * hem,
      dx:0,dy:0,vx:0,vy:0,char:v.alphabet[(row * 19 + col * 7 + row * col) % v.alphabet.length], phase:col * .35 + row * .1 });
  }
  pointer.active = false; lastNoteColumn = -1; sparks = []; ripples = [];
}
function resize() {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.75);
  if (!rect.width || !rect.height) return;
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  scaleX = rect.width / 600; scaleY = rect.height / 720;
  context.setTransform(dpr * scaleX,0,0,dpr * scaleY,0,0);
  draw();
}
function simulate(dt) {
  time += dt;
  const f = Math.min(2, dt * 60);
  for (let row = 1; row < rows; row++) for (let col = 0; col < columns; col++) {
    const n = nodes[row * columns + col];
    const above = nodes[(row - 1) * columns + col];
    const below = nodes[Math.min(rows - 1, row + 1) * columns + col];
    const before = nodes[row * columns + Math.max(0,col - 1)];
    const after = nodes[row * columns + Math.min(columns - 1,col + 1)];
    const loose = row / rows;
    const wind = (Math.sin(time * .65 + col * .13 + row * .09) * 2.3 + Math.sin(time * .4 + row * .17) * 1.1) * loose;
    let fx = (wind - n.dx) * .018 + ((above.dx + below.dx + before.dx + after.dx) / 4 - n.dx) * .2;
    let fy = -n.dy * .028 + ((above.dy + below.dy) / 2 - n.dy) * .13;
    if (pointer.active) {
      const dx = n.x + n.dx - pointer.x, dy = n.y + n.dy - pointer.y;
      const distance = Math.hypot(dx,dy);
      if (distance < 100) {
        const force = (1 - distance / 100) * Math.sqrt(loose);
        fx += (pointer.vx * .09 + dx / Math.max(distance,1) * 1.55) * force;
        fy += (pointer.vy * .045 + dy / Math.max(distance,1) * .55) * force;
      }
    }
    n.fx=fx;n.fy=fy;
  }
  // Calculate every force from the same frame before moving any node. Updating
  // neighbours in place adds energy to the cloth and causes runaway waves.
  for(let i=columns;i<nodes.length;i++){
    const n=nodes[i];
    n.vx = (n.vx + n.fx * f) * Math.pow(.915,f); n.vy = (n.vy + n.fy * f) * Math.pow(.9,f);
    n.dx = Math.max(-100,Math.min(100,n.dx + n.vx * f)); n.dy = Math.max(-42,Math.min(42,n.dy + n.vy * f));
  }
  pointer.vx *= .8; pointer.vy *= .8;
  for (let i = 0; i < energy.length; i++) energy[i] *= Math.pow(.955,f);
  for (const spark of sparks) { spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.life -= dt; }
  sparks = sparks.filter(spark => spark.life > 0);
  for (const ripple of ripples) { ripple.radius += dt * 47; ripple.life -= dt; }
  ripples = ripples.filter(ripple => ripple.life > 0);
}
function draw() {
  context.clearRect(0,0,600,720);
  if (!nodes.length) return;
  const v = variants[current];
  context.lineWidth = .55;
  for (let col = 0; col < columns; col++) {
    const band = Math.min(7,Math.floor(col / columns * 8));
    context.strokeStyle = `rgba(${v.color.join(',')},${.16 + energy[band] * .4})`;
    context.beginPath();
    for (let row = 0; row < rows; row++) { const n = nodes[row * columns + col]; if (!row) context.moveTo(n.x,n.y); else context.lineTo(n.x+n.dx,n.y+n.dy); }
    context.stroke();
  }
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = current === 2 ? '8.5px Georgia, serif' : '8.7px "Microsoft YaHei", serif';
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i], band = Math.min(7,Math.floor((i % columns) / columns * 8));
    const palette = energy[band] > .2 || i % 9 === 0 ? v.accent : v.color;
    context.fillStyle = `rgba(${palette.join(',')},${.72 + Math.sin(time * .7 + n.phase) * .12 + energy[band] * .14})`;
    context.fillText(n.char,n.x+n.dx,n.y+n.dy);
  }
  for (const spark of sparks) {
    context.fillStyle = `rgba(${v.accent.join(',')},${Math.min(.8,spark.life)})`;
    context.beginPath(); context.arc(spark.x,spark.y,1.2,0,Math.PI*2); context.fill();
  }
  for (const ripple of ripples) {
    context.strokeStyle = `rgba(${v.color.join(',')},${ripple.life*.17})`; context.lineWidth = 1;
    context.beginPath(); context.ellipse(ripple.x,671,ripple.radius,ripple.radius*.16,0,0,Math.PI*2); context.stroke();
  }
}
function animate(timestamp) {
  animation = 0; if (!visible || document.hidden) return;
  const dt = Math.min((timestamp - (lastTime || timestamp))/1000,.033); lastTime = timestamp;
  if (garden.motion) simulate(dt);
  draw(); if (garden.motion) animation = requestAnimationFrame(animate);
}
function resume() { if (!animation && visible) { lastTime = 0; animation = requestAnimationFrame(animate); } }
function playNote(index, x, y, strength=.1) {
  const now = performance.now();
  if (now - lastNoteTime < 50) return;
  lastNoteTime = now; energy[index] = 1;
  garden.sound.strike(index,strength,variants[current].key);
  if (garden.motion) {
    for (let i=0;i<8;i++) sparks.push({x,y,vx:(Math.random()-.5)*65,vy:-15-Math.random()*35,life:.5+Math.random()*.8});
    ripples.push({x,radius:10,life:1.3});
    if (sparks.length>100) sparks.splice(0,sparks.length-100);
    if (ripples.length>15) ripples.shift();
  }
  draw();
}
function pointerPosition(event) {
  const rect=canvas.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width*600, y=(event.clientY-rect.top)/rect.height*720;
  pointer.vx=pointer.active?Math.max(-50,Math.min(50,x-pointer.x)):0;
  pointer.vy=pointer.active?Math.max(-50,Math.min(50,y-pointer.y)):0;
  pointer.x=x;pointer.y=y;pointer.active=true;
  return {x,y};
}
function pointerNote(x,y,force=false) {
  const v=variants[current];
  if (x < v.left-25 || x > v.left + (columns-1)*v.gap+25 || y<v.anchor || y>662) {lastNoteColumn=-1;return;}
  const band=Math.min(7,Math.max(0,Math.floor((x-v.left)/(columns*v.gap)*8)));
  if(force||band!==lastNoteColumn){playNote(band,x,y,.09+Math.min(.06,Math.abs(pointer.vx)*.002));lastNoteColumn=band;}
}
canvas.addEventListener('pointerdown',async event=>{
  if(transitioning)return;
  canvas.setPointerCapture(event.pointerId);stage.focus({preventScroll:true});
  const {x,y}=pointerPosition(event);pointer.vx=20;
  await garden.unlockInstruments();pointerNote(x,y,true);
});
canvas.addEventListener('pointermove',event=>{if(transitioning)return;const{x,y}=pointerPosition(event);pointerNote(x,y);});
function releasePointer(){pointer.active=false;lastNoteColumn=-1;}
canvas.addEventListener('pointerleave',releasePointer);canvas.addEventListener('pointercancel',releasePointer);
canvas.addEventListener('pointerup',event=>{if(event.pointerType!=='mouse')releasePointer();});

function updateInstrument() {
  const v=variants[current];
  roof.className=`roof-sculpture roof-${v.key}`;roof.setAttribute('aria-label',v.roof);
  section.dataset.instrument=String(current);
  stage.setAttribute('aria-label',`${v.name}. Drag across the hanging letters to play, or use keys A S D F G H J K.`);
  document.getElementById('place-label').textContent=v.place;
  document.getElementById('instrument-title').textContent=v.title;
  document.getElementById('instrument-description').textContent=v.description;
  document.getElementById('voice-label').textContent=v.voice;
  choices.forEach((button,index)=>{button.classList.toggle('selected',index===current);button.setAttribute('aria-pressed',String(index===current));});
  energy.fill(0);initializeCloth();draw();window.dispatchEvent(new Event('garden-preference-change'));
}
async function selectInstrument(index) {
  const target=(index+variants.length)%variants.length;
  if(target===wanted)return;
  const direction=target>wanted?1:-1;wanted=target;
  const token=++changeToken;transitioning=true;
  for(const element of [stage,story]) for(const effect of element.getAnimations())effect.cancel();
  if(garden.motion){
    const exit=stage.animate([{opacity:1,transform:'translateX(0) rotateY(0deg)',filter:'blur(0px)'},{opacity:0,transform:`translateX(${-direction*60}px) rotateY(${-direction*15}deg) scale(.94)`,filter:'blur(8px)'}],{duration:240,easing:'ease-in',fill:'forwards'});
    story.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(12px)'}],{duration:180,fill:'forwards'});
    await exit.finished.catch(()=>{});
  }
  if(token!==changeToken)return;
  current=target;updateInstrument();
  for(const element of [stage,story])for(const effect of element.getAnimations())effect.cancel();
  if(garden.motion){
    const enter=stage.animate([{opacity:0,transform:`translateX(${direction*70}px) rotateY(${direction*14}deg) scale(.94)`,filter:'blur(7px)'},{opacity:1,transform:'translateX(0) rotateY(0deg) scale(1)',filter:'blur(0px)'}],{duration:680,easing:'cubic-bezier(.16,1,.3,1)'});
    story.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:480,delay:100,fill:'backwards'});
    await enter.finished.catch(()=>{});
  }
  if(token===changeToken)transitioning=false;
}
document.getElementById('previous-instrument').addEventListener('click',()=>selectInstrument(wanted-1));
document.getElementById('next-instrument').addEventListener('click',()=>selectInstrument(wanted+1));
choices.forEach(button=>button.addEventListener('click',()=>selectInstrument(Number(button.dataset.instrument))));
stage.addEventListener('keydown',async event=>{
  if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();selectInstrument(wanted+(event.key==='ArrowRight'?1:-1));return;}
  const index=['KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK'].indexOf(event.code);
  if(index<0||transitioning)return;event.preventDefault();
  await garden.unlockInstruments();
  const v=variants[current],col=Math.min(columns-1,Math.floor((index+.5)*columns/8)),x=v.left+col*v.gap;
  for(let row=1;row<rows;row++){const n=nodes[row*columns+col];n.vx+=8*(row/rows);}
  playNote(index,x,v.anchor+220,.13);resume();
});
new IntersectionObserver(([entry])=>{
  visible=entry.isIntersecting;
  if(visible)resume();else{cancelAnimationFrame(animation);animation=0;releasePointer();}
},{threshold:0}).observe(section);
window.addEventListener('listening-garden-motion',()=>{if(garden.motion)resume();else{cancelAnimationFrame(animation);animation=0;for(const element of[stage,story])for(const effect of element.getAnimations())effect.finish();draw();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(animation);animation=0;}else resume();});
window.addEventListener('resize',resize);
new ResizeObserver(resize).observe(stage);
window.GardenChimes=Object.freeze({get choice(){return current;},restore(index){if(Number.isInteger(index)&&index>=0&&index<variants.length)return selectInstrument(index);}});
initializeCloth();updateInstrument();resize();
})();

(() => {
'use strict';
const garden=window.ListeningGarden,$=id=>document.getElementById(id),section=$('learn');
const keys='ASDFGHJKLQWERTYUIOPZX'.split('');
const interpolate=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const courses={
  guqin:{name:'Guqin',tuning:[36,38,41,43,45,48,50],phrase:[0,1,3,4,3,1,0,5],beat:650,caption:'Seven open strings · a quiet beginning',title:'Let a single string ring.',intro:'Tap the seven strings or use A S D F G H J. Leave a little silence between notes and listen to each one fade.',melody:'Follow a quiet phrase.',instruction:'Listen to the guqin phrase, then follow the glowing strings at your own pace. Let each note breathe.',tip:'In Silk: try Press & slide for changing pitch and Harmonics for bell-like tones.',segments:[.342,.39,.439,.486,.532,.58,.629].map((y,i)=>[[.093,y],[.956,.44+i*.0217]])},
  guzheng:{name:'Guzheng',tuning:[38,40,42,45,47,50,52,54,57,59,62,64,66,69,71,74,76,78,81,83,86],phrase:[5,6,7,9,10,9,7,5],beat:470,caption:'21 open strings · a rising cascade',title:'Discover a wider range.',intro:'Pluck a string, then explore its neighbours. All 21 strings are playable. Swipe the note row sideways to reach the higher notes.',melody:'Climb, then return.',instruction:'Follow the bright ascending phrase and its return. The note row follows the next highlighted string for you.',tip:'In Silk: hold a string left of its bridge, then pluck on the right to hear a pitch bend.',segments:Array.from({length:21},(_,i)=>[interpolate([.12,.214],[.093,.679],i/20),interpolate([.875,.277],[.925,.692],i/20)])},
  pipa:{name:'Pipa',tuning:[45,50,52,57],phrase:[0,2,1,3,2,1,2,0],beat:410,caption:'Four open strings · short, clear notes',title:'Find a plucking rhythm.',intro:'Tap the four strings or use A S D F. Try alternating between the lower and higher strings with clear, separate plucks.',melody:'A little call and answer.',instruction:'Listen for the alternating low and high notes. Follow the highlighted strings; the exercise checks note order, so take your time.',tip:'In Silk: choose Frets and touch different positions along a string to explore more notes.',segments:[.487,.501,.515,.528].map((x,i)=>[[x,.212],[[.467,.49,.514,.538][i],.893]])},
  erhu:{name:'Erhu',tuning:[62,69],phrase:[0,0,1,0,1,1,0,1],beat:920,caption:'Two open strings · hold to bow',title:'Give the bow time.',intro:'Hold a string, a note button, or A / S to sustain the bow. Release to let it fall silent. Try an even, unhurried sound.',melody:'A conversation in two notes.',instruction:'Listen to the two-string bowing phrase, then hold each highlighted note. The exercise follows note order, without judging your timing.',tip:'In Silk: hold and slide toward the body for higher notes; move across the string to shape the bow.',segments:[[[.468,.372],[.446,.949]],[[.478,.372],[.462,.949]]]}
};
let kind='guqin',wanted=kind,lesson=0,step=0,epoch=0,change=0,changing=false,playing=false,visible=false;
const phone=matchMedia('(max-width:650px)');
const touchIntros={guqin:'Touch a string or tap a note below. Leave a little silence between notes and listen to each one fade.',guzheng:'Touch the strings or tap the notes. Swipe the note row sideways to explore all 21 strings.',pipa:'Tap the four strings or the notes below. Alternate between lower and higher notes with separate plucks.',erhu:'Hold a string or a note button to sustain the bow. Release to let it fall silent.'};
function lessonCopy(){const v=courses[kind];$('lesson-description').textContent=lesson===0?(phone.matches?touchIntros[kind]:v.intro):lesson===1?v.instruction:`Record your ${v.name} practice, or move between instruments while recording. Stop to preview, name and download your melody.`;}
phone.addEventListener('change',lessonCopy);
const timers=new Set(),voices=new Set(),held=new Map();let buttons=[],strings=[];
const noteName=midi=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]+(Math.floor(midi/12)-1);
function later(fn,ms){const t=setTimeout(()=>{timers.delete(t);fn();},ms);timers.add(t);return t;}
function release(id){const entry=held.get(id);if(!entry)return;entry.down=false;if(entry.kind==='erhu'){entry.voice?.stop();voices.delete(entry.voice);}held.delete(id);}
function stopDemo(){epoch++;playing=false;for(const t of timers)clearTimeout(t);timers.clear();for(const voice of voices)voice.stop();voices.clear();for(const id of held.keys())release(id);$('lesson-demo').textContent='Hear the phrase';for(const b of [...buttons,...strings])b.classList.remove('sounding');}
function reveal(index){const button=buttons[index],row=$('practice-keys');if(!button)return;const b=button.getBoundingClientRect(),r=row.getBoundingClientRect();if(b.left<r.left||b.right>r.right)row.scrollTo({left:row.scrollLeft+b.left-r.left-(r.width-b.width)/2,behavior:garden.motion?'smooth':'instant'});}
function progress(){
  const phrase=courses[kind].phrase;
  for(let i=0;i<buttons.length;i++){const expected=lesson===1&&!playing&&step<phrase.length&&phrase[step]===i;buttons[i].classList.toggle('expected',expected);strings[i].classList.toggle('expected',expected);}
  $('lesson-progress').replaceChildren(...phrase.map((note,index)=>{const dot=document.createElement('span');dot.textContent=String(index+1);dot.className=index<step?'done':index===step?'next':'';return dot;}));
  $('lesson-progress').setAttribute('aria-label',`${step} of ${phrase.length} notes completed`);
  if(lesson===1&&step<phrase.length&&!playing)reveal(phrase[step]);
}
function idleText(){return lesson===2?'Choose Include background music if you want the backing track in your take.':lesson===1?'Play the highlighted string to begin.':kind==='erhu'?'Hold a note to bow; release to stop.':'Try any string below.';}
function select(index){
  stopDemo();lesson=index;step=0;const v=courses[kind];
  document.querySelectorAll('[data-lesson]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.lesson)===lesson)));
  $('lesson-title').textContent=index===0?v.title:index===1?v.melody:'Keep your own moment.';
  lessonCopy();
  $('lesson-status').textContent=idleText();$('lesson-progress').hidden=index!==1;$('lesson-restart').hidden=index!==1;$('lesson-record').hidden=index!==2;progress();
}
async function sound(index,demonstration=false,entry=null){
  if(changing)return;const token=epoch,current=kind,v=courses[current];
  await garden.unlockInstruments();if(token!==epoch||!visible||changing)return;
  if(!garden.sound.chimes){garden.toast('Turn on Sound to hear the practice strings.');return;}
  if(entry&&!entry.down&&current==='erhu')return;
  const voice=current==='erhu'?garden.sound.bow(v.tuning[index],.48):garden.sound.startPluck(v.tuning[index],current,.46,{brightness:.65});
  if(voice){for(const old of voices)if(old.ended)voices.delete(old);voices.add(voice);if(entry)entry.voice=voice;}
  const elements=[buttons[index],strings[index]];for(const el of elements)el.classList.add('sounding');
  later(()=>{for(const el of elements)el.classList.remove('sounding');},current==='erhu'?750:400);
  if(current==='erhu'&&!entry&&voice)later(()=>{voice.stop();voices.delete(voice);},demonstration?v.beat*.75:450);
  if(demonstration){reveal(index);return;}
  if(lesson===1&&step<v.phrase.length){if(index===v.phrase[step]){step++;$('lesson-status').textContent=step===v.phrase.length?`You played the ${v.name} phrase. Try another instrument, or make it your own.`:`${step} of ${v.phrase.length} notes — follow the next glow.`;}else $('lesson-status').textContent='Listen to that note. Now try the highlighted string.';progress();}
  else $('lesson-status').textContent=`${v.name} · ${noteName(v.tuning[index])} · ${current==='erhu'?'hold to sustain the bow':'let the note ring'}.`;
}
function press(index,id){if(changing)return;if(playing){stopDemo();progress();}release(id);const entry={index,kind,down:true,voice:null};held.set(id,entry);sound(index,false,entry);}
function bind(target,index){
  target.addEventListener('pointerdown',event=>{if(event.button!==0||changing)return;target.setPointerCapture(event.pointerId);press(index,`pointer:${event.pointerId}`);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])target.addEventListener(event,e=>release(`pointer:${e.pointerId}`));
  target.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();press(index,`button:${index}`);}});
  target.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();release(`button:${index}`);}});
  target.addEventListener('click',e=>{if(e.detail===0){if(playing){stopDemo();progress();}sound(index);}});
}
function geometry(){
  const container=$('practice-instrument').getBoundingClientRect(),art=$('practice-art').getBoundingClientRect();if(!container.width||!container.height)return;
  // Match object-fit: contain, including its letterboxing, so strings stay on the art.
  const image=$('practice-art'),scale=Math.min(art.width/image.naturalWidth,art.height/image.naturalHeight);
  if(!Number.isFinite(scale))return;
  const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
  const left=art.left-container.left+(art.width-width)/2,top=art.top-container.top+(art.height-height)/2;
  const point=p=>[(left+p[0]*width)/container.width*1000,(top+p[1]*height)/container.height*600];
  const lines=courses[kind].segments.map(segment=>segment.map(point));
  for(let i=0;i<strings.length;i++){
    const [a,b]=lines[i],d=`M${a} L${b}`,hit=strings[i].previousElementSibling;
    // Keep adjacent hit areas separate, even when the image becomes small.
    let spacing=28;
    for(const j of [i-1,i+1])if(lines[j])for(const t of [0,.5,1]){
      const p=interpolate(a,b,t),q=interpolate(...lines[j],t);
      spacing=Math.min(spacing,Math.hypot(p[0]-q[0],p[1]-q[1]));
    }
    strings[i].setAttribute('d',d);hit.setAttribute('d',d);hit.style.strokeWidth=String(spacing*.8);
  }
}
function render(){
  const v=courses[kind];section.dataset.practiceKind=kind;$('practice-area').setAttribute('aria-label',`Practice ${v.name}`);$('practice-name').textContent=v.name.toUpperCase();$('practice-caption').textContent=v.caption;$('practice-count').textContent=`0${Object.keys(courses).indexOf(kind)+1} / 04`;$('practice-tip').textContent=v.tip;
  $('practice-art').src=`assets/${kind}.png`;$('practice-art').alt=`${v.name} for guided practice`;
  $('practice-keys').replaceChildren();$('practice-strings').replaceChildren();$('practice-keys').scrollLeft=0;buttons=[];strings=[];
  v.tuning.forEach((midi,i)=>{
    const button=document.createElement('button');button.className='practice-key';button.innerHTML=`${noteName(midi)}<small>${keys[i]}</small>`;button.setAttribute('aria-label',`Practice ${v.name} ${noteName(midi)}, key ${keys[i]}`);bind(button,i);buttons.push(button);$('practice-keys').append(button);
    const hit=document.createElementNS('http://www.w3.org/2000/svg','path'),wire=document.createElementNS('http://www.w3.org/2000/svg','path');
    hit.setAttribute('class','practice-hit');hit.setAttribute('role','button');hit.setAttribute('tabindex','0');hit.setAttribute('aria-label',`Play ${v.name} practice string ${i+1}, ${noteName(midi)}`);wire.setAttribute('class','practice-wire');wire.setAttribute('aria-hidden','true');bind(hit,i);$('practice-strings').append(hit,wire);strings.push(wire);
  });
  document.querySelectorAll('[data-learn-instrument]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.learnInstrument===kind)));
  select(lesson);geometry();
}
async function choose(next){
  if(!courses[next]||next===wanted)return;
  const direction=Object.keys(courses).indexOf(next)>Object.keys(courses).indexOf(wanted)?1:-1;wanted=next;const token=++change;changing=true;stopDemo();
  const stage=$('practice-instrument');for(const animation of stage.getAnimations())animation.cancel();
  const image=new Image();image.src=`assets/${next}.png`;
  try{await image.decode();}catch{if(token===change){wanted=kind;changing=false;garden.toast('The instrument image could not load. Try again.');}return;}
  if(token!==change)return;
  if(garden.motion)await stage.animate([{opacity:1,transform:'translateX(0) rotateY(0)'},{opacity:0,transform:`translateX(${-direction*35}px) rotateY(${-direction*9}deg)`}],{duration:180,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});
  if(token!==change)return;kind=next;for(const a of stage.getAnimations())a.cancel();render();
  if(garden.motion)await stage.animate([{opacity:0,transform:`translateX(${direction*35}px) rotateY(${direction*9}deg)`},{opacity:1,transform:'translateX(0) rotateY(0)'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'}).finished.catch(()=>{});
  if(token===change){changing=false;geometry();}
}
function next(direction){const names=Object.keys(courses);choose(names[(names.indexOf(wanted)+direction+names.length)%names.length]);}
$('learn-previous').addEventListener('click',()=>next(-1));$('learn-next').addEventListener('click',()=>next(1));
for(const button of document.querySelectorAll('[data-learn-instrument]'))button.addEventListener('click',()=>choose(button.dataset.learnInstrument));
$('lesson-demo').addEventListener('click',async()=>{
  if(changing)return;if(playing){stopDemo();progress();return;}const pending=epoch;
  await garden.unlockInstruments();if(!visible||pending!==epoch||changing)return;if(!garden.sound.chimes){garden.toast('Turn on Sound to hear the phrase.');return;}
  stopDemo();playing=true;step=0;progress();const token=epoch,v=courses[kind];$('lesson-demo').textContent='Stop listening';$('lesson-status').textContent=`Listen to the ${v.name} and watch the strings.`;
  v.phrase.forEach((index,i)=>later(()=>{if(epoch===token)sound(index,true);},i*v.beat));
  later(()=>{if(epoch!==token)return;playing=false;$('lesson-demo').textContent='Hear the phrase';$('lesson-status').textContent=idleText();progress();},v.phrase.length*v.beat+400);
});
$('lesson-restart').addEventListener('click',()=>select(1));$('lesson-record').addEventListener('click',()=>window.GardenRecorder.open());
for(const b of document.querySelectorAll('[data-lesson]'))b.addEventListener('click',()=>select(Number(b.dataset.lesson)));
document.addEventListener('keydown',event=>{if(!visible||event.target.closest('.audio-area')||event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.target.closest('input,textarea,select'))return;const i=keys.indexOf(event.code.replace('Key',''));if(i>=0&&i<buttons.length){event.preventDefault();press(i,`key:${event.code}`);}else if(['ArrowLeft','ArrowRight'].includes(event.key)&&event.target.closest('#learn')&&!event.target.closest('#practice-keys')){event.preventDefault();next(event.key==='ArrowRight'?1:-1);}});
window.addEventListener('keyup',event=>release(`key:${event.code}`));window.addEventListener('blur',()=>{for(const id of held.keys())release(id);});
new IntersectionObserver(([entry])=>{visible=entry.intersectionRatio>.6;if(!visible){stopDemo();progress();}else geometry();},{threshold:[0,.6,1]}).observe(section);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopDemo();progress();}});
window.addEventListener('listening-garden-motion',()=>{for(const a of $('practice-instrument').getAnimations())a.finish();});
new ResizeObserver(geometry).observe($('practice-instrument'));$('practice-art').addEventListener('load',geometry);
render();
})();

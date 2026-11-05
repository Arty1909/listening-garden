(() => {
'use strict';
const key='listening-garden-preferences-v1',garden=window.ListeningGarden,$=id=>document.getElementById(id);
let restoring=false;
function snapshot(){return{version:1,music: garden.sound.musicVolume,instruments:garden.sound.instrumentVolume,chimes:garden.sound.chimes,motion:garden.motion,effect:garden.sound.fileStyle,blend:garden.sound.fileStyleAmount,silk:{kind:window.GardenSilk.kind,mode:window.GardenSilk.mode},chime:window.GardenChimes.choice};}
function save(){
  if(restoring||!$('remember-settings').checked)return;
  try{localStorage.setItem(key,JSON.stringify(snapshot()));$('preference-status').textContent='Saved on this device. Music starts only when you press Play.';$('forget-settings').hidden=false;}
  catch{$('remember-settings').checked=false;$('preference-status').textContent='This browser cannot save settings. Your current choices still work.';}
}
function forget(){try{localStorage.removeItem(key);$('remember-settings').checked=false;$('forget-settings').hidden=true;$('preference-status').textContent='Saved settings removed. Current choices stay until you leave.';}catch{$('preference-status').textContent='Saved settings could not be removed. Please check browser storage permissions.';}}
async function restore(value){
  if(!value||value.version!==1)return;
  restoring=true;$('remember-settings').checked=true;$('forget-settings').hidden=false;
  try{
    for(const [field,id,setter] of [['music','music-volume','setMusicVolume'],['instruments','instrument-volume','setInstrumentVolume']]){
      if(typeof value[field]==='number'&&Number.isFinite(value[field])){const v=Math.max(0,Math.min(1,value[field]));garden.sound[setter](v);$(id).value=Math.round(v*100);$(id+'-value').value=`${Math.round(v*100)}%`;}
    }
    if(typeof value.chimes==='boolean')garden.sound.setInstruments(value.chimes);
    if(typeof value.motion==='boolean')garden.setMotion(value.motion);
    if(typeof value.effect==='boolean')garden.sound.setFileStyle(value.effect,Number.isFinite(value.blend)?value.blend:.75);
    $('file-style-amount').value=Math.round(garden.sound.fileStyleAmount*100);
    await window.GardenChimes.restore(value.chime);
    if(value.silk&&typeof value.silk==='object')await window.GardenSilk.restore(value.silk);
    garden.syncPlayer();$('preference-status').textContent='Your saved settings are restored. Reopen any music file to use it.';
  }finally{restoring=false;}
}
$('remember-settings').addEventListener('change',()=>{$('remember-settings').checked?save():forget();});
$('forget-settings').addEventListener('click',forget);
for(const event of ['input','change','click'])document.addEventListener(event,e=>{if(e.target.closest('#sound-settings,#sound-toggle,#motion-toggle'))queueMicrotask(save);});
window.addEventListener('garden-preference-change',save);window.addEventListener('listening-garden-motion',save);
try{const saved=JSON.parse(localStorage.getItem(key)||'null');restore(saved).catch(()=>{$('preference-status').textContent='Some saved choices could not be restored.';});}catch{$('preference-status').textContent='No readable saved settings. Choose Remember my settings to save new ones.';}
})();

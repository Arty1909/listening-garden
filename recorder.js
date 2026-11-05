(function(root){
'use strict';
class GardenCapture {
  constructor(sound){this.sound=sound;this.state='idle';this.onstate=()=>{};this.onready=()=>{};this.onerror=()=>{};}
  async start(includeMusic=false){
    if(this.state!=='idle')return;
    if(!root.MediaRecorder)throw new Error('Recording is unavailable in this browser. Try a recent Chrome, Edge, Firefox or Safari.');
    this.state='starting';this.onstate(this.state);
    try{
      await this.sound.init();
      const ac=this.sound.context;
      this.destination=ac.createMediaStreamDestination();this.level=ac.createGain();this.level.gain.value=.7;
      this.limiter=ac.createDynamicsCompressor();this.limiter.threshold.value=-18;this.limiter.knee.value=20;this.limiter.ratio.value=6;
      this.inputs=[this.sound.instruments];if(includeMusic)this.inputs.push(this.sound.music);
      for(const node of this.inputs)node.connect(this.level);
      this.level.connect(this.limiter);this.limiter.connect(this.destination);
      const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>root.MediaRecorder.isTypeSupported(type));
      this.recorder=new root.MediaRecorder(this.destination.stream,mime?{mimeType:mime}:{});
      this.chunks=[];this.bytes=0;this.failed=false;
      this.recorder.ondataavailable=event=>{if(event.data.size){this.chunks.push(event.data);this.bytes+=event.data.size;if(this.bytes>64*1024*1024)this.stop();}};
      this.recorder.onerror=()=>{this.failed=true;this.onerror(new Error('Recording was interrupted. Your previous take is still available.'));this.stop();};
      this.recorder.onstop=()=>{
        const type=this.recorder.mimeType||this.chunks[0]?.type||'audio/webm';
        const blob=new Blob(this.chunks,{type});this.cleanup();this.state='idle';this.onstate(this.state);
        if(!this.failed&&blob.size)this.onready(blob);else if(!this.failed)this.onerror(new Error('No audio was captured. Please try again.'));
      };
      this.recorder.start(1000);this.started=Date.now();this.state='recording';this.onstate(this.state);
      this.limit=setTimeout(()=>this.stop(),5*60*1000);
    }catch(error){this.cleanup();this.state='idle';this.onstate(this.state);throw error;}
  }
  stop(){if(this.state!=='recording')return;this.state='stopping';clearTimeout(this.limit);this.onstate(this.state);this.recorder.stop();}
  cleanup(){clearTimeout(this.limit);for(const node of this.inputs||[])try{node.disconnect(this.level);}catch{}this.inputs=[];this.level?.disconnect();this.limiter?.disconnect();for(const track of this.destination?.stream.getTracks()||[])track.stop();}
}
if(typeof module!=='undefined'&&module.exports){module.exports=GardenCapture;return;}
root.GardenCapture=GardenCapture;
const garden=root.ListeningGarden,$=id=>document.getElementById(id),capture=new GardenCapture(garden.sound);
let timer,takeURL=null,extension='webm';
function time(){const seconds=Math.floor((Date.now()-capture.started)/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
function close(){$('record-panel').hidden=true;$('record-chip').setAttribute('aria-expanded','false');}
function open(){garden.setSettings(false);$('record-panel').hidden=false;$('record-chip').setAttribute('aria-expanded','true');}
function nameDownload(){const name=$('take-name').value.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g,'').slice(0,70)||'Garden melody';$('take-download').download=`${name}.${extension}`;}
capture.onstate=state=>{
  clearInterval(timer);const recording=state==='recording',busy=state==='starting'||state==='stopping';
  document.body.classList.toggle('is-recording',recording);$('record-backing').disabled=state!=='idle';$('record-start').disabled=busy;
  $('record-chip').disabled=busy;$('record-action').textContent=recording?'Stop & keep take':state==='starting'?'Preparing…':state==='stopping'?'Finishing…':'Start recording';
  $('record-chip-label').textContent=recording?'0:00':'Record a moment';$('record-chip').setAttribute('aria-label',recording?'Stop recording':'Open recorder');
  if(recording){$('record-status').textContent='Recording the garden. You can close this panel and keep playing.';timer=setInterval(()=>{$('record-chip-label').textContent=`${time()}`;},250);}
};
capture.onready=async blob=>{
  $('record-start').disabled=true;$('record-chip').disabled=true;
  $('record-status').textContent='Preparing your melody…';
  let duration='';
  try{
    const buffer=await garden.sound.context.decodeAudioData(await blob.arrayBuffer());
    // WAV has a seekable duration and plays in browsers and ordinary music apps.
    const channels=buffer.numberOfChannels,length=buffer.length,bytes=length*channels*2;
    const data=new ArrayBuffer(44+bytes),view=new DataView(data);
    const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
    text(0,'RIFF');view.setUint32(4,36+bytes,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,bytes,true);
    const samples=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
    for(let i=0,offset=44;i<length;i++)for(let c=0;c<channels;c++,offset+=2){const value=Math.max(-1,Math.min(1,samples[c][i]));view.setInt16(offset,value<0?value*32768:value*32767,true);}
    blob=new Blob([data],{type:'audio/wav'});duration=`${buffer.duration.toFixed(1)} s · `;
  }catch{/* Keep the original playable container when browser decoding is unavailable. */}
  $('take-preview').pause();if(takeURL)URL.revokeObjectURL(takeURL);takeURL=URL.createObjectURL(blob);
  extension=blob.type.includes('wav')?'wav':blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':'webm';
  $('take-preview').src=takeURL;$('take-download').href=takeURL;nameDownload();$('record-take').hidden=false;
  $('take-format').textContent=`${extension.toUpperCase()} audio · ${duration}${(blob.size/1024).toFixed(1)} KB · saved only when downloaded`;
  $('record-status').textContent='Your take is ready. Listen back, name it and download.';
  $('record-start').disabled=false;$('record-chip').disabled=false;open();
};
capture.onerror=error=>{$('record-status').textContent=error.message;open();};
async function start(){
  if(capture.state==='recording'){capture.stop();return;}
  $('take-preview').pause();
  if(!garden.sound.chimes&&!($('record-backing').checked&&garden.sound.playing)){garden.toast('Enable instrument sounds or play background music first.');return;}
  try{await capture.start($('record-backing').checked);close();garden.toast('Recording started. Play in any garden; press the red button to finish.');}catch(error){capture.onerror(error);}
}
$('record-start').addEventListener('click',start);
$('record-chip').addEventListener('click',()=>capture.state==='recording'?capture.stop():$('record-panel').hidden?open():close());
$('close-recorder').addEventListener('click',()=>{close();$('record-chip').focus();});
$('take-listen').addEventListener('click',async()=>{
  const preview=$('take-preview');
  try{if(preview.paused)await preview.play();else preview.pause();}catch{$('record-status').textContent='Preview is unavailable here. Download the take to listen in your music app.';}
});
function previewState(){const paused=$('take-preview').paused;$('take-listen').textContent=paused?'Play take':'Pause';$('take-listen').setAttribute('aria-label',paused?'Play recording':'Pause recording');}
for(const event of ['play','pause','ended'])$('take-preview').addEventListener(event,previewState);
$('take-preview').addEventListener('timeupdate',()=>{const audio=$('take-preview'),seconds=Math.floor(audio.currentTime);$('take-clock').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;$('take-seek').value=Number.isFinite(audio.duration)&&audio.duration>0?audio.currentTime/audio.duration*100:0;});
$('take-seek').addEventListener('input',()=>{if(Number.isFinite($('take-preview').duration))$('take-preview').currentTime=Number($('take-seek').value)/100*$('take-preview').duration;});
$('take-name').addEventListener('input',nameDownload);
document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
window.addEventListener('pagehide',()=>capture.stop());
root.GardenRecorder=Object.freeze({open,close});
})(typeof window!=='undefined'?window:globalThis);

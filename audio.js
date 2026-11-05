(function (root) {
'use strict';

// Music and instruments have separate gain buses. Pausing a backing track must
// never suspend the AudioContext or disable the playable instruments.
class SoundGarden {
  constructor() {
    this.context = null; this.playing = false; this.musicVolume = .45; this.instrumentVolume = .65; this.chimes = true;
    this.timer = null; this.nextNote = 0; this.step = 0; this.lastChime = -1;
    this.source = 'ambient'; this.fileURL = null; this.musicVoices = new Set(); this.instrumentVoices = new Set();
    this.pluckCache=new Map();this.bowedVoices=new Set();
    this.fileStyle=false;this.fileStyleAmount=.75;
    this.audio = new Audio(); this.audio.loop = true; this.audio.preload = 'metadata';
  }
  async init() {
    if (!this.context) {
      const Context = root.AudioContext || root.webkitAudioContext;
      if (!Context) throw new Error('Web Audio is unavailable.');
      const ac = this.context = new Context();
      this.master = ac.createGain(); this.master.gain.value = .7;
      const limiter = ac.createDynamicsCompressor(); limiter.threshold.value = -18; limiter.knee.value = 20; limiter.ratio.value = 6;
      this.master.connect(limiter); limiter.connect(ac.destination);
      this.music = ac.createGain(); this.music.gain.value = 0; this.music.connect(this.master);
      this.instruments = ac.createGain(); this.instruments.gain.value = this.chimes ? this.instrumentVolume : 0; this.instruments.connect(this.master);
      this.echo = ac.createDelay(2); this.echo.delayTime.value = .36;
      const feedback = ac.createGain(); feedback.gain.value = .23;
      const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2300;
      this.echo.connect(filter); filter.connect(feedback); feedback.connect(this.echo); feedback.connect(this.instruments);
      this.fileNode = ac.createMediaElementSource(this.audio);
      this.connectFileProcessing(ac,this.fileNode,this.music);
      this.setFileStyle(this.fileStyle,this.fileStyleAmount);
    }
    if (this.context.state !== 'running') await this.context.resume();
  }
  // Shared by live playback and OfflineAudioContext signal regression checks.
  connectFileProcessing(ac,input,output) {
    this.fileDry=ac.createGain();this.fileWet=ac.createGain();this.fileOutput=ac.createGain();
    input.connect(this.fileDry);this.fileDry.connect(this.fileOutput);this.fileWet.connect(this.fileOutput);this.fileOutput.connect(output);
    const highpass=ac.createBiquadFilter(),warmth=ac.createBiquadFilter(),air=ac.createBiquadFilter();
    highpass.type='highpass';highpass.frequency.value=180;
    warmth.type='peaking';warmth.frequency.value=430;warmth.Q.value=.7;warmth.gain.value=-4;
    air.type='lowpass';air.frequency.value=2800;air.Q.value=.5;
    input.connect(highpass);highpass.connect(warmth);warmth.connect(air);air.connect(this.fileWet);
    for(const [time,level] of [[.23,.32],[.41,.20],[.67,.10]]){
      const delay=ac.createDelay(1),returnGain=ac.createGain();delay.delayTime.value=time;returnGain.gain.value=level;
      air.connect(delay);delay.connect(returnGain);returnGain.connect(this.fileWet);
    }
    this.fileDry.gain.value=1;this.fileWet.gain.value=0;
  }
  tone(midi, when, strength, length, bus, partials, kind = 'sine') {
    const ac = this.context, collection = bus === this.music ? this.musicVoices : this.instrumentVoices;
    if (collection.size > 90) return;
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    for (const [ratio, level] of partials) {
      const oscillator = ac.createOscillator(), envelope = ac.createGain();
      oscillator.type = kind; oscillator.frequency.value = frequency * ratio;
      envelope.gain.setValueAtTime(.0001, when);
      envelope.gain.exponentialRampToValueAtTime(Math.max(.0002, strength * level), when + .014);
      envelope.gain.exponentialRampToValueAtTime(.0001, when + length / Math.sqrt(ratio));
      oscillator.connect(envelope); envelope.connect(bus);
      if (bus === this.instruments) envelope.connect(this.echo);
      collection.add(oscillator); oscillator.start(when); oscillator.stop(when + length + .05);
      oscillator.onended = () => { collection.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
    }
  }
  note(midi, when, strength = .14, length = 4) {
    this.tone(midi, when, strength, length, this.music, [[1, 1], [2, .2], [3.01, .07]]);
  }
  pad(midi, when) {
    const ac = this.context;
    for (const detune of [-4, 4]) {
      const oscillator = ac.createOscillator(), gain = ac.createGain();
      oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12); oscillator.detune.value = detune;
      gain.gain.setValueAtTime(0, when); gain.gain.linearRampToValueAtTime(.047, when + 2.5); gain.gain.linearRampToValueAtTime(0, when + 10);
      oscillator.connect(gain); gain.connect(this.music); this.musicVoices.add(oscillator);
      oscillator.start(when); oscillator.stop(when + 10.1);
      oscillator.onended = () => { this.musicVoices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    }
  }
  schedule() {
    if (!this.playing || this.source !== 'ambient') return;
    const ac = this.context;
    const melody = [74,81,78,76,69,null,74,78,81,86,83,null,81,78,76,69,71,78,76,74,66,null,71,76,78,83,81,null,78,76,74,null];
    // Background tabs can throttle timers. Skip elapsed beats instead of emitting a burst.
    if (this.nextNote < ac.currentTime - .3) this.nextNote = ac.currentTime + .03;
    while (this.nextNote < ac.currentTime + .2) {
      const index = this.step % melody.length;
      if (melody[index] !== null) this.note(melody[index], this.nextNote, index % 4 === 0 ? .17 : .11, 4.5);
      if (this.step % 8 === 0) { const rootNote = [50,45,47,43][Math.floor(this.step / 8) % 4]; this.pad(rootNote, this.nextNote); this.pad(rootNote + 7, this.nextNote); }
      this.step++; this.nextNote += .94;
    }
  }
  async play() {
    if (this.playing) return;
    // Both calls begin inside the gesture, including browsers with strict
    // activation rules for local audio files (mobile Safari in particular).
    const ready = this.init();
    const mediaReady = this.source === 'file' ? this.audio.play() : Promise.resolve();
    await Promise.all([ready,mediaReady]);
    this.playing = true;
    this.music.gain.cancelScheduledValues(this.context.currentTime);
    this.music.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, .04);
    if (this.source === 'ambient') { this.nextNote = this.context.currentTime + .03; this.schedule(); this.timer = setInterval(() => this.schedule(), 100); }
  }
  async pause() {
    this.playing = false; clearInterval(this.timer); this.timer = null; this.audio.pause(); this.nextNote = 0;
    if (!this.context) return;
    const now = this.context.currentTime;
    this.music.gain.cancelScheduledValues(now); this.music.gain.setTargetAtTime(0, now, .012);
    for (const voice of this.musicVoices) { try { voice.stop(now + .06); } catch {} }
    this.musicVoices.clear();
  }
  strike(index, strength = .12, timbre = 'jade') {
    if (!this.chimes || !this.context || this.context.state !== 'running') return false;
    const now = this.context.currentTime;this.duckFile();
    const scales = { jade:[74,76,78,81,83,86,88,90], gold:[62,64,66,69,71,74,76,78], red:[62,63,67,69,70,74,75,79], steppe:[57,62,64,66,69,74,76,78] };
    const notes = scales[timbre] || scales.jade;
    const midi = notes[((index % notes.length) + notes.length) % notes.length];
    const settings = {
      jade: { partials:[[1,1],[2,.22],[3.01,.08]], length:2.8, wave:'sine' },
      gold: { partials:[[1,1],[2.76,.25],[5.4,.1]], length:4.2, wave:'sine' },
      red: { partials:[[1,.7],[2,.15],[3,.065]], length:1.8, wave:'triangle' },
      steppe: { partials:[[1,.8],[1.003,.24],[2,.09]], length:3.6, wave:'sine' }
    };
    const setting = settings[timbre] || settings.jade;
    this.tone(midi, now + .005, Math.min(.18, strength), setting.length, this.instruments, setting.partials, setting.wave);
    return true;
  }
  chime(x, y) {
    if (!this.context || this.context.currentTime - this.lastChime < .09) return false;
    this.lastChime = this.context.currentTime;
    return this.strike(Math.min(7, Math.max(0, Math.floor((x - 681) / 294 * 8))), .065 + Math.max(0, 1 - (y - 380) / 400) * .035);
  }
  pluckBuffer(midi,kind){
    const key=`${kind}:${midi}`;
    if(this.pluckCache.has(key))return this.pluckCache.get(key);
    const rate=Math.min(this.context.sampleRate,32000);
    const frequency=440*Math.pow(2,(midi-69)/12);
    const duration=kind==='pipa'?2.4:kind==='guqin'?5.2:4.2;
    const buffer=this.context.createBuffer(1,Math.ceil(rate*duration),rate),data=buffer.getChannelData(0);
    const period=Math.max(2,Math.round(rate/frequency)),delay=new Float32Array(period);
    let randomSeed=2317+Math.round(midi*17),mean=0;
    for(let i=0;i<period;i++){randomSeed=(Math.imul(randomSeed,1664525)+1013904223)|0;delay[i]=(randomSeed>>>0)/2147483648-1;mean+=delay[i];}
    mean/=period;for(let i=0;i<period;i++)delay[i]-=mean;
    // Karplus–Strong: a short excitation travels along a damped string loop.
    const decay=kind==='pipa'?.985:kind==='guqin'?.993:.997;
    let cursor=0,low=0;
    for(let i=0;i<data.length;i++){
      const value=delay[cursor];delay[cursor]=(value+delay[(cursor+1)%period])*.5*decay;cursor=(cursor+1)%period;
      low+=((kind==='guqin'?.4:.8))*(value-low);
      const attack=Math.min(1,i/(rate*.003)),tail=Math.min(1,(data.length-i)/(rate*.15));
      data[i]=low*attack*tail;
    }
    if(this.pluckCache.size>=32)this.pluckCache.delete(this.pluckCache.keys().next().value);
    this.pluckCache.set(key,buffer);return buffer;
  }
  pluck(midi,kind='guqin',strength=.48){return !!this.startPluck(midi,kind,strength);}
  startPluck(midi,kind='guqin',strength=.48,{brightness=.5}={}){
    if(!this.chimes||!this.context||this.context.state!=='running'||this.instrumentVoices.size>64)return null;
    const ac=this.context,source=ac.createBufferSource(),gain=ac.createGain(),filter=ac.createBiquadFilter();
    const sampleNote=Math.round(midi);source.buffer=this.pluckBuffer(sampleNote,kind);
    source.playbackRate.value=Math.pow(2,(midi-sampleNote)/12);
    const cutoff=value=>(kind==='guqin'?1100:1900)+Math.max(0,Math.min(1,value))*(kind==='guqin'?4200:6500);
    filter.type='lowpass';filter.frequency.value=cutoff(brightness);
    gain.gain.value=Math.max(0,Math.min(.75,strength))*(kind==='guqin'?1.5:1.05);
    source.connect(filter);filter.connect(gain);gain.connect(this.instruments);gain.connect(this.echo);
    this.instrumentVoices.add(source);source.start();this.duckFile();let ended=false;
    source.onended=()=>{ended=true;this.instrumentVoices.delete(source);source.disconnect();gain.disconnect();filter.disconnect();};
    return{
      get ended(){return ended;},
      pitch:note=>{if(!ended)source.playbackRate.setTargetAtTime(Math.pow(2,(note-sampleNote)/12),ac.currentTime,.025);},
      brightness:value=>{if(!ended)filter.frequency.setTargetAtTime(cutoff(value),ac.currentTime,.03);},
      stop:()=>{if(ended)return;ended=true;gain.gain.setTargetAtTime(0,ac.currentTime,.035);source.stop(ac.currentTime+.2);}
    };
  }
  bow(midi,strength=.35){
    if(!this.chimes||!this.context||this.context.state!=='running'||this.bowedVoices.size>=4)return null;
    const ac=this.context,oscillator=ac.createOscillator(),fundamental=ac.createOscillator(),gain=ac.createGain();
    const filter=ac.createBiquadFilter(),body=ac.createBiquadFilter(),fundamentalGain=ac.createGain();
    const vibrato=ac.createOscillator(),vibratoDepth=ac.createGain();
    const frequency=440*Math.pow(2,(midi-69)/12),now=ac.currentTime;
    oscillator.type='sawtooth';oscillator.frequency.value=frequency;
    fundamental.type='sine';fundamental.frequency.value=frequency;fundamentalGain.gain.value=.65;
    filter.type='lowpass';filter.frequency.value=2800;filter.Q.value=.6;
    body.type='peaking';body.frequency.value=1250;body.Q.value=1.1;body.gain.value=5;
    vibrato.frequency.value=5.1;vibratoDepth.gain.value=7;vibrato.connect(vibratoDepth);
    vibratoDepth.connect(oscillator.detune);vibratoDepth.connect(fundamental.detune);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(strength*.19,now+.12);
    oscillator.connect(filter);filter.connect(body);body.connect(gain);
    fundamental.connect(fundamentalGain);fundamentalGain.connect(gain);gain.connect(this.instruments);gain.connect(this.echo);
    oscillator.start();fundamental.start();vibrato.start();this.duckFile();
    let ended=false;
    const voice={
      pitch:(note)=>{if(ended)return;const f=440*Math.pow(2,(note-69)/12);oscillator.frequency.setTargetAtTime(f,ac.currentTime,.045);fundamental.frequency.setTargetAtTime(f,ac.currentTime,.045);},
      expression:(amount)=>{if(!ended)gain.gain.setTargetAtTime(Math.max(.02,Math.min(.8,amount))*.19,ac.currentTime,.04);},
      stop:()=>{
        if(ended)return;ended=true;this.bowedVoices.delete(voice);
        const end=ac.currentTime;gain.gain.cancelScheduledValues(end);gain.gain.setTargetAtTime(0,end,.035);
        oscillator.stop(end+.25);fundamental.stop(end+.25);vibrato.stop(end+.25);
        oscillator.onended=()=>{for(const node of[oscillator,fundamental,vibrato,vibratoDepth,filter,body,fundamentalGain,gain])node.disconnect();};
      }
    };
    this.bowedVoices.add(voice);return voice;
  }
  stopBows(){for(const voice of this.bowedVoices)voice.stop();}
  setFileStyle(enabled,amount=this.fileStyleAmount){
    this.fileStyle=Boolean(enabled);this.fileStyleAmount=Number.isFinite(amount)?Math.max(0,Math.min(1,amount)):this.fileStyleAmount;if(!this.context||!this.fileWet)return;
    const mix=this.fileStyle?this.fileStyleAmount:0,now=this.context.currentTime;
    this.fileDry.gain.setTargetAtTime(1-mix,now,.045);this.fileWet.gain.setTargetAtTime(mix*.92,now,.045);
    if(!enabled){this.fileOutput.gain.cancelScheduledValues(now);this.fileOutput.gain.setTargetAtTime(1,now,.04);}
  }
  duckFile(){
    if(!this.fileStyle||this.source!=='file'||!this.fileOutput)return;
    const now=this.context.currentTime,param=this.fileOutput.gain;param.cancelScheduledValues(now);
    param.setTargetAtTime(1-this.fileStyleAmount*.35,now,.025);param.setTargetAtTime(1,now+.2,.65);
  }
  setMusicVolume(value) { this.musicVolume = Math.max(0,Math.min(1,value)); if (this.context) this.music.gain.setTargetAtTime(this.playing ? this.musicVolume : 0, this.context.currentTime, .04); }
  setInstrumentVolume(value) { this.instrumentVolume = Math.max(0,Math.min(1,value)); if (this.context) this.instruments.gain.setTargetAtTime(this.chimes ? this.instrumentVolume : 0, this.context.currentTime, .025); }
  setInstruments(enabled) { this.chimes = enabled; if(!enabled)this.stopBows(); if (this.context) this.instruments.gain.setTargetAtTime(enabled ? this.instrumentVolume : 0, this.context.currentTime, .025); }
  async resetAudio() {
    await this.pause();
    // Preserve the instrument graph and the user's instrument mute preference.
    this.source = 'ambient'; this.audio.removeAttribute('src'); this.audio.load();
    this.step = 0; this.lastChime = -1;
  }
}
if (typeof module !== 'undefined' && module.exports) module.exports = SoundGarden;
else root.SoundGarden = SoundGarden;
})(typeof window !== 'undefined' ? window : globalThis);

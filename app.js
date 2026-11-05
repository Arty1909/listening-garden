(() => {
'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const ctx = canvas.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reducedMotion.matches;
let width = 0, height = 0, scale = 1, offsetX = 0, offsetY = 0;
let frame = 0, lastFrame = 0, clock = 0;
let heroVisible = true;
const pointer = { x: -1000, y: -1000, vx: 0, vy: 0, active: false };
const cols = 33, rows = 46, left = 683, top = 383, stepX = 9, stepY = 8.6;
const glyphs = '风月山水花雨云林心安静听竹梦春秋天地光影清和0123456789';
const nodes = [];
let seed = 27;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  nodes.push({ x: left + c * stepX, y: top + r * stepY, dx: 0, dy: 0, vx: 0, vy: 0,
    char: glyphs[Math.floor(random() * glyphs.length)], mint: random() > .34, phase: random() * 6.28 });
}
const petals = Array.from({ length: 85 }, () => ({ x: random() * 1672, y: random() * 941,
  speed: 6 + random() * 17, size: 1.6 + random() * 3.2, phase: random() * 6.28, pink: random() > .66 }));
const portal = new Path2D();
portal.moveTo(682, 777); portal.lineTo(682, 468); portal.quadraticCurveTo(698, 434, 729, 418);
portal.lineTo(747, 404); portal.lineTo(770, 383); portal.lineTo(886, 383);
portal.lineTo(904, 401); portal.lineTo(925, 413); portal.quadraticCurveTo(962, 433, 973, 468);
portal.lineTo(973, 777); portal.closePath();

function resize() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width; height = rect.height;
  const dpr = Math.min(devicePixelRatio || 1, matchMedia('(max-width:650px)').matches ? 3 : 1.75);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  scale = Math.max(width / 1672, height / 941);
  offsetX = (width - 1672 * scale) / 2; offsetY = (height - 941 * scale) / 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
function simulate(dt) {
  clock += dt;
  const factor = Math.min(dt * 60, 2);
  for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) {
    const n = nodes[r * cols + c];
    const above = nodes[(r - 1) * cols + c];
    const below = nodes[Math.min(rows - 1, r + 1) * cols + c];
    const prev = nodes[r * cols + Math.max(0, c - 1)];
    const next = nodes[r * cols + Math.min(cols - 1, c + 1)];
    const freedom = r / rows;
    const breeze = (Math.sin(clock * 1.05 + r * .1 + c * .16) * 5 + Math.sin(clock * .6 + r * .19) * 3) * freedom;
    let fx = (breeze - n.dx) * .022 + ((above.dx + below.dx + prev.dx + next.dx) / 4 - n.dx) * .15;
    let fy = -n.dy * .036 + ((above.dy + below.dy) / 2 - n.dy) * .12;
    if (pointer.active) {
      const dx = n.x + n.dx - pointer.x, dy = n.y + n.dy - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 70) {
        const force = (1 - distance / 70) * freedom;
        fx += (pointer.vx * .055 + dx / Math.max(distance, 1) * 1.25) * force;
        fy += (pointer.vy * .035 + dy / Math.max(distance, 1) * .55) * force;
      }
    }
    n.fx=fx;n.fy=fy;
  }
  for(let i=cols;i<nodes.length;i++){
    const n=nodes[i];
    n.vx = (n.vx + n.fx * factor) * Math.pow(.91, factor);
    n.vy = (n.vy + n.fy * factor) * Math.pow(.9, factor);
    n.dx = Math.max(-58, Math.min(58, n.dx + n.vx * factor));
    n.dy = Math.max(-28, Math.min(28, n.dy + n.vy * factor));
  }
  pointer.vx *= .82; pointer.vy *= .82;
  for (const p of petals) {
    p.y += p.speed * dt; p.x += (Math.sin(clock * .35 + p.phase) * 12 + 7) * dt;
    if (p.y > 950) { p.y = -10; p.x = random() * 1672; }
    if (p.x > 1690) p.x = -10;
  }
}
function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.save(); ctx.translate(offsetX, offsetY); ctx.scale(scale, scale);
  ctx.save(); ctx.clip(portal);
  const glow = ctx.createLinearGradient(680, 380, 975, 780);
  glow.addColorStop(0, 'rgba(109,231,181,.28)'); glow.addColorStop(.5, 'rgba(24,110,98,.1)'); glow.addColorStop(1, 'rgba(168,239,185,.24)');
  ctx.fillStyle = glow; ctx.fillRect(680, 380, 296, 400);
  ctx.lineWidth = .55; ctx.strokeStyle = 'rgba(147,237,182,.18)';
  for (let c = 0; c < cols; c++) {
    ctx.beginPath();
    for (let r = 0; r < rows; r++) { const n = nodes[r * cols + c]; if (!r) ctx.moveTo(n.x, n.y); else ctx.lineTo(n.x + n.dx, n.y + n.dy); }
    ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '8px "Microsoft YaHei", "Noto Sans CJK SC", monospace';
  for (const n of nodes) {
    const light = .72 + Math.sin(clock * .7 + n.phase) * .18;
    ctx.fillStyle = n.mint ? `rgba(170,247,191,${light})` : `rgba(238,101,92,${light + .05})`;
    ctx.fillText(n.char, n.x + n.dx, n.y + n.dy);
  }
  ctx.restore();
  for (const p of petals) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.phase + clock * .4);
    ctx.scale(1, .45 + Math.abs(Math.sin(clock + p.phase)) * .45);
    ctx.fillStyle = p.pink ? 'rgba(247,137,144,.7)' : 'rgba(174,241,183,.68)';
    ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * .48, .5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
function animate(time) {
  frame = 0;
  if (document.hidden || !heroVisible) return;
  const dt = Math.min((time - (lastFrame || time)) / 1000, .033);
  lastFrame = time;
  if (motion) simulate(dt);
  draw();
  if (motion) frame = requestAnimationFrame(animate);
}
function restartAnimation() { if (!frame) { lastFrame = 0; frame = requestAnimationFrame(animate); } }
function setMotion(enabled) {
  motion = enabled; $('motion-toggle').setAttribute('aria-pressed', String(motion));
  document.body.classList.toggle('still', !motion);
  $('motion-setting').checked=motion;
  window.dispatchEvent(new CustomEvent('listening-garden-motion', { detail: motion }));
  if (motion) restartAnimation(); else { cancelAnimationFrame(frame); frame = 0; draw(); }
}
canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left - offsetX) / scale, y = (event.clientY - rect.top - offsetY) / scale;
  pointer.vx = pointer.active ? Math.max(-45, Math.min(45, x - pointer.x)) : 0;
  pointer.vy = pointer.active ? Math.max(-45, Math.min(45, y - pointer.y)) : 0;
  pointer.x = x; pointer.y = y; pointer.active = true;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const insidePortal = ctx.isPointInPath(portal, x, y);
  ctx.restore();
  if (insidePortal && Math.hypot(pointer.vx, pointer.vy) > .5) sound.chime(x, y);
});
canvas.addEventListener('pointerleave', () => { pointer.active = false; });
canvas.addEventListener('pointerdown', async (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left - offsetX) / scale, y = (event.clientY - rect.top - offsetY) / scale;
  if (x > 680 && x < 977 && y > 380 && y < 780) {
    pointer.x = x; pointer.y = y; pointer.vx = 25; pointer.vy = 0; pointer.active = true;
    await unlockInstruments();
    sound.chime(x, y);
  }
});
canvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointer.active = false; });

// Shared audio engine: music and instruments remain independent.
const sound = new SoundGarden();
let audioBusy = false, toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3200); }
function syncPlayer() {
  document.body.classList.toggle('playing', sound.playing);
  $('play').setAttribute('aria-label', sound.playing ? 'Pause music' : 'Play music');
  $('background-music').checked = sound.playing;
  $('sound-toggle').setAttribute('aria-pressed', String(sound.chimes));
  $('chimes').checked = sound.chimes;
  $('player-caption').textContent = `${sound.playing ? 'MUSIC ON' : 'MUSIC OFF'} · ${sound.chimes ? 'INSTRUMENTS READY' : 'INSTRUMENTS MUTED'}`;
  $('file-style').disabled=sound.source!=='file';$('file-style').checked=sound.fileStyle;
  $('file-style-controls').hidden=sound.source!=='file';
  $('file-original').setAttribute('aria-pressed',String(!sound.fileStyle));
  $('file-garden').setAttribute('aria-pressed',String(sound.fileStyle));
  $('file-style-value').value=`${Math.round(sound.fileStyleAmount*100)}%`;
  $('file-style-status').textContent=!sound.fileStyle?'Original · effect off':sound.fileStyleAmount===0?'Original · blend is 0%':`Garden · ${Math.round(sound.fileStyleAmount*100)}%${sound.playing?' · processing':' · press Play to hear'}`;
  $('file-style-hint').textContent=sound.source==='file'?'Compare Original and Garden while your track plays. Garden softens bright highs, adds audible pavilion echoes and makes room for your notes. It does not change the melody, key or arrangement.':'Open your music to add a softer tone and pavilion echo. Melody and key stay unchanged.';
}
async function unlockInstruments() {
  try { await sound.init(); }
  catch { toast('Sound is unavailable in this browser. You can still play with the letters.'); }
}
function setInstrumentSounds(enabled) { sound.setInstruments(enabled); syncPlayer(); }
async function togglePlayback() {
  if (audioBusy) return; audioBusy = true;
  try { if (sound.playing) await sound.pause(); else await sound.play(); }
  catch (error) { await sound.pause(); $('audio-message').textContent = 'Unable to play this audio. Try an MP3 or WAV file.'; toast('Unable to play. Try another audio file or the built-in melody.'); }
  finally { audioBusy = false; syncPlayer(); }
}
$('play').addEventListener('click', togglePlayback);
$('background-music').addEventListener('change', togglePlayback);
$('sound-toggle').addEventListener('click', () => { setInstrumentSounds(!sound.chimes); if (sound.chimes) unlockInstruments(); });
$('motion-toggle').addEventListener('click', () => setMotion(!motion));
$('motion-setting').addEventListener('change',event=>setMotion(event.target.checked));
function setSettings(open) { if(open)window.GardenRecorder?.close(); $('sound-settings').hidden = !open; $('settings').setAttribute('aria-expanded', String(open)); }
$('settings').addEventListener('click', () => setSettings($('sound-settings').hidden));
$('close-settings').addEventListener('click', () => { setSettings(false); $('settings').focus(); });
$('music-volume').addEventListener('input', (event) => { sound.setMusicVolume(Number(event.target.value) / 100); $('music-volume-value').value = `${event.target.value}%`; });
$('instrument-volume').addEventListener('input', (event) => { sound.setInstrumentVolume(Number(event.target.value) / 100); $('instrument-volume-value').value = `${event.target.value}%`; });
$('file-style').addEventListener('change',event=>{sound.setFileStyle(event.target.checked);syncPlayer();});
$('file-style-amount').addEventListener('input',event=>{sound.setFileStyle(sound.fileStyle,Number(event.target.value)/100);syncPlayer();});
for(const [id,enabled] of [['file-original',false],['file-garden',true]])$(id).addEventListener('click',()=>{sound.setFileStyle(enabled);syncPlayer();});
$('chimes').addEventListener('change', (event) => { setInstrumentSounds(event.target.checked); if (sound.chimes) unlockInstruments(); });
$('open-file').addEventListener('click', () => $('audio-file').click());
$('fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else toast('Use your browser’s fullscreen mode.'); }
  catch { toast('Fullscreen is unavailable in this window.'); }
});
document.addEventListener('fullscreenchange', () => { $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'); });
function travelTo(id){setSettings(false);window.GardenRecorder?.close();window.GardenViewport.travel(id,motion);history.replaceState(null,'',`#${id}`);}
$('home').addEventListener('click', () => travelTo('sanctuary'));
$('explore').addEventListener('click', () => {travelTo('instruments');unlockInstruments();});
$('silk-nav').addEventListener('click', () => {travelTo('silk');unlockInstruments();});
$('learn-nav').addEventListener('click',()=>travelTo('learn'));
for(const link of document.querySelectorAll('.continue-link,.silk-next-link,.wordmark'))link.addEventListener('click',event=>{event.preventDefault();travelTo(link.hash.slice(1));if(link.hash!=='#sanctuary')unlockInstruments();});
let navFrame=0;
function syncNavigation(){
  navFrame=0;
  const midpoint=innerHeight*.45;
  const active=$('learn').getBoundingClientRect().top<midpoint?'learn-nav':$('silk').getBoundingClientRect().top<midpoint?'silk-nav':$('instruments').getBoundingClientRect().top<midpoint?'explore':'home';
  for(const id of ['home','explore','silk-nav','learn-nav'])$(id).classList.toggle('active',id===active);
}
window.addEventListener('scroll',()=>{if(!navFrame)navFrame=requestAnimationFrame(syncNavigation);},{passive:true});
window.addEventListener('resize',syncNavigation);
function formatTime(value) { if (!Number.isFinite(value)) return '0:00'; return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`; }
function attachFileEvents() {
  sound.audio.addEventListener('loadedmetadata', () => { $('duration').textContent = formatTime(sound.audio.duration); });
  sound.audio.addEventListener('timeupdate', () => {
    $('elapsed').textContent = formatTime(sound.audio.currentTime);
    $('seek').value = sound.audio.duration ? sound.audio.currentTime / sound.audio.duration * 100 : 0;
  });
  sound.audio.addEventListener('error', () => { if (sound.source === 'file') { sound.pause().then(syncPlayer); $('audio-message').textContent = 'This file cannot be played. Try MP3, WAV or another audio format.'; } });
}
$('seek').addEventListener('input', (e) => { if (Number.isFinite(sound.audio.duration)) sound.audio.currentTime = Number(e.target.value) / 100 * sound.audio.duration; });
attachFileEvents();
$('audio-file').addEventListener('change', async (event) => {
  const file = event.target.files[0]; if (!file || audioBusy) return;
  audioBusy = true;
  try {
    await sound.resetAudio();
    if (sound.fileURL) URL.revokeObjectURL(sound.fileURL);
    sound.fileURL = URL.createObjectURL(file); sound.source = 'file'; sound.audio.src = sound.fileURL;
    $('track-name').textContent = file.name.replace(/\.[^.]+$/, ''); $('track-category').textContent = 'YOUR MUSIC';
    $('seek-row').hidden = false; $('elapsed').textContent = '0:00'; $('duration').textContent = '0:00'; $('seek').value = 0;
    $('audio-message').textContent = 'Your file stays on this device. Press play to listen.';
  } finally { event.target.value = ''; audioBusy = false; syncPlayer(); }
});
$('ambient-track').addEventListener('click', async () => {
  if (audioBusy) return; audioBusy = true;
  try {
    await sound.resetAudio(); if (sound.fileURL) { URL.revokeObjectURL(sound.fileURL); sound.fileURL = null; }
    sound.source = 'ambient'; sound.step = 0; $('track-name').textContent = 'Jade garden'; $('track-category').textContent = 'BACKGROUND MUSIC';
    $('seek-row').hidden = true; $('audio-message').textContent = 'A slowly unfolding pentatonic melody. Press play to listen.';
  } finally { audioBusy = false; syncPlayer(); }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { setSettings(false); return; }
  if (event.target.closest('input, button, a, textarea, select')) return;
  if (event.code === 'Space') { event.preventDefault(); togglePlayback(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else restartAnimation(); });
reducedMotion.addEventListener('change', (event) => setMotion(!event.matches));
window.addEventListener('resize', resize);
window.addEventListener('pagehide', () => { sound.pause(); });
new IntersectionObserver(([entry]) => {
  heroVisible = entry.isIntersecting;
  if (heroVisible) restartAnimation();
  else { cancelAnimationFrame(frame); frame = 0; }
}, { threshold:0 }).observe($('sanctuary'));
window.ListeningGarden = Object.freeze({ sound, unlockInstruments, toast, setMotion, syncPlayer, setSettings, travelTo, get motion() { return motion; } });
new ResizeObserver(resize).observe(canvas);
resize(); setMotion(motion); restartAnimation(); syncPlayer(); syncNavigation();
})();

/* Keep the selected world aligned when fullscreen, rotation or browser chrome changes size. */
(() => {
  const scenes = [...document.querySelectorAll('main > section')];
  let active = scenes.find(scene => '#' + scene.id === location.hash) || scenes[0];
  let width = innerWidth, height = innerHeight, frame = 0, destination = null;
  const resized = () => width !== innerWidth || height !== innerHeight;
  function align() {
    cancelAnimationFrame(frame);
    width = innerWidth; height = innerHeight;
    if (destination) active = destination;
    active.scrollIntoView({behavior:'instant', block:'start'});
    frame = requestAnimationFrame(() => {
      active.scrollIntoView({behavior:'instant', block:'start'});
      destination = null;
    });
  }
  function observePosition() {
    // A resize may generate a scroll event before its resize event.
    if (resized()) { align(); return; }
    const nearest = scenes.reduce((best, scene) => Math.abs(scene.getBoundingClientRect().top) < Math.abs(best.getBoundingClientRect().top) ? scene : best);
    if (!destination) active = nearest;
    else if (Math.abs(destination.getBoundingClientRect().top) < 1) { active = destination; destination = null; }
  }
  window.addEventListener('scroll', observePosition, {passive:true});
  window.addEventListener('resize', align);
  document.addEventListener('fullscreenchange', align);
  window.addEventListener('pageshow', align);
  window.addEventListener('hashchange', () => {
    active = scenes.find(scene => '#' + scene.id === location.hash) || active;
    destination = null; align();
  });
  for (const event of ['wheel','touchstart','pointerdown']) window.addEventListener(event, () => { destination = null; }, {passive:true});
  window.GardenViewport = Object.freeze({travel(id, motion) {
    destination = scenes.find(scene => scene.id === id);
    if (!destination) return;
    active = destination;
    destination.scrollIntoView({behavior:motion?'smooth':'instant', block:'start'});
  }});
  align();
})();

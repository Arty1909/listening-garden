/* Reserve the real dock height, including an uploaded track's seek row. */
(() => {
  const phone=matchMedia('(max-width:650px)'),dock=document.querySelector('.audio-area');
  function measure(){
    if(!phone.matches)return;
    const bottom=parseFloat(getComputedStyle(dock).bottom)||0;
    document.documentElement.style.setProperty('--mobile-dock',`${Math.ceil(dock.getBoundingClientRect().height+bottom+12)}px`);
  }
  new ResizeObserver(measure).observe(dock);
  phone.addEventListener('change',measure);window.addEventListener('resize',measure);
  measure();
})();

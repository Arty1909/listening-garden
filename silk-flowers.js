(() => {
'use strict';
const section=document.getElementById('silk'),layer=document.getElementById('silk-flowers'),background=section.querySelector('.silk-background');
const branches=[[.84,.15],[.91,.19],[.97,.27],[.87,.31],[.96,.4]];
// Negative delays spread flowers through the scene from the first visible frame.
for(let i=0;i<16;i++){
  const flower=document.createElement('span'),shape=document.createElement('span');
  flower.className='silk-falling-flower';shape.className='silk-loose-petal';
  const duration=28+(i*7%13);
  flower.style.setProperty('--drift',`${28+(i*11%38)}px`);
  flower.style.setProperty('--flutter',`${3+i%4}px`);
  flower.style.setProperty('--duration',`${duration}s`);
  flower.style.setProperty('--delay',`${-((i*.37+.12)%1)*duration}s`);
  flower.style.setProperty('--size',`${4.8+i%5}px`);
  flower.style.setProperty('--turn',`${4+i%5}s`);
  flower.append(shape);layer.append(flower);
}
function positionBranches(){
  const width=section.clientWidth,height=section.clientHeight;
  const imageWidth=background.naturalWidth||1672,imageHeight=background.naturalHeight||941;
  const scale=Math.max(width/imageWidth,height/imageHeight),left=(width-imageWidth*scale)/2,top=(height-imageHeight*scale)/2;
  [...layer.children].forEach((flower,i)=>{
    const branch=branches[i%branches.length];
    // Keep the fall near the right tree, including when its branches are cropped.
    const x=Math.min(width-26-(i%5)*9,left+(branch[0]+(i%3)*.008)*imageWidth*scale);
    const y=Math.max(35,top+branch[1]*imageHeight*scale);
    flower.style.setProperty('--start',`${x}px`);flower.style.setProperty('--origin-top',`${y}px`);
    flower.style.setProperty('--fall-distance',`${height-y+35}px`);
  });
}
new ResizeObserver(positionBranches).observe(section);background.addEventListener('load',positionBranches);positionBranches();
new IntersectionObserver(([entry])=>layer.classList.toggle('is-visible',entry.isIntersecting),{threshold:0}).observe(section);
function visibility(){layer.classList.toggle('is-hidden-tab',document.hidden);}
document.addEventListener('visibilitychange',visibility);visibility();
})();

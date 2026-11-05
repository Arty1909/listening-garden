(() => {
'use strict';
const section=document.getElementById('instruments'),canvas=document.getElementById('garden-atmosphere'),background=section.querySelector('.gallery-landscape');
const ctx=canvas.getContext('2d'),garden=window.ListeningGarden;
let width=0,height=0,visible=false,frame=0,last=0,time=0,spawn=0,petals=[],ripples=[],cover={scale:1,x:0,y:0};
const waterBoundary=[[.02,.54],[.97,.54],[.94,.7],[.85,.8],[.72,.9],[.69,1],[.1,1],[.3,.87],[.21,.76],[.1,.72]];
function inWater(x,y){
  const u=(x-cover.x)/(background.naturalWidth*cover.scale),v=(y-cover.y)/(background.naturalHeight*cover.scale);
  let inside=false;
  for(let i=0,j=waterBoundary.length-1;i<waterBoundary.length;j=i++){
    const a=waterBoundary[i],b=waterBoundary[j];
    if((a[1]>v)!==(b[1]>v)&&u<(b[0]-a[0])*(v-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
function addRipple(x,y,soft=false){if(!garden.motion||!inWater(x,y))return;ripples.push({x,y,age:0,duration:soft?2.5:1.8,soft});if(ripples.length>22)ripples.shift();}
function makePetal(initial=false){
  const sourceX=Math.random()*.27,sourceY=.08+Math.random()*.15;
  let x=cover.x+sourceX*background.naturalWidth*cover.scale,y=cover.y+sourceY*background.naturalHeight*cover.scale;
  // On narrow screens the original left tree is just beyond the crop.
  if(x<0){x=-8+Math.random()*Math.min(65,width*.14);y=height*(.08+Math.random()*.16);}
  if(initial)y+=Math.random()*height*.4;
  return{x,y,startX:x,phase:Math.random()*Math.PI*2,rotation:Math.random()*6.28,size:2.4+Math.random()*2.4,speed:15+Math.random()*13,age:0,life:13+Math.random()*7};
}
function resize(){
  const rect=section.getBoundingClientRect();width=rect.width;height=rect.height;
  const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const imageWidth=background.naturalWidth||1672,imageHeight=background.naturalHeight||941;
  cover.scale=Math.max(width/imageWidth,height/imageHeight);cover.x=(width-imageWidth*cover.scale)*(width<=650?.49:.5);cover.y=(height-imageHeight*cover.scale)*.5;
  petals=Array.from({length:width<=650?7:12},()=>makePetal(true));ripples=[];draw();
}
function draw(){
  ctx.clearRect(0,0,width,height);if(!garden.motion)return;
  // Clip rings to the lake polygon so the shoreline and mountains stay still.
  ctx.save();ctx.beginPath();waterBoundary.forEach(([u,v],i)=>{const x=cover.x+u*background.naturalWidth*cover.scale,y=cover.y+v*background.naturalHeight*cover.scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.clip();
  for(const r of ripples){
    const progress=r.age/r.duration,fade=Math.sin(Math.PI*Math.min(1,progress))*(r.soft?.25:.46),radius=5+r.age*(r.soft?28:46);
    for(let ring=0;ring<3;ring++){
      const rr=radius-ring*10;if(rr<=0)continue;
      ctx.strokeStyle=`rgba(184,220,209,${fade*(1-ring*.23)})`;ctx.lineWidth=ring? .7:1.1;
      ctx.beginPath();ctx.ellipse(r.x,r.y,rr,rr*.25,0,0,Math.PI*2);ctx.stroke();
    }
    if(r.age<.35&&!r.soft){ctx.fillStyle=`rgba(221,235,215,${(1-r.age/.35)*.7})`;ctx.beginPath();ctx.ellipse(r.x,r.y-r.age*34,1.3,2.4,0,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
  for(const p of petals){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.scale(1,Math.max(.22,Math.abs(Math.sin(time*.9+p.phase))));
    ctx.globalAlpha=Math.min(.65,p.age*2+.1,(p.life-p.age)*.5);ctx.fillStyle=p.phase>3?'#d9cbbb':'#ead8c9';
    ctx.beginPath();ctx.moveTo(-p.size,0);ctx.bezierCurveTo(-p.size*.3,-p.size*.9,p.size*.7,-p.size*.65,p.size,0);ctx.bezierCurveTo(p.size*.1,p.size*.7,-p.size*.65,p.size*.5,-p.size,0);ctx.fill();ctx.restore();
  }
}
function tick(stamp){
  frame=0;if(!visible||document.hidden||!garden.motion)return;
  if(last&&stamp-last<32){frame=requestAnimationFrame(tick);return;}
  const dt=Math.min(.05,(stamp-(last||stamp))/1000);last=stamp;time+=dt;spawn+=dt;
  if(spawn>1.25){spawn=0;if(petals.length<(width<=650?10:17))petals.push(makePetal());}
  for(const p of petals){p.age+=dt;p.x+=(7+Math.sin(time*.7+p.phase)*11)*dt;p.y+=p.speed*dt;p.rotation+=dt*.4;if(p.y>height*.65&&inWater(p.x,p.y)){addRipple(p.x,p.y,true);p.age=p.life;}}
  petals=petals.filter(p=>p.age<p.life&&p.y<height&&p.x<width+15);
  for(const r of ripples)r.age+=dt;ripples=ripples.filter(r=>r.age<r.duration);draw();frame=requestAnimationFrame(tick);
}
function resume(){if(!frame&&visible&&!document.hidden&&garden.motion){last=0;frame=requestAnimationFrame(tick);}}
let previous={x:-1000,y:-1000,time:0};
function waterGesture(event){
  if(!garden.motion||event.target.closest('button,a,input'))return;
  const rect=section.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,now=performance.now();
  if(event.type==='pointermove'&&(now-previous.time<85||Math.hypot(x-previous.x,y-previous.y)<18))return;
  if(inWater(x,y)){addRipple(x,y);previous={x,y,time:now};resume();}
}
section.addEventListener('pointermove',waterGesture,{passive:true});section.addEventListener('pointerdown',waterGesture,{passive:true});
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)resume();else{cancelAnimationFrame(frame);frame=0;ripples=[];}},{threshold:0}).observe(section);
window.addEventListener('listening-garden-motion',()=>{cancelAnimationFrame(frame);frame=0;ripples=[];draw();resume();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else resume();});
new ResizeObserver(resize).observe(section);background.addEventListener('load',resize);resize();
})();

(function(root){
'use strict';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function projection(point,a,b){const x=b[0]-a[0],y=b[1]-a[1];return clamp(((point[0]-a[0])*x+(point[1]-a[1])*y)/(x*x+y*y||1),0,1);}
function response(kind,position,mode='press',pressure=.5,index=0){
  const t=clamp(position,0,1),force=clamp(pressure,0,1);
  if(kind==='guzheng'){
    const f=index/20,bridge=(.253+.485*f-(.12-.027*f))/(.875+.05*f-(.12-.027*f));
    return{offset:t<bridge&&mode!=='open'?force*4:0,brightness:clamp(.3+Math.abs((t-bridge)/(1-bridge)-.5)*1.3,.15,1),pressOnly:mode!=='open'&&t<bridge,label:t<bridge&&mode!=='open'?'Bend':'Pluck'};
  }
  if(mode==='harmonic'&&kind==='guqin'){
    const nodes=[[.2,28],[.25,24],[1/3,19],[.5,12],[2/3,19],[.75,24],[.8,28]];
    const node=nodes.reduce((best,current)=>Math.abs(current[0]-t)<Math.abs(best[0]-t)?current:best);
    return{offset:node[1],brightness:.9,pressOnly:false,label:'Harmonic'};
  }
  let offset=mode==='open'?0:-12*Math.log2(1-clamp(t,0,.75));
  if(kind==='pipa')offset=Math.round(offset);
  return{offset,brightness:clamp(.25+Math.abs(t-.5)*1.4,0,1),pressOnly:false,label:mode==='open'?'Open string':kind==='erhu'?'Bow':kind==='pipa'?'Fret':'Stopped string'};
}
const api={projection,response};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StringTouch=api;
})(typeof window!=='undefined'?window:globalThis);

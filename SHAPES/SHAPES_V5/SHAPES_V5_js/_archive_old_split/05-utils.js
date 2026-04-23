// ============================================================
// UTILS
// ============================================================
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist2=(ax,ay,bx,by)=>(ax-bx)**2+(ay-by)**2;
const lerp=(a,b,t)=>a+(b-a)*t;
function hsl(h,s=70,l=55,a=1){
  return 'hsla('+((h%360+360)%360)+','+s+'%,'+l+'%,'+a+')';
}
function arenaRect(){
  const s=game.arenaScale;
  const w=BASE_W*0.85*s, h=BASE_H*0.78*s;
  const maxW=BASE_W*0.95, maxH=BASE_H*0.90;
  const aw=Math.min(w,maxW), ah=Math.min(h,maxH);
  return{ x:(BASE_W-aw)/2, y:(BASE_H-ah)/2, w:aw, h:ah };
}


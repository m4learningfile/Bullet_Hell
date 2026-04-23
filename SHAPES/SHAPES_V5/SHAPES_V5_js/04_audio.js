// ============================================================
// AUDIO
// ============================================================
const Audio = (()=>{
  let aCx=null, masterGain, layers={}, tension=0;
  // V5: song library — 5 endless songs, menu ambience, boss rush, skull, and siren support
  const LEAD_HYPE=[
    659.25,0,0,783.99,0,880,0,0,659.25,0,0,523.25,0,587.33,0,0,
    698.46,0,880,0,1046.5,0,0,880,698.46,0,0,0,698.46,0,880,0,
    784,0,0,1046.5,1318.51,0,1046.5,0,784,0,0,659.25,784,0,0,0,
    987.77,0,784,0,587.33,0,784,0,987.77,0,1174.66,0,784,0,587.33,0,
  ];
  const LEAD_DRIVE=[
    880,0,1046.5,0,1318.51,0,1046.5,0,880,0,784,0,659.25,0,587.33,0,
    987.77,0,1174.66,0,1318.51,0,1567.98,0,1318.51,0,1174.66,0,880,0,987.77,0,
    1046.5,0,880,0,1318.51,0,1567.98,0,1318.51,0,1046.5,0,880,0,659.25,0,
    1174.66,0,987.77,0,880,0,1046.5,0,1318.51,0,1174.66,0,987.77,0,880,0,
  ];
  const LEAD_SYNTH=[
    523.25,0,659.25,0,783.99,0,1046.5,0,783.99,0,659.25,0,523.25,0,659.25,0,
    587.33,0,739.99,0,880,0,1174.66,0,880,0,739.99,0,587.33,0,739.99,0,
    622.25,0,783.99,0,932.33,0,1244.51,0,932.33,0,783.99,0,622.25,0,783.99,0,
    698.46,0,880,0,1046.5,0,1396.91,0,1046.5,0,880,0,698.46,0,880,0,
  ];
  const LEAD_DARK=[
    164.81,0,0,0,196,0,0,0,174.61,0,0,0,155.56,0,0,0,
    164.81,0,0,196,0,0,174.61,0,164.81,0,155.56,0,164.81,0,0,0,
    174.61,0,0,0,207.65,0,0,0,196,0,0,0,174.61,0,0,0,
    174.61,0,207.65,0,246.94,0,207.65,0,196,0,174.61,0,164.81,0,155.56,0,
  ];
  const LEAD_MENU=[220,0,246.94,0,261.63,0,293.66,0,329.63,0,293.66,0,261.63,0,246.94,0,220,0,246.94,0,261.63,0,293.66,0,329.63,0,293.66,0,261.63,0,246.94,0];
  const LEAD_BOSS=[164.81,0,196,0,220,0,246.94,0,261.63,0,293.66,0,329.63,0,349.23,0,329.63,0,293.66,0,261.63,0,246.94,0,220,0,196,0,174.61,0,164.81,0];
  const LEAD_SKULL=[98,0,98,0,110,0,123.47,0,98,0,98,0,146.83,0,123.47,0,98,0,98,0,110,0,123.47,0,164.81,0,146.83,0,123.47,0,110,0];
  const SONGS={
    menu:    { bpm:82,  roots:[110.00,130.81,98.00,123.47], lead:LEAD_MENU, thirdMap:[3,4,3,4] },
    endless1:{ bpm:112, roots:[110.00,87.31,130.81,98.00], lead:LEAD_HYPE,  thirdMap:[3,4,4,3] },
    endless2:{ bpm:118, roots:[146.83,110.00,164.81,123.47], lead:LEAD_DRIVE, thirdMap:[4,3,4,3] },
    endless3:{ bpm:124, roots:[87.31,130.81,98.00,116.54], lead:LEAD_SYNTH, thirdMap:[4,4,3,4] },
    endless4:{ bpm:116, roots:[98.00,123.47,146.83,110.00], lead:LEAD_MENU, thirdMap:[3,4,4,3] },
    endless5:{ bpm:128, roots:[123.47,98.00,164.81,130.81], lead:LEAD_DRIVE, thirdMap:[4,3,3,4] },
    gauntlet:{ bpm:98,  roots:[82.41,69.30,77.78,61.74],   lead:LEAD_BOSS,  thirdMap:[3,3,3,3] },
    skull:   { bpm:86,  roots:[98.00,82.41,73.42,65.41],   lead:LEAD_SKULL, thirdMap:[3,3,3,3] },
    intro:   { bpm:102, roots:[110.00,98.00,130.81,110.00], lead:LEAD_HYPE, thirdMap:[3,4,4,3] },
  };
  let currentSong=SONGS.menu;
  let STEP=60/currentSong.bpm/4;
  function setSong(id){
    if(!SONGS[id]) return;
    if(SONGS[id]===currentSong) return;
    currentSong=SONGS[id];
    STEP=60/currentSong.bpm/4;
    step=0;
  }
  const KICK =[1,0,0,0,1,0,0,0,1,0,0,1,1,0,0,0];
  const SNARE=[0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0];
  const HAT  =[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1];
  const OHAT =[0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0];
  const BASS_MULT=[1,0,0,1,0,1,1,0,1.5,0,0,1,0,2,0,1];
  function chordTones(i){
    const r=currentSong.roots[i]*2;
    const third=r*Math.pow(2,currentSong.thirdMap[i]/12);
    return [r,third,r*Math.pow(2,7/12)];
  }
  function init(){
    if(aCx)return;
    aCx=new(window.AudioContext||window.webkitAudioContext)();
    masterGain=aCx.createGain(); masterGain.gain.value=storedVol; masterGain.connect(aCx.destination);
    layers.drums=ml(0); layers.bass=ml(0); layers.pad=ml(0); layers.lead=ml(0);
    nextTime=aCx.currentTime+0.15; scheduler();
  }
  function ml(vol){ const g=aCx.createGain(); g.gain.value=vol; g.connect(masterGain); return{gain:g,target:0}; }
  function setLayers(w){ layers.drums.target=1; layers.bass.target=w>=4?0.95:0; layers.pad.target=w>=8?0.55:0.10; layers.lead.target=w>=12?0.65:0.18; }
  function setTension(t){ tension=Math.max(0,Math.min(1,t)); }
  function kickAt(t){
    const o=aCx.createOscillator(),g=aCx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(45,t+0.15);
    g.gain.setValueAtTime(1.1,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2);
    o.connect(g); g.connect(layers.drums.gain); o.start(t); o.stop(t+0.22);
  }
  function snareAt(t){
    const sz=Math.floor(aCx.sampleRate*0.18),buf=aCx.createBuffer(1,sz,aCx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<sz;i++) d[i]=(Math.random()*2-1)*(1-i/sz);
    const src=aCx.createBufferSource(); src.buffer=buf;
    const f=aCx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1800; f.Q.value=0.8;
    const g=aCx.createGain(); g.gain.setValueAtTime(0.6,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
    src.connect(f); f.connect(g); g.connect(layers.drums.gain); src.start(t);
    const o=aCx.createOscillator(),og=aCx.createGain(); o.type='triangle'; o.frequency.value=220;
    og.gain.setValueAtTime(0.3,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.1);
    o.connect(og); og.connect(layers.drums.gain); o.start(t); o.stop(t+0.12);
  }
  function hatAt(t,open=false){
    const dur=open?0.14:0.04,sz=Math.floor(aCx.sampleRate*dur),buf=aCx.createBuffer(1,sz,aCx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<sz;i++) d[i]=(Math.random()*2-1)*(1-i/sz);
    const src=aCx.createBufferSource(); src.buffer=buf;
    const f=aCx.createBiquadFilter(); f.type='highpass'; f.frequency.value=7500;
    const g=aCx.createGain(); g.gain.setValueAtTime(open?0.22:0.3,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(f); f.connect(g); g.connect(layers.drums.gain); src.start(t);
  }
  function bassAt(t,freq,dur=0.22){
    const o=aCx.createOscillator(),g=aCx.createGain(),f=aCx.createBiquadFilter();
    o.type='sawtooth'; o.frequency.value=freq; f.type='lowpass'; f.frequency.value=350+tension*500;
    g.gain.setValueAtTime(0.001,t); g.gain.linearRampToValueAtTime(0.55,t+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(f); f.connect(g); g.connect(layers.bass.gain); o.start(t); o.stop(t+dur+0.02);
    const o2=aCx.createOscillator(),g2=aCx.createGain(); o2.type='sine'; o2.frequency.value=freq/2;
    g2.gain.setValueAtTime(0.4,t); g2.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o2.connect(g2); g2.connect(layers.bass.gain); o2.start(t); o2.stop(t+dur+0.02);
  }
  function padAt(t,freqs,dur){
    for(const fr of freqs){
      const o=aCx.createOscillator(),g=aCx.createGain(); o.type='sawtooth'; o.frequency.value=fr;
      g.gain.setValueAtTime(0.001,t); g.gain.linearRampToValueAtTime(0.08,t+0.15);
      g.gain.linearRampToValueAtTime(0.08,t+dur-0.2); g.gain.linearRampToValueAtTime(0.001,t+dur);
      const lp=aCx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1400;
      o.connect(lp); lp.connect(g); g.connect(layers.pad.gain); o.start(t); o.stop(t+dur+0.05);
    }
  }
  function leadAt(t,freq,dur=0.18){
    const o=aCx.createOscillator(),o2=aCx.createOscillator(),g=aCx.createGain();
    o.type='square'; o.frequency.value=freq; o2.type='triangle'; o2.frequency.value=freq*2.005;
    const lp=aCx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2400;
    g.gain.setValueAtTime(0.001,t); g.gain.linearRampToValueAtTime(0.18,t+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(layers.lead.gain);
    o.start(t); o.stop(t+dur+0.02); o2.start(t); o2.stop(t+dur+0.02);
  }
  let nextTime=0,step=0;
  function scheduler(){
    if(!aCx)return;
    const now=aCx.currentTime;
    for(const k of Object.keys(layers)) layers[k].gain.gain.setTargetAtTime(layers[k].target,now,0.4);
    while(nextTime<now+0.25){
      const beat=step%16,bar=Math.floor(step/16)%4,root=currentSong.roots[bar];
      if(KICK[beat])kickAt(nextTime); if(SNARE[beat])snareAt(nextTime);
      if(HAT[beat])hatAt(nextTime,false); if(OHAT[beat])hatAt(nextTime,true);
      const bm=BASS_MULT[beat]; if(bm)bassAt(nextTime,root*bm,STEP*1.6);
      if(beat===0)padAt(nextTime,chordTones(bar),STEP*16);
      const leadF=currentSong.lead[bar*16+beat]; if(leadF)leadAt(nextTime,leadF,STEP*1.8);
      nextTime+=STEP; step++;
    }
    setTimeout(scheduler,40);
  }
  function blip(freq,dur=0.08,type='square',vol=0.12){
    if(!aCx)return;
    const t=aCx.currentTime,o=aCx.createOscillator(),g=aCx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g); g.connect(masterGain); o.start(t); o.stop(t+dur+0.02);
  }
  function siren(){
    if(!aCx) return;
    const t=aCx.currentTime, o=aCx.createOscillator(), g=aCx.createGain();
    o.type='sawtooth';
    o.frequency.setValueAtTime(420, t);
    o.frequency.linearRampToValueAtTime(820, t+0.35);
    o.frequency.linearRampToValueAtTime(420, t+0.7);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(0.18,t+0.02);
    g.gain.linearRampToValueAtTime(0.18,t+0.65);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.75);
    o.connect(g); g.connect(masterGain); o.start(t); o.stop(t+0.8);
  }
  function noise(dur=0.15,vol=0.15){
    if(!aCx)return;
    const t=aCx.currentTime,sz=Math.floor(aCx.sampleRate*dur),buf=aCx.createBuffer(1,sz,aCx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<sz;i++) d[i]=(Math.random()*2-1)*(1-i/sz);
    const src=aCx.createBufferSource(); src.buffer=buf;
    const g=aCx.createGain(); g.gain.value=vol; src.connect(g); g.connect(masterGain); src.start(t);
  }
  let storedVol=0.32;
  function setMasterVolume(v){ storedVol=v; if(masterGain) masterGain.gain.value=v; }
  function getStoredVolume(){ return storedVol; }
  return{init,setLayers,setTension,blip,noise,siren,setMasterVolume,getStoredVolume,setSong};
})();


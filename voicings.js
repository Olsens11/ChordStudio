"use strict";
/* Generate fretboard shapes by exact sounding pitch classes using the
   selected six-string tuning. Names identify a target pitch set, while
   physical voicing and fingering are separate decisions. */
(function(){
 const QUAL={
  "":[0,4,7],m:[0,3,7],dim:[0,3,6],aug:[0,4,8],
  sus4:[0,5,7],sus2:[0,2,7],"5":[0,7],
  "7":[0,4,7,10],maj7:[0,4,7,11],m7:[0,3,7,10],
  "m(maj7)":[0,3,7,11],m7b5:[0,3,6,10],dim7:[0,3,6,9],
  "6":[0,4,7,9],m6:[0,3,7,9],"9":[0,2,4,7,10],
  maj9:[0,2,4,7,11],m9:[0,2,3,7,10],add9:[0,2,4,7],
  madd9:[0,2,3,7],add11:[0,4,5,7],madd11:[0,3,5,7],
  "7sus4":[0,5,7,10],"7sus2":[0,2,7,10],
  "7b5":[0,4,6,10],"7#5":[0,4,8,10],
  "6/9":[0,2,4,7,9]
 };
 const PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11},mod=x=>(x%12+12)%12;
 function noteToPc(name){
  const m=String(name).match(/^([A-G])([#b♯♭]?)$/);
  if(!m)throw Error("Use a note name such as C, F#, or Bb.");
  return mod(PC[m[1]]+(m[2]==="#"||m[2]==="♯"?1:m[2]==="b"||m[2]==="♭"?-1:0));
 }
 function parseName(text){
  const s=String(text||"").trim().replaceAll("♯","#").replaceAll("♭","b");
  if(!s)throw Error("Enter a chord name first (e.g. C, F#m7, Bbmaj7, or G/B).");
  const m=s.match(/^([A-G][#b]?)(.*)$/);
  if(!m)throw Error("Chord name must start with A–G, optionally # or b.");
  let quality=m[2],bass=null;
  // 6/9 is a chord quality, not an inversion.
  if(quality!=="6/9"){
   const slash=quality.match(/^(.*?)\/([A-G][#b]?)$/);
   if(slash){quality=slash[1];bass=noteToPc(slash[2]);}
  }
  if(/^maj(or)?$/i.test(quality))quality="";
  else if(quality==="M7"||quality==="Δ7")quality="maj7";
  else if(/^min(or)?$/i.test(quality))quality="m";
  else if(/^min7$/i.test(quality))quality="m7";
  else if(quality==="-" )quality="m";
  else if(quality==="+" )quality="aug";
  else if(quality==="°")quality="dim";
  else if(quality==="ø"||quality==="ø7")quality="m7b5";
  else if(quality==="sus")quality="sus4";
  else if(quality==="maj")quality="";
  else if(quality==="M")quality="";
  else if(quality==="Maj7")quality="maj7";
  if(!Object.hasOwn(QUAL,quality))
   throw Error("That chord quality isn't supported for voicing search yet. Try C, Cm, Cmaj7, C7, Csus4, Cadd9 or a slash chord.");
  const root=noteToPc(m[1]),intervals=QUAL[quality];
  const pcs=[...new Set(intervals.map(n=>mod(root+n)))];
  if(bass!==null&&!pcs.includes(bass))
   throw Error("The slash bass is not in this chord's notes. Such slash chords need an expanded voicing search.");
  return {root,bass:bass??root,quality,pcs,name:s};
 }
 function estimateFingering(frets){
  const values=frets.map(Number),fingers=Array(6).fill(0),barres=[];
  const fretted=values.map((f,i)=>({f,i})).filter(x=>x.f>0)
    .sort((a,b)=>a.f-b.f||a.i-b.i);
  if(!fretted.length)return {fingers,barres};
  const min=fretted[0].f,lowest=fretted.filter(x=>x.f===min);
  const span=lowest.length>1?[lowest[0].i,lowest.at(-1).i]:null;
  // A probable index-finger barre is appropriate if it spans multiple strings
  // and no lower-fretted string lies beneath the bar.
  const barre=span&&span[1]-span[0]>=2&&
    values.slice(span[0],span[1]+1).every(f=>f>=min);
  if(barre){
   barres.push({from:span[0],to:span[1],fret:min,finger:1});
   for(const x of lowest)fingers[x.i]=1;
  }
  let n=barre?2:1;
  for(const x of fretted){
   if(barre&&x.f===min)continue;
   fingers[x.i]=Math.min(4,n++);
  }
  return {fingers,barres};
 }
 function suggest(name,tuning,limit=14){
  const chord=parseName(name);
  if(!tuning?.midi||tuning.midi.length!==6)throw Error("Confirm a six-string guitar tuning.");
  const valid=new Set(chord.pcs),strings=tuning.midi;
  const seen=new Map();
  const maxFret=15;
  for(let start=1;start<=12;start++){
   const choices=strings.map(open=>{
     const result=[-1];
     if(valid.has(mod(open)))result.push(0);
     for(let f=start;f<start+5&&f<=maxFret;f++)
       if(valid.has(mod(open+f)))result.push(f);
     return [...new Set(result)];
   });
   const cur=Array(6).fill(-1);
   function visit(i,mask,sounding,min,max,bassMidi){
     if(i===6){
       if(sounding<Math.max(2,chord.pcs.length)||mask.size!==valid.size)return;
       const midi=cur.map((f,k)=>f<0?Infinity:strings[k]+f);
       const low=Math.min(...midi);
       if(!Number.isFinite(low)||mod(low)!==chord.bass)return;
       const span=min===Infinity?0:max-min;
       if(span>4)return;
       const code=cur.join(",");
       const fingers=estimateFingering(cur);
       const noOpen=cur.filter(f=>f===0).length;
       const mutes=cur.filter(f=>f<0).length;
       let score= 200-sounding*8+mutes*8+(min===Infinity?0:min)*3+span*4
         -noOpen*3+fingers.fingers.filter(f=>f===4).length*2;
       // Penalize hand shapes using more than four separate fretted notes.
       if(cur.filter(f=>f>0).length>4&&!fingers.barres.length)score+=30;
       if(!seen.has(code)||score<seen.get(code).score)
          seen.set(code,{frets:[...cur],fingers,score,base:min>=5?min:1,code});
       return;
     }
     for(const f of choices[i]){
       if(f>=0&&!valid.has(mod(strings[i]+f)))continue;
       const nextMin=f>0?Math.min(min,f):min,nextMax=f>0?Math.max(max,f):max;
       if(nextMax-nextMin>4)continue;
       cur[i]=f;
       const nextMask=new Set(mask);
       if(f>=0)nextMask.add(mod(strings[i]+f));
       visit(i+1,nextMask,sounding+(f>=0?1:0),nextMin,nextMax,bassMidi);
     }
     cur[i]=-1;
   }
   visit(0,new Set(),0,Infinity,0,Infinity);
  }
  const ranked=[...seen.values()].sort((a,b)=>a.score-b.score||a.code.localeCompare(b.code));
  const diverse=[],used=new Set();
  for(const v of ranked){
    const signature=v.base+":"+v.frets.filter(f=>f>=0).length;
    if(used.has(signature)&&diverse.length<Math.max(6,limit/2))continue;
    diverse.push(v);used.add(signature);
    if(diverse.length>=limit)break;
  }
  for(const v of ranked){if(diverse.length>=limit)break;if(!diverse.includes(v))diverse.push(v);}
  return {chord,options:diverse};
 }
 window.ChordVoicings={parseName,suggest,estimateFingering};
})();
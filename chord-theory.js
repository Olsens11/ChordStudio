"use strict";
/* Chord naming uses the six sounding pitches, with the lowest pitch retained
   as bass. Several valid interpretations may share a pitch-class set. */
(function(){
 const SHARP=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
 const FLAT=["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
 const TUNINGS={
   "standard":{label:"Standard",midi:[40,45,50,55,59,64]},
   "drop-d":{label:"Drop D",midi:[38,45,50,55,59,64]},
   dadgad:{label:"DADGAD",midi:[38,45,50,55,57,62]},
   "open-g":{label:"Open G",midi:[38,43,50,55,59,62]},
   "open-d":{label:"Open D",midi:[38,45,50,54,57,62]},
   "open-e":{label:"Open E",midi:[40,47,52,56,59,64]},
   "half-step":{label:"Half step down",midi:[39,44,49,54,58,63]},
   "whole-step":{label:"Whole step down",midi:[38,43,48,53,57,62]}
 };
 const NATURAL={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
 const parseCustom=input=>{
   const parts=String(input||"").trim().split(/[\s,]+/);
   if(parts.length!==6)throw Error("Enter exactly six notes from low to high, with octaves, such as D2 A2 D3 G3 A3 D4.");
   return parts.map(n=>{
     const m=n.match(/^([A-Ga-g])([#b♯♭]?)(-?\d)$/);
     if(!m)throw Error("Enter each note with an octave, for example D2 or F#3.");
     const octave=Number(m[3]),modifier=(m[2]==="#"||m[2]==="♯")?1:(m[2]==="b"||m[2]==="♭")?-1:0;
     const midi=(octave+1)*12+NATURAL[m[1].toUpperCase()]+modifier;
     if(midi<20||midi>100)throw Error("Custom tuning notes must have practical guitar-pitch octaves.");
     return midi;
   });
 };
 let current={id:"standard",midi:[...TUNINGS.standard.midi],custom:"E2 A2 D3 G3 B3 E4",confirmed:false};
 const tuningLabel=()=>current.id==="custom"?"Custom":TUNINGS[current.id]?.label;
 const tuning=get=>({id:current.id,midi:[...current.midi],custom:current.custom,confirmed:current.confirmed});
 function setTuning(id,custom,confirmed=true){
   if(id!=="custom"&&!TUNINGS[id])throw Error("Unknown guitar tuning.");
   const midi=id==="custom"?parseCustom(custom):[...TUNINGS[id].midi];
   current={id,midi,custom:id==="custom"?String(custom):current.custom,confirmed:!!confirmed};
   syncTuning();
   document.dispatchEvent(new CustomEvent("chordstudio:tuningchange",{detail:tuning()}));
 }
 function syncTuning(){
   for(const id of ["songTuning","builderTuning"]){
     const el=document.getElementById(id);if(el)el.value=current.id;
   }
   for(const [input,wrap] of [["customTuning","customTuningWrap"],["builderCustomTuning","builderCustomTuningWrap"]]){
     const el=document.getElementById(input),w=document.getElementById(wrap);
     if(el){el.value=current.custom;}if(w)w.hidden=current.id!=="custom";
   }
   const label=document.getElementById("tuningSummary");
   if(label)label.textContent=tuningLabel()+(current.confirmed?" tuning selected.":" tuning assumed; confirm for accurate chord suggestions.")+
    " Changes affect note analysis, not fret positions.";
   for(const id of ["confirmSongTuning","confirmBuilderTuning"]){
     const button=document.getElementById(id);
     if(button){button.hidden=current.confirmed;button.disabled=current.confirmed;}
   }
   const disclaimer=document.getElementById("builderTheoryDisclaimer");
   if(disclaimer)disclaimer.textContent="Using "+tuningLabel()+
    " tuning. Names are suggestions; the musical context determines the best interpretation.";
 }
 function init(){
   for(const id of ["songTuning","builderTuning"]){
     const select=document.getElementById(id);if(!select)continue;
     select.addEventListener("change",()=>{
       try{
         setTuning(select.value,document.getElementById(id==="builderTuning"?"builderCustomTuning":"customTuning").value,true);
       }catch(e){select.value=current.id;window.message?.("Tuning: "+e.message,true);}
     });
   }
   for(const id of ["customTuning","builderCustomTuning"]){
     const input=document.getElementById(id);if(!input)continue;
     input.addEventListener("change",()=>{
       try{setTuning("custom",input.value,true);}
       catch(e){window.message?.("Tuning: "+e.message,true);}
     });
   }
   for(const id of ["confirmSongTuning","confirmBuilderTuning"]){
     document.getElementById(id)?.addEventListener("click",()=>{
       try{setTuning(current.id,current.custom,true);}
       catch(e){window.message?.("Tuning: "+e.message,true);}
     });
   }
   syncTuning();
 }
 const QUALITIES=[
  ["", [0,4,7]],["m",[0,3,7]],["dim",[0,3,6]],["aug",[0,4,8]],
  ["sus4",[0,5,7]],["sus2",[0,2,7]],["5",[0,7]],
  ["7",[0,4,7,10]],["maj7",[0,4,7,11]],["m7",[0,3,7,10]],
  ["m(maj7)",[0,3,7,11]],["m7b5",[0,3,6,10]],["dim7",[0,3,6,9]],
  ["6",[0,4,7,9]],["m6",[0,3,7,9]],
  ["9",[0,2,4,7,10]],["maj9",[0,2,4,7,11]],["m9",[0,2,3,7,10]],
  ["add9",[0,2,4,7]],["madd9",[0,2,3,7]],
  ["7sus4",[0,5,7,10]],["7sus2",[0,2,7,10]],
  ["7b5",[0,4,6,10]],["7#5",[0,4,8,10]],
  ["add11",[0,4,5,7]],["madd11",[0,3,5,7]],
  ["6/9",[0,2,4,7,9]]
 ];
 const pc=n=>(n%12+12)%12;
 function noteName(pitch,flat=false){return (flat?FLAT:SHARP)[pc(pitch)];}
 function spell(pcValue,rootPc,quality){
  // Common guitar chord spellings: C#m and F#m rather than Dbm/Gbm,
  // but Eb/Ab/Bb are often preferable to D#/G#/A#.
  const usuallyFlat=[3,8,10].includes(rootPc);
  const preferFlat=usuallyFlat&&(quality.indexOf("#")<0);
  return noteName(pcValue,preferFlat);
 }
 function analyze(frets,selectedTuning=current){
  if(!Array.isArray(frets)||frets.length!==6)throw Error("Expected six fret positions.");
  const strings=selectedTuning?.midi;
  if(!Array.isArray(strings)||strings.length!==6||strings.some(n=>!Number.isInteger(n)))throw Error("Confirm six valid tuning notes before analyzing.");
  const voices=[];
  for(let i=0;i<6;i++){
   const fret=Number(frets[i]);
   if(!Number.isInteger(fret)||fret< -1||fret>30)throw Error("Frets must be integers from 0–30 or x.");
   if(fret>=0){const midi=strings[i]+fret;voices.push({string:i,fret,midi,pc:pc(midi),
      name:noteName(midi),octave:Math.floor(midi/12)-1});}
  }
  if(!voices.length)return {voices:[],notes:[],bass:null,candidates:[],summary:"No sounding strings"};
  voices.sort((a,b)=>a.midi-b.midi);
  const pcs=[...new Set(voices.map(v=>v.pc))],bass=voices[0];
  const candidates=[];
  for(let root=0;root<12;root++){
   for(const [quality,intervals] of QUALITIES){
    const target=intervals.map(n=>pc(root+n));
    if(target.length!==pcs.length||pcs.some(n=>!target.includes(n)))continue;
    const isRootBass=bass.pc===root;
    const chordRoot=spell(root,root,quality);
    const bassName=spell(bass.pc,root,quality);
    const symbol=chordRoot+quality+(isRootBass?"":"/"+bassName);
    // Exact set matched; ordering primarily reflects the lowest note, but
    // do not discard valid alternatives where the root is not in the bass.
    const score=(isRootBass?100:45)+(quality.length?0:2)-
      (quality.includes("add")?3:0);
    candidates.push({name:symbol,root:chordRoot,quality,bass:bassName,
      rootInBass:isRootBass,score,intervals:[...intervals]});
   }
  }
  candidates.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
  return {
    voices,notes:pcs.map(n=>noteName(n)),bass:{...bass,name:noteName(bass.pc)},
    candidates:candidates.slice(0,10),
    summary:voices.map(v=>v.name+v.octave).join(" · ")
  };
 }
 window.ChordTheory={analyze,noteName,getTuning:tuning,setTuning,parseCustom};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
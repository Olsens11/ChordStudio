"use strict";
/* Chord naming uses the six sounding pitches, with the lowest pitch retained
   as bass. Several valid interpretations may share a pitch-class set. */
(function(){
 const SHARP=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
 const FLAT=["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
 const STRINGS=[40,45,50,55,59,64]; // E2 A2 D3 G3 B3 E4 (MIDI)
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
  const usuallyFlat=[1,3,6,8,10].includes(rootPc);
  const preferFlat=usuallyFlat&&(quality.indexOf("#")<0);
  return noteName(pcValue,preferFlat);
 }
 function analyze(frets){
  if(!Array.isArray(frets)||frets.length!==6)throw Error("Expected six fret positions.");
  const voices=[];
  for(let i=0;i<6;i++){
   const fret=Number(frets[i]);
   if(!Number.isInteger(fret)||fret< -1||fret>30)throw Error("Frets must be integers from 0–30 or x.");
   if(fret>=0){const midi=STRINGS[i]+fret;voices.push({string:i,fret,midi,pc:pc(midi),
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
 window.ChordTheory={analyze,noteName};
})();
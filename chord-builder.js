"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const state={editKey:null,oldName:null,frets:[-1,-1,-1,-1,-1,-1],fingers:[0,0,0,0,0,0],base:1,barres:[],start:null,voicings:[],voicingIndex:-1,voicingName:"",noteSpellings:{}};
  // UI arrays use low E → high e. Existing chord shapes are high e → low E.
  const names=["E","A","D","G","B","e"];
  const code=()=>state.frets.map(f=>f<0?"x":String(f)).map(String)
    .join(state.frets.some(f=>f>=10)?" ":"");
  const parse=input=>{
    const frets=parseCode(input);
    if(frets.some(f=>f>30))throw Error("Use frets from 0 through 30.");
    return frets;
  };
  function shape(){
    const base=Number($("builderBase").value)||1;
    const inverted=[...state.frets].reverse();
    return {id:code(),frets:inverted,
      fingers:[...state.fingers].reverse(),
      fret:base>1?base:0,
      listCapos:state.barres.map(b=>({
        fret:b.fret,startString:5-b.to,lastString:5-b.from,
        finger:b.finger
      })),
      showAllFrets:true,showNoteNames:$("builderDotMode").value==="notes",
      noteSpellings:{...state.noteSpellings},
      tuningMidi:[...(window.ChordTheory?.getTuning().midi||[40,45,50,55,59,64])]};
  }
  function feedback(text,err=false){
    const el=$("builderFeedback");el.textContent=text;el.classList.toggle("error",err);
  }
  function setCodeText(){$("builderCode").value=code();}
  function clearSuggestions(){
    state.voicings=[];state.voicingIndex=-1;state.voicingName="";
    $("builderPrevVoicing").disabled=true;$("builderNextVoicing").disabled=true;
    $("builderVoicingStatus").textContent="Enter a chord name, then suggest voicings or draw your own.";
  }
  function autoFingers(){
    const result=window.ChordVoicings?.estimateFingering(state.frets);
    if(result){state.fingers=result.fingers;state.barres=result.barres;}
  }
  function fingeringRow(){
    const host=$("builderFingerRow");host.replaceChildren();
    const stringNames=window.ChordTheory.getTuning().midi.map(n=>window.ChordTheory.noteName(n));
    for(let i=0;i<6;i++){
      const label=document.createElement("label"),caption=document.createElement("span");
      caption.textContent=stringNames[i];
      const select=document.createElement("select");select.setAttribute("aria-label","Finger for "+stringNames[i]+" string, "+(i+1)+" from low");
      for(let n=0;n<=4;n++){
        const option=document.createElement("option");option.value=n;option.textContent=n?" "+n:"–";select.append(option);
      }
      select.value=state.frets[i]>0?String(state.fingers[i]||0):"0";
      select.disabled=state.frets[i]<=0;
      select.addEventListener("change",()=>{
        state.fingers[i]=Number(select.value);
        for(const b of state.barres)if(i>=b.from&&i<=b.to&&state.frets[i]===b.fret)b.finger=state.fingers[i];
        updatePreview();
      });
      label.append(caption,select);host.append(label);
    }
  }
  function applySuggestion(index){
    const found=state.voicings[index];if(!found)return;
    state.voicingIndex=index;state.frets=[...found.frets];
    state.fingers=[...found.fingers.fingers];
    state.barres=found.fingers.barres.map(x=>({...x}));
    $("builderBase").value=String(found.base);setCodeText();draw();
    $("builderPrevVoicing").disabled=index===0;
    $("builderNextVoicing").disabled=index===state.voicings.length-1;
    $("builderVoicingStatus").textContent="Voicing "+(index+1)+" of "+state.voicings.length+" · "+code();
  }
  function suggestVoicings(){
    try{
      const result=window.ChordVoicings.suggest($("builderName").value.trim(),window.ChordTheory.getTuning(),18);
      state.voicings=result.options;state.voicingName=$("builderName").value.trim();
      if(!state.voicings.length){
        clearSuggestions();feedback("No matching fingering found in frets 0–15. Draw this chord manually.",true);return;
      }
      applySuggestion(0);
    }catch(e){clearSuggestions();feedback(e.message,true);}
  }
  function resetDrawing(){
    state.frets=[-1,-1,-1,-1,-1,-1];state.fingers.fill(0);state.barres=[];state.start=null;
    $("builderBase").value="1";$("builderDotMode").value="dots";
    clearSuggestions();setCodeText();draw();feedback("Drawing reset. Name and tuning were kept.");
  }
  function updateStringLabels(){
    const tuning=window.ChordTheory?.getTuning();
    if(!tuning)return;
    const label=document.getElementById("builderStringNames");
    if(!label)return;
    const names=tuning.midi.map(midi=>window.ChordTheory.noteName(midi));
    [...label.children].forEach((node,i)=>{node.textContent=names[i];});
  }
  function showNameSuggestions(){
    updateStringLabels();
    const host=$("builderSuggestedNames"),summary=$("builderAnalysis");
    host.replaceChildren();
    if(!window.ChordTheory){summary.textContent="Chord analysis is unavailable.";return;}
    try{
      const selected=window.ChordTheory.getTuning();
      if(!selected.confirmed)summary.textContent="Standard tuning assumed; confirm the tuning before relying on these names.";
      const result=window.ChordTheory.analyze(state.frets,selected);
      if(!result.voices.length){summary.textContent="Select one or more sounding strings.";return;}
      const bass=result.bass;
      summary.textContent=(selected.confirmed?"":"Tuning not yet confirmed · ")+"Voicing: "+result.summary+" · Bass: "+bass.name+bass.octave+
        " · Unique notes: "+result.notes.join(" – ");
      if(!result.candidates.length){
        const item=document.createElement("span");item.className="builder-unknown";
        item.textContent="No exact standard chord-name match. Enter your own name.";
        host.append(item);
        return;
      }
      for(const [i,candidate] of result.candidates.entries()){
        const button=document.createElement("button");button.type="button";
        button.className="builder-suggestion";button.textContent=candidate.name;
        button.title="Use "+candidate.name+" as chord name (same sounding notes)";
        button.addEventListener("click",()=>{
          $("builderName").value=candidate.name;
          feedback("Selected "+candidate.name+". Naming is interpretive—confirm it fits the song.");
        });
        if(i===0)button.classList.add("top-suggestion");
        host.append(button);
      }
    }catch(e){summary.textContent="Could not analyze the current frets: "+e.message;}
  }
  function noteSpellingControls(){
    const host=$("builderNoteSpellings");if(!host)return;
    host.replaceChildren();
    const tuning=window.ChordTheory.getTuning();
    const pitches=[...new Set(state.frets.map((f,i)=>f<0?null:((tuning.midi[i]+f)%12+12)%12)
      .filter(n=>n!==null))].filter(pc=>[1,3,6,8,10].includes(pc));
    host.hidden=$("builderDotMode").value!=="notes"||!pitches.length;
    if(host.hidden)return;
    const hint=document.createElement("span");hint.textContent="Individual spellings (click to switch ♯ / ♭): ";
    host.append(hint);
    const sharp=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const flat=["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
    for(const pc of pitches){
      const button=document.createElement("button");button.type="button";
      button.textContent=window.ChordKey?.noteName(pc,state.noteSpellings)||sharp[pc];
      button.title="Toggle "+sharp[pc]+" / "+flat[pc]+" on this chord";
      button.addEventListener("click",()=>{
        const now=window.ChordKey?.noteName(pc,state.noteSpellings)||sharp[pc];
        state.noteSpellings[pc]=now===sharp[pc]?flat[pc]:sharp[pc];
        draw();
      });
      host.append(button);
    }
  }
    function updatePreview(){
    const view=$("builderPreview");view.replaceChildren(makeDiagramCanvas(shape()));
    noteSpellingControls();showNameSuggestions();
    feedback("");
  }
  function removeBarresOnString(index){
    state.barres=state.barres.filter(bar=>index<bar.from||index>bar.to);
  }
  function draw(){
    const grid=$("builderGrid");grid.replaceChildren();
    grid.style.setProperty("--builder-base",state.base);
    // Status row toggles muted / open strings; also shows fretted string state.
    const status=document.createElement("div");status.className="builder-status-row";
    for(let string=0;string<6;string++){
      const button=document.createElement("button");button.type="button";
      const fret=state.frets[string];
      const pitch=window.ChordTheory?.getTuning().midi[string]||[40,45,50,55,59,64][string];
      const name=window.ChordKey?.noteName?.(pitch,state.noteSpellings)||window.ChordTheory.noteName(pitch);
      const showNotes=$("builderDotMode").value==="notes";
      button.classList.toggle("note-label",showNotes&&fret===0);
      button.textContent=fret<0?"×":fret===0?(showNotes?name:"○"):"●";
      button.title=names[string]+" string: "+(fret<0?"muted":fret===0?"open":"fret "+fret)+". Click for mute/open.";
      button.setAttribute("aria-label",button.title);
      button.addEventListener("click",()=>{
        removeBarresOnString(string);
        state.frets[string]=fret===0?-1:0;state.fingers[string]=0;
        clearSuggestions();autoFingers();draw();setCodeText();
      });
      status.append(button);
    }
    grid.append(status);
    const board=document.createElement("div");board.className="builder-board";
    const base=Number($("builderBase").value)||1;
    state.base=base;
    for(let row=0;row<5;row++){
      const cells=document.createElement("div");cells.className="builder-fret-row";
      const label=document.createElement("span");label.className="builder-fret-number";
      label.textContent=String(base+row);cells.append(label);
      for(let string=0;string<6;string++){
        const fret=base+row,button=document.createElement("button");button.type="button";
        button.className="builder-cell";button.dataset.string=String(string);
        button.dataset.fret=String(fret);
        const pressed=state.frets[string]===fret;
        const barre=state.barres.find(b=>b.fret===fret&&string>=b.from&&string<=b.to);
        button.classList.toggle("marked",pressed);
        button.classList.toggle("barre-marked",!!barre);
        button.textContent=pressed&&$("builderDotMode").value==="notes"?(window.ChordKey?.noteName?.(window.ChordTheory.getTuning().midi[string]+fret,state.noteSpellings)||window.ChordTheory.noteName(window.ChordTheory.getTuning().midi[string]+fret)):pressed?"●":"";
        button.title=names[string]+" string, fret "+fret+(pressed?", finger "+(state.fingers[string]||"unassigned"):"");
        button.setAttribute("aria-label",button.title);
        button.addEventListener("pointerdown",ev=>{
          if(ev.button!==0)return;
          ev.preventDefault();
          state.start={string,fret,id:ev.pointerId};
          button.setPointerCapture(ev.pointerId);
        });
        button.addEventListener("pointerup",ev=>{
          if(!state.start)return;
          // Hit test final screen coordinate: pointer capture keeps events on initial button.
          const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest(".builder-cell");
          const endString=target&&Number(target.dataset.fret)===state.start.fret
            ?Number(target.dataset.string):state.start.string;
          const from=Math.min(state.start.string,endString);
          const to=Math.max(state.start.string,endString);
          const targetFret=state.start.fret;
          const finger=0;
          const previous=state.frets[state.start.string]===targetFret&&from===to;
          state.barres=state.barres.filter(b=>b.fret!==targetFret||b.to<from||b.from>to);
          if(from===to){
            removeBarresOnString(from);
            state.frets[from]=previous?0:targetFret;
            state.fingers[from]=previous?0:finger;
          }else{
            for(let i=from;i<=to;i++){
              removeBarresOnString(i);state.frets[i]=targetFret;state.fingers[i]=finger;
            }
            state.barres.push({from,to,fret:targetFret,finger:finger||1});
          }
          state.start=null;clearSuggestions();autoFingers();setCodeText();draw();
        });
        button.addEventListener("pointercancel",()=>{state.start=null;});
        cells.append(button);
      }
      board.append(cells);
    }
    grid.append(board);
    const barres=$("builderBarres");barres.replaceChildren();
    for(let i=0;i<state.barres.length;i++){
      const b=state.barres[i],box=document.createElement("div");box.className="builder-barre-item";
      const label=document.createElement("span");
      label.textContent="Barre: fret "+b.fret+" · "+names[b.from]+"–"+names[b.to]+(b.finger?" · finger "+b.finger:"");
      const remove=document.createElement("button");remove.type="button";remove.textContent="×";
      remove.title="Remove barre (dots remain)";
      remove.addEventListener("click",()=>{
        state.barres.splice(i,1);draw();
      });
      box.append(label,remove);barres.append(box);
    }
    fingeringRow();updatePreview();
  }
  function open(key=null){
    state.editKey=key;state.oldName=null;state.start=null;
    state.barres=[];state.fingers=[0,0,0,0,0,0];
    state.frets=[-1,-1,-1,-1,-1,-1];state.noteSpellings={};
    clearSuggestions();$("builderDotMode").value="dots";$("builderSpelling").value="auto";
    $("builderName").value="";
    $("builderBase").value="1";
    if(key){
      const match=rendered.find(item=>diagramKey(item)===key);
      if(!match){feedback("This chord isn't in the organizer.",true);return;}
      state.oldName=match.name;
      state.frets=[...match.arr];
      state.fingers=[...(match.source.fingers||[0,0,0,0,0,0])].reverse();
      state.barres=(match.source.listCapos||[]).map(b=>({
        from:5-Number(b.lastString),to:5-Number(b.startString),
        fret:Number(b.fret),finger:Number(b.finger)||1
      }));
      $("builderName").value=match.name;
      $("builderBase").value=String(Math.max(1,Number(match.source.fret)||1));
      $("builderDotMode").value=match.source.showNoteNames===true?"notes":"dots";
      state.noteSpellings={...(match.source.noteSpellings||{})};
    }
    setCodeText();draw();
    $("chordBuilderTitle").textContent=key?"Edit chord diagram":"Create chord diagram";
    $("builderSave").textContent=key?"Save chord changes":"Add chord to organizer";
    const dlg=$("chordBuilderDialog");if(!dlg.open)dlg.showModal();
    $("builderName").focus();
  }
  function close(){
    $("chordBuilderDialog").close();state.editKey=null;
  }
  function save(){
    const name=$("builderName").value.trim();
    if(!name||name.length>80||/[\r\n:]/.test(name)){feedback("Enter a chord name (1–80 characters, no colon).",true);return;}
    try{
      const frets=parse($("builderCode").value);
      if(frets.every(f=>f<0))throw Error("At least one string must be open or fretted.");
      state.frets=frets;
      const base=Number($("builderBase").value)||1;
      if(frets.some(f=>f>0&&f<base))throw Error("A fretted note is below the top fret. Lower the top fret number.");
      if(frets.some(f=>f>0&&f>base+4))throw Error("Some fretted notes are outside the five displayed frets. Adjust the top fret or fret code.");
      const wasEmpty=!state.editKey&&parseEditor().items.length===0;
      const key=name+"\u001f"+frets.join(",");
      const oldKey=state.editKey;
      const lines=$("chordEditor").value.split(/\r?\n/);
      if(oldKey!==key&&parseEditor().items.some(item=>diagramKey(item)===key)){
        throw Error("That chord name and fret code already exist.");
      }
      const nextLine=name+": "+code();
      if(oldKey){
        const i=lines.findIndex(line=>{
          const match=line.match(/^\s*(.+?)\s*:\s*(.+?)\s*$/);if(!match)return false;
          try{return match[1]+"\u001f"+parseCode(match[2]).join(",")===oldKey;}catch{return false;}
        });
        if(i<0)throw Error("Original chord code could not be located.");
        lines[i]=nextLine;
        const old=rendered.find(item=>diagramKey(item)===oldKey);
        if(old&&catalog[old.name]){
          catalog[old.name]=catalog[old.name].filter(shape=>!isMatch(shape,old.arr));
          if(!catalog[old.name].length)delete catalog[old.name];
        }
        diagramOrder=diagramOrder.map(id=>id===oldKey?key:id);
        removedDiagrams.delete(oldKey);
      }else{lines.push(nextLine);}
      if(!catalog[name])catalog[name]=[];
      catalog[name]=catalog[name].filter(v=>!isMatch(v,frets));
      catalog[name].unshift(shape());
      $("chordEditor").value=lines.filter(Boolean).join("\n");
      if(wasEmpty&&!page?.source)$("includeChords").checked=true;
      close();renderDiagrams();
      message((oldKey?"Updated ":"Created ")+name+" chord. It is available in the organizer, tray, and saved project.");
    }catch(e){feedback(e.message,true);}
  }
  function init(){
    $("addCustomChord").addEventListener("click",()=>open());
    $("chordBuilderClose").addEventListener("click",close);
    $("builderCancel").addEventListener("click",close);
    $("builderSave").addEventListener("click",save);
    $("chordBuilderDialog").addEventListener("cancel",ev=>{ev.preventDefault();close();});
    $("builderCode").addEventListener("change",()=>{
      try{state.frets=parse($("builderCode").value);state.barres=[];
        state.fingers=[0,0,0,0,0,0];clearSuggestions();autoFingers();
        const fretted=state.frets.filter(f=>f>0);
        if(fretted.length){
          const first=Math.min(...fretted);
          if(first>5)$("builderBase").value=String(first);
        }
        draw();}catch(e){feedback(e.message,true);}
    });
    $("builderBase").addEventListener("change",draw);
    $("builderDotMode").addEventListener("change",draw);
    $("builderSpelling").addEventListener("change",draw);
    document.addEventListener("chordstudio:keychange",()=>{if($("chordBuilderDialog").open)draw();});
    $("builderReset").addEventListener("click",resetDrawing);
    $("builderAutoFingers").addEventListener("click",()=>{
      autoFingers();draw();feedback("Suggested fingers. Adjust them in the six-string row if needed.");
    });
    $("builderClearFingers").addEventListener("click",()=>{
      state.fingers.fill(0);state.barres.forEach(b=>b.finger=0);draw();
    });
    $("builderSuggestVoicing").addEventListener("click",suggestVoicings);
    $("builderPrevVoicing").addEventListener("click",()=>applySuggestion(state.voicingIndex-1));
    $("builderNextVoicing").addEventListener("click",()=>applySuggestion(state.voicingIndex+1));
    $("builderName").addEventListener("input",()=>{
      if(state.voicingName!==$("builderName").value.trim())clearSuggestions();
    });
    $("builderName").addEventListener("keydown",event=>{
      if(event.key==="Enter"){event.preventDefault();suggestVoicings();}
    });
    document.addEventListener("chordstudio:tuningchange",()=>{if($("chordBuilderDialog").open){clearSuggestions();draw();}});
  }
  window.ChordBuilder={open};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
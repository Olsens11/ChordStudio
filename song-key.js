"use strict";
/* The selected song key is an optional interpretation, not an asserted fact.
   Transposition is a separate previewed action. */
(function(){
 const $=id=>document.getElementById(id);
 const MAJOR=["C","Db","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
 const MINOR=["C","C#","D","Eb","E","F","F#","G","G#","A","Bb","B"];
 const PCs={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
 const SHARP=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
 const FLAT=["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
 const COMMON=["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
 const mod=n=>(n%12+12)%12;
 const rootPc=name=>{const m=String(name||"").match(/^([A-G])([#b]?)/);
   return m?mod(PCs[m[1]]+(m[2]==="#"?1:m[2]==="b"?-1:0)):null;};
 const keyList=[
   ...MAJOR.map(name=>({id:name+":maj",name:name+" major",root:rootPc(name),mode:"maj"})),
   ...MINOR.map(name=>({id:name+":min",name:name+" minor",root:rootPc(name),mode:"min"}))
 ];
 let selected="",source="",backup=null,prepared=null;
 function getState(){return {value:selected,source};}
 function keyById(id){return keyList.find(item=>item.id===id);}
 function preferFlat(){
   const key=keyById(selected);
   if(!key)return false;
   if(key.name.startsWith("F#"))return false;
   if(key.name.startsWith("C#"))return false;
   if(key.name.startsWith("G#"))return false;
   return /b/.test(key.name)||["F major","D minor","G minor","C minor","F minor"].includes(key.name);
 }
 function noteName(pitch,overrides={},mode=null){
   const pc=mod(pitch);
   if(overrides&&Object.hasOwn(overrides,pc))return overrides[pc];
   const setting=mode||$("builderSpelling")?.value||"auto";
   return (setting==="flat"||(setting==="auto"&&preferFlat())?FLAT:
      setting==="sharp"?SHARP:setting==="auto"&&selected?SHARP:COMMON)[pc];
 }
 function setKey(value="",newSource="manual"){
   if(value&&!keyById(value))throw Error("Unsupported song key.");
   selected=value;source=selected?newSource:"";
   if($("songKey"))$("songKey").value=selected;
   const key=keyById(selected);
   if($("confirmSongKey"))$("confirmSongKey").hidden=!key||source==="manual"||source==="confirmed"||source==="transposed";
   if($("keySummary")){
     $("keySummary").textContent=key?
       key.name+(source==="imported"?" · imported metadata — please confirm":source==="suggested"?" · suggested — please confirm":" · confirmed"):
       "Unselected — no key is assumed. Songs with multiple keys may stay unselected.";
   }
   document.dispatchEvent(new CustomEvent("chordstudio:keychange",{detail:getState()}));
 }
 function reset(){selected="";source="";backup=null;prepared=null;
   if($("undoTranspose"))$("undoTranspose").hidden=true;
   setKey("");if($("transposeKey"))$("transposeKey").value="";
 }
 function restore(data){
   const v=typeof data==="object"?data?.value:data;
   try{setKey(v||"",typeof data==="object"?data?.source||"saved":"saved");}
   catch{setKey("");}
 }
 function metadata(data){
   const values=[data?.key,data?.song_key,data?.tonality,data?.key_signature,data?.songKey];
   for(const value of values){
     if(typeof value!=="string")continue;
     let s=value.trim().replace(/♯/g,"#").replace(/♭/g,"b");
     if(!s)continue;
     const matched=s.match(/^([A-Ga-g][#b]?)(?:\s*(major|minor|maj|min|m))?$/i);
     if(!matched)continue;
     const name=matched[1][0].toUpperCase()+matched[1].slice(1);
     const pc=rootPc(name),minor=/^(minor|min|m)$/i.test(matched[2]||"");
     const match=keyList.find(k=>k.root===pc&&k.mode===(minor?"min":"maj")
       &&k.name.split(" ")[0]===name);
     if(match){setKey(match.id,"imported");return true;}
   }
   return false;
 }
 function suggestKey(){
   const roots=[];
   for(const item of parseEditor().items){
     const root=rootPc(item.name),minor=/^[A-G][#b]?m(?!aj)/.test(item.name);
     if(root!==null)roots.push({root,minor});
   }
   if(roots.length<2){message("Not enough chords to suggest a key. You can still choose one manually.");return;}
   const ranked=keyList.map(key=>{
     const scale=key.mode==="maj"?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10];
     const tonic=key.root;
     let score=0;
     for(const x of roots){
       const interval=mod(x.root-tonic);
       score+=scale.includes(interval)?2:-2;
       if(interval===0)score+=3;
       if(x.minor)score+=key.mode==="min"&&interval===0?1:0;
     }
     return {key,score};
   }).sort((a,b)=>b.score-a.score||a.key.name.localeCompare(b.key.name));
   const best=ranked.slice(0,3),top=best[0];
   $("keySummary").textContent="Possible keys (not confirmed): "+best.map(x=>x.key.name).join(", ")+
     ". Select the key yourself; relative keys and modulations may be ambiguous.";
   $("songKey").value=selected;
   message("Possible keys: "+best.map(x=>x.key.name).join(", ")+". None was automatically selected.");
 }
 function shiftName(name,semitones,targetKey){
   const raw=String(name).trim(),match=raw.match(/^([A-G])([#b♯♭]?)(.*)$/);
   if(!match)throw Error("Unsupported chord name: "+raw);
   const root=rootPc(match[1]+match[2].replace("♯","#").replace("♭","b"));
   let tail=match[3],bass="";
   if(tail!=="6/9"){
     const slash=tail.match(/^(.*?)\/([A-G])([#b♯♭]?)$/);
     if(slash){
       tail=slash[1];
       bass="/"+spell(mod(rootPc(slash[2]+slash[3].replace("♯","#").replace("♭","b"))+semitones),targetKey);
     }
   }
   if(!/^[a-zA-Z0-9()+#b°øΔ-]*$/.test(tail))
     throw Error("Unsupported chord notation: "+raw);
   return spell(mod(root+semitones),targetKey)+tail+bass;
 }
 function spell(pc,key){
   const flat=(/b/.test(key.name)||["F major","D minor","G minor","C minor","F minor"].includes(key.name))
     &&!key.name.startsWith("G#");
   return (flat?FLAT:SHARP)[pc];
 }
 function asShape(option){
   return {id:option.frets.map(n=>n<0?"x":n).join(","),
      frets:[...option.frets].reverse(),fingers:[...option.fingers.fingers].reverse(),
      fret:option.base>1?option.base:0,
      listCapos:option.fingers.barres.map(b=>({fret:b.fret,startString:5-b.to,lastString:5-b.from,finger:b.finger})),
      showAllFrets:true,showNoteNames:false,
      tuningMidi:[...window.ChordTheory.getTuning().midi]};
 }
 function diagramKeyFor(name,frets){return name+"\u001f"+frets.join(",");}
 function prepare(){
   const from=keyById(selected),to=keyById($("transposeKey").value);
   if(!from)throw Error("Select and confirm the song's current key first.");
   if(!to)throw Error("Choose a target key.");
   if(source==="imported"||source==="suggested")
     throw Error("Confirm the imported or suggested current key before transposing.");
   let shift=mod(to.root-from.root);
   if(shift>6)shift-=12;
   if(!shift)throw Error("These keys have the same tonic. Changing major/minor alone is not a pitch transposition.");
   applySongEdit(true);
   const items=parseEditor().items,layout=window.ChordLayout.exportProjectLayout();
   const names=new Set(items.map(x=>x.name));
   for(const sticker of layout.stickers)if(sticker.type==="diagram")names.add(sticker.name);
   const lines=[...$("songLines").querySelectorAll(".song-line")];
   for(const line of lines){
     for(const chord of line.querySelectorAll(".song-chord"))
       if(chord.textContent.trim())names.add(chord.textContent.trim());
     if(line.querySelector(".song-chord"))continue;
     const tokens=line.textContent.trim().split(/\s+/).filter(Boolean);
     if(tokens.length>=2&&tokens.every(t=>/^[A-G](?:#|b)?[a-zA-Z0-9()+#b°øΔ/-]*$/.test(t))){
       for(const token of tokens)names.add(token);
     }else if(tokens.length===1&&names.has(tokens[0]))names.add(tokens[0]);
   }
   if(!names.size)throw Error("No chord symbols to transpose.");
   const replacements=new Map(),shapes=new Map(),issues=[];
   for(const name of names){
     try{
       const renamed=shiftName(name,shift,to);
       const result=window.ChordVoicings.suggest(renamed,window.ChordTheory.getTuning(),6);
       if(!result.options.length)throw Error("no playable matching voicing in supported fret range");
       replacements.set(name,renamed);shapes.set(name,asShape(result.options[0]));
     }catch(e){issues.push(name+" ("+e.message+")");}
   }
   if(issues.length)throw Error("Cannot safely transpose every chord. Unsupported: "+
     issues.slice(0,6).join("; ")+(issues.length>6?" and "+(issues.length-6)+" more":"")+
     ". Nothing was changed.");
   return {from,to,shift,items,layout,replacements,shapes};
 }
 function makeTransposedSong(plan){
   const parent=document.createElement("div");
   parent.append(...[...$("songLines").childNodes].map(x=>x.cloneNode(true)));
   const lines=parent.querySelectorAll(".song-line");
   for(const line of lines){
     for(const span of line.querySelectorAll(".song-chord")){
       const old=span.textContent.trim();
       if(plan.replacements.has(old))span.textContent=plan.replacements.get(old);
     }
     if(line.querySelector(".song-chord"))continue;
     const tokens=line.textContent.trim().split(/\s+/).filter(Boolean);
     if(!tokens.length||!tokens.every(t=>plan.replacements.has(t)))continue;
     if(tokens.length<2&&!plan.items.some(x=>x.name===tokens[0]))continue;
     const walker=document.createTreeWalker(line,NodeFilter.SHOW_TEXT);
     while(walker.nextNode()){
       const node=walker.currentNode;
       node.textContent=node.textContent.replace(/\S+/g,token=>plan.replacements.get(token)||token);
     }
   }
   return [...parent.childNodes];
 }
 function previewTranspose(){
   try{
     prepared=prepare();
     $("transposeExplanation").textContent=prepared.from.name+" → "+prepared.to.name+
       " · "+Math.abs(prepared.shift)+" semitone"+(Math.abs(prepared.shift)===1?"":"s")+
       (prepared.shift>0?" up":" down")+". Suggested voicings use the selected guitar tuning.";
     const host=$("transposeChanges");host.replaceChildren();
     const list=document.createElement("div");list.className="transpose-pairs";
     for(const [oldName,newName] of prepared.replacements){
       const el=document.createElement("div");
       const old=document.createElement("span");old.textContent=oldName;
       const arrow=document.createElement("span");arrow.textContent=" → ";
       const newer=document.createElement("strong");newer.textContent=newName;
       el.append(old,arrow,newer);list.append(el);
     }
     host.append(list);$("transposeApply").disabled=false;
     $("transposeDialog").showModal();
   }catch(e){prepared=null;message("Transpose preview: "+e.message,true);}
 }
 function applyTranspose(){
   if(!prepared)return;
   const p=prepared;
   try{
     const song=makeTransposedSong(p),before=window.ChordProject.snapshot();
     const nextCatalog={};
     const editorLines=p.items.map(item=>{
       const name=p.replacements.get(item.name),shape=structuredClone(p.shapes.get(item.name));
       if(!nextCatalog[name])nextCatalog[name]=[];
       if(!nextCatalog[name].some(v=>v.frets.every((f,i)=>f===shape.frets[i])))nextCatalog[name].push(shape);
       const frets=[...shape.frets].reverse();
       return name+": "+frets.map(f=>f<0?"x":String(f))
         .join(frets.some(f=>f>=10)?" ":"");
     });
     const updatedLayout=structuredClone(p.layout);
     for(const sticker of updatedLayout.stickers){
       if(sticker.type!=="diagram")continue;
       const newName=p.replacements.get(sticker.name);
       if(!newName)continue;
       const originalName=sticker.name;
       sticker.name=newName;
       sticker.shape=structuredClone(p.shapes.get(originalName));
       sticker.code=[...sticker.shape.frets].reverse()
         .map(x=>x<0?"x":String(x)).join(" ");
       sticker.key=diagramKeyFor(newName,[...sticker.shape.frets].reverse());
     }
     const updatedKeys=new Map(p.items.map(item=>{
       const oldKey=diagramKeyFor(item.name,item.arr);
       const shape=p.shapes.get(item.name),newKey=diagramKeyFor(p.replacements.get(item.name),[...shape.frets].reverse());
       return [oldKey,newKey];
     }));
     const oldOrder=[...diagramOrder],oldRemoved=[...removedDiagrams];
     $("chordEditor").value=editorLines.join("\n");
     catalog=nextCatalog;
     diagramOrder=oldOrder.map(k=>updatedKeys.get(k)).filter(Boolean);
     removedDiagrams=new Set(oldRemoved.map(k=>updatedKeys.get(k)).filter(Boolean));
     chordUndo=[];chordRedo=[];
     $("songLines").replaceChildren(...song);
     renderDiagrams();window.ChordLayout.importProjectLayout(updatedLayout);
     $("songSection").hidden=!$("includeSong").checked||!$("songLines").textContent.trim();
     window.ChordLayout.refresh();
     backup=before;setKey(p.to.id,"transposed");$("transposeKey").value="";
     $("undoTranspose").hidden=false;
     prepared=null;$("transposeDialog").close();
     message("Transposed "+p.replacements.size+" chord names to "+p.to.name+
       ". Review the result and Save As to preserve your original version.");
   }catch(e){message("Transposition failed: "+e.message+
     ". If a partial change is visible, reopen the saved project.",true);}
 }
 function undoTranspose(){
   if(!backup)return;
   const snapshot=backup;backup=null;prepared=null;
   try{window.ChordProject.load(snapshot);$("undoTranspose").hidden=true;message("Transposition undone. Original chord bank and song restored.");}
   catch(e){message("Unable to restore pre-transpose version: "+e.message,true);}
 }
 function closeDialog(){prepared=null;if($("transposeDialog").open)$("transposeDialog").close();}
 function init(){
   for(const key of keyList){
     for(const id of ["songKey","transposeKey"]){
       const el=$(id),option=document.createElement("option");
       option.value=key.id;option.textContent=key.name;el.append(option);
     }
   }
   $("songKey").addEventListener("change",()=>setKey($("songKey").value,"manual"));
   $("suggestSongKey").addEventListener("click",suggestKey);
   $("confirmSongKey").addEventListener("click",()=>{
     if(selected){setKey(selected,"confirmed");message("Confirmed "+keyById(selected).name+" as the song key.");}
   });
   $("previewTranspose").addEventListener("click",previewTranspose);
   $("transposeApply").addEventListener("click",applyTranspose);
   $("transposeClose").addEventListener("click",closeDialog);
   $("transposeCancel").addEventListener("click",closeDialog);
   $("transposeDialog").addEventListener("cancel",e=>{e.preventDefault();closeDialog();});
   $("undoTranspose").addEventListener("click",undoTranspose);
   setKey("");
 }
 window.ChordKey={getState,setKey,reset,restore,metadata,noteName,previewTranspose};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
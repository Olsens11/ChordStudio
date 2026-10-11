"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const state={editKey:null,oldName:null,frets:[-1,-1,-1,-1,-1,-1],fingers:[0,0,0,0,0,0],base:1,barres:[],start:null};
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
      showAllFrets:$("builderShowDots").checked};
  }
  function feedback(text,err=false){
    const el=$("builderFeedback");el.textContent=text;el.classList.toggle("error",err);
  }
  function setCodeText(){$("builderCode").value=code();}
  function updatePreview(){
    const view=$("builderPreview");view.replaceChildren(makeDiagramCanvas(shape()));
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
      const fret=state.frets[string];button.textContent=fret<0?"×":fret===0?"○":"●";
      button.title=names[string]+" string: "+(fret<0?"muted":fret===0?"open":"fret "+fret)+". Click for mute/open.";
      button.setAttribute("aria-label",button.title);
      button.addEventListener("click",()=>{
        removeBarresOnString(string);
        state.frets[string]=fret===0?-1:0;state.fingers[string]=0;
        draw();setCodeText();
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
        button.textContent=pressed?(String(state.fingers[string]||"●")):"";
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
          const finger=Number($("builderFinger").value)||0;
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
          state.start=null;setCodeText();draw();
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
      label.textContent="Barre: fret "+b.fret+" · "+names[b.from]+"–"+names[b.to]+" · finger "+b.finger;
      const remove=document.createElement("button");remove.type="button";remove.textContent="×";
      remove.title="Remove barre (dots remain)";
      remove.addEventListener("click",()=>{
        state.barres.splice(i,1);draw();
      });
      box.append(label,remove);barres.append(box);
    }
    updatePreview();
  }
  function open(key=null){
    state.editKey=key;state.oldName=null;state.start=null;
    state.barres=[];state.fingers=[0,0,0,0,0,0];
    state.frets=[-1,-1,-1,-1,-1,-1];
    $("builderFinger").value="0";$("builderShowDots").checked=true;
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
      $("builderShowDots").checked=match.source.showAllFrets!==false;
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
        state.fingers=[0,0,0,0,0,0];
        const fretted=state.frets.filter(f=>f>0);
        if(fretted.length){
          const first=Math.min(...fretted);
          if(first>5)$("builderBase").value=String(first);
        }
        draw();}catch(e){feedback(e.message,true);}
    });
    $("builderBase").addEventListener("change",draw);
    $("builderShowDots").addEventListener("change",updatePreview);
  }
  window.ChordBuilder={open};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const undo=[], redo=[];
  let timer=0,lastChange=0,applying=false;
  function cursorPosition(){
    const root=$("songEditor"),sel=window.getSelection();
    if(!sel?.anchorNode||!root.contains(sel.anchorNode))return null;
    const start=sel.anchorNode.nodeType===Node.ELEMENT_NODE?sel.anchorNode:sel.anchorNode.parentElement;
    const line=start?.closest(".song-line")||start?.closest("#songEditor")?.firstElementChild;
    if(!line)return null;
    const index=[...root.children].indexOf(line);
    if(index<0)return null;
    try{
      const range=document.createRange();range.selectNodeContents(line);
      range.setEnd(sel.anchorNode,sel.anchorOffset);
      return {line:index,offset:range.toString().length};
    }catch{return null;}
  }
  function restoreCursor(caret){
    const editor=$("songEditor"),line=caret&&editor.children[caret.line];
    const range=document.createRange();
    if(line){
      let left=caret.offset;
      const walker=document.createTreeWalker(line,NodeFilter.SHOW_TEXT);
      let node;
      while((node=walker.nextNode())){
        if(left<=node.length){
          range.setStart(node,Math.max(0,left));range.collapse(true);break;
        }
        left-=node.length;
      }
      if(!node){range.selectNodeContents(line);range.collapse(false);}
    }else{range.selectNodeContents(editor);range.collapse(false);}
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
  }
  const snapshot=()=>({html:$("songEditor").innerHTML,caret:cursorPosition()});
  const isOpen=()=>!$("songEditorPanel").hidden;
  function availability(){
    const active=isOpen();
    $("songUndoRedo").hidden=!active;
    for(const id of ["undoSongText","undoSongTextMenu"])$(id).disabled=!active||undo.length<=1;
    for(const id of ["redoSongText","redoSongTextMenu"])$(id).disabled=!active||!redo.length;
  }
  function opened(){
    undo.length=0;redo.length=0;
    undo.push(snapshot());lastChange=0;
    availability();
    updateGuides();
  }
  function closed(){
    clearTimeout(timer);
    undo.length=0;redo.length=0;
    $("pageGuides").replaceChildren();
    availability();
  }
  function recordChange(){
    if(!isOpen()||applying)return;
    const html=snapshot();
    if(undo[undo.length-1].html===html.html)return;
    const time=Date.now();
    if(lastChange&&time-lastChange<350&&undo.length>1){
      undo[undo.length-1]=html;
    }else{
      undo.push(html);
      if(undo.length>110)undo.shift();
    }
    lastChange=time;
    redo.length=0;
    availability();
    updateGuides();
  }
  function replace(saved){
    applying=true;
    $("songEditor").innerHTML=saved.html;
    const editor=$("songEditor");
    // Keep the editor focus. Subsequent typing can start immediately.
    editor.focus({preventScroll:true});
    restoreCursor(saved.caret);
    applying=false;
    availability();
    updateGuides();
  }
  function undoText(){
    if(!isOpen()||undo.length<2)return;
    const current=snapshot();
    if(undo[undo.length-1].html!==current.html)undo.push(current);
    redo.push(undo.pop());
    lastChange=0;
    replace(undo[undo.length-1]);
  }
  function redoText(){
    if(!isOpen()||!redo.length)return;
    const html=redo.pop();undo.push(html);lastChange=0;replace(html);
  }
  function showGuides(){
    $("pageGuides").hidden=!$("showPageGuides").checked;
    updateGuides();
  }
  function updateGuides(){
    clearTimeout(timer);
    if(!isOpen()||!$("showPageGuides").checked)return;
    timer=setTimeout(drawGuides,130);
  }
  function drawGuides(){
    if(!isOpen())return;
    const overlay=$("pageGuides");
    overlay.replaceChildren();
    if(!$("showPageGuides").checked)return;
    const editor=$("songEditor"),stage=$("songEditorStage");
    const lines=[...editor.children];
    try{
      const breaks=window.ChordLayout?.editorPageBreaks()||[];
      const sr=stage.getBoundingClientRect();
      for(const entry of breaks){
        const line=lines[entry.index];
        if(!line)continue;
        const top=line.getBoundingClientRect().top-sr.top+stage.scrollTop;
        const guide=document.createElement("div");guide.className="page-guide";
        guide.style.top=Math.round(top)+"px";
        const tag=document.createElement("span");tag.textContent="PAGE "+entry.page+" STARTS HERE";
        guide.append(tag);overlay.append(guide);
      }
      overlay.style.height=Math.max(editor.scrollHeight,stage.scrollHeight)+"px";
    }catch(e){
      console.warn("Page boundaries could not be measured:",e);
    }
  }
  function init(){
    $("showPageGuides").addEventListener("change",showGuides);
    for(const id of ["includeChords","includeSong","showDiagrams","showCodes","columns","fontSize","paperSize","songEditFont","songEditLeading"])
      $(id)?.addEventListener("change",updateGuides);
    $("songEditor").addEventListener("beforeinput",()=>{
      if(!isOpen()||applying||!undo.length)return;
      undo[undo.length-1].caret=cursorPosition();
    });
    $("songEditor").addEventListener("input",recordChange);
    for(const id of ["undoSongText","undoSongTextMenu"])
      $(id).addEventListener("click",undoText);
    for(const id of ["redoSongText","redoSongTextMenu"])
      $(id).addEventListener("click",redoText);
    document.addEventListener("keydown",event=>{
      if(!isOpen()||!(event.ctrlKey||event.metaKey)||event.altKey)return;
      const key=event.key.toLowerCase();
      if(key==="z"){
        event.preventDefault();
        if(event.shiftKey)redoText();else undoText();
      }else if(key==="y"){
        event.preventDefault();redoText();
      }
    },true);
    availability();
  }
  window.SongEditing={opened,closed,updateGuides,recordChange,undo:undoText,redo:redoText};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

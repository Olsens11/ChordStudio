"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const undo=[], redo=[];
  let timer=0,lastChange=0,applying=false;
  const snapshot=()=>$("songEditor").innerHTML;
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
    if(undo[undo.length-1]===html)return;
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
  function replace(html){
    applying=true;
    $("songEditor").innerHTML=html;
    const editor=$("songEditor");
    // Keep the editor focus. Subsequent typing can start immediately.
    editor.focus({preventScroll:true});
    const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
    applying=false;
    availability();
    updateGuides();
  }
  function undoText(){
    if(!isOpen()||undo.length<2)return;
    const current=snapshot();
    if(undo[undo.length-1]!==current)undo.push(current);
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

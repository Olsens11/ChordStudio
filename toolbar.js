"use strict";
// Compact, keyboard-accessible File/Edit/View menus for the preview toolbar.
(function(){
  function init(){
    const toolbar=document.getElementById("previewToolbar");
    if(!toolbar)return;
    const menus=[...toolbar.querySelectorAll("details[data-toolbar-menu]")];
    const closeAll=(except=null)=>{
      for(const menu of menus)if(menu!==except)menu.open=false;
    };
    for(const menu of menus){
      menu.addEventListener("toggle",()=>{
        if(menu.open)closeAll(menu);
      });
      // Commands close the menu; View settings stay open for multi-option edits.
      menu.querySelectorAll(".toolbar-menu-panel button").forEach(button=>{
        button.addEventListener("click",()=>{menu.open=false;});
      });
    }
    const fullscreenButton=document.getElementById("toggleFullscreen");
    const syncFullscreen=()=>{
      if(!fullscreenButton)return;
      const on=!!document.fullscreenElement;
      fullscreenButton.setAttribute("aria-pressed",String(on));
      fullscreenButton.firstChild.textContent=on?"Exit fullscreen ":"Toggle fullscreen ";
    };
    fullscreenButton?.addEventListener("click",async()=>{
      try{
        if(document.fullscreenElement){
          await document.exitFullscreen();
        }else if(document.documentElement.requestFullscreen){
          // Browser-native F11 remains available; this is the page fullscreen API.
          await document.documentElement.requestFullscreen();
        }else{
          throw Error("Page fullscreen is not supported here. Try F11 in your browser.");
        }
      }catch(error){
        const status=document.getElementById("message");
        if(status)status.textContent="Could not change fullscreen: "+error.message;
      }
      syncFullscreen();
    });
    document.addEventListener("fullscreenchange",syncFullscreen);
    syncFullscreen();
    document.addEventListener("pointerdown",event=>{
      if(!menus.some(menu=>menu.open))return;
      if(!event.target.closest(".toolbar-menu"))closeAll();
    });
    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape")return;
      const opened=menus.find(menu=>menu.open);
      if(!opened)return;
      closeAll();
      opened.querySelector("summary")?.focus();
      event.preventDefault();
    });
  }
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
"use strict";
/* Three independent activity sections; only explicit document transitions reframe the view. */
(function(){
 const $=id=>document.getElementById(id);
 const headerGap=12;
 let ticket=0;
 function setPreview(open){
   const content=$("previewContent"),button=$("previewDisclosureToggle");
   content.classList.toggle("is-collapsed",!open);
   content.inert=!open;
   content.setAttribute("aria-hidden",String(!open));
   button.setAttribute("aria-expanded",String(open));
   button.querySelector(".activity-chevron").textContent=open?"▾":"▸";
   if(open)window.ChordLayout?.refresh();
 }
 function scrollToElement(element,gap=headerGap){
   if(!element)return;
   const top=element.getBoundingClientRect().top+window.scrollY-gap;
   window.scrollTo({top:Math.max(0,Math.round(top)),behavior:"instant"});
 }
 // Return to the same page-first view used when reopening a saved project.
 // Keep the other activity disclosures exactly as the user left them.
 function focusPaper(){
   const current=++ticket;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
     if(current!==ticket||$("previewContent").inert)return;
     const toolbar=$("previewToolbar");
     const gap=toolbar.getBoundingClientRect().height+7;
     scrollToElement($("printPage"),gap);
   }));
 }
 function activate(mode){
   const current=++ticket;
   document.body.classList.add("has-document");
   $("importDetails").open=false;
   $("organizerDetails").open=false;
   setPreview(true);
   // A blank document already opens the editor and lets it handle scroll/focus.
   if(mode==="new")return;
   if(mode==="project"){focusPaper();return;}
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
     if(current!==ticket)return;
     scrollToElement($("workspace"),headerGap);
   }));
 }
 function init(){
   $("previewDisclosureToggle").addEventListener("click",()=>{
     ++ticket;
     setPreview($("previewDisclosureToggle").getAttribute("aria-expanded")!=="true");
   });
   setPreview(false);
 }
 window.ChordWorkflow={activate,setPreview,focusPaper};
 // Defer-loaded before app.js: initialize synchronously so hash imports cannot be reset.
 init();
})();
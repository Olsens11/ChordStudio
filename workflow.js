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
 function activate(mode){
   const current=++ticket;
   document.body.classList.add("has-document");
   $("importDetails").open=false;
   $("organizerDetails").open=false;
   setPreview(true);
   // A blank document already opens the editor and lets it handle scroll/focus.
   if(mode==="new")return;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
     if(current!==ticket)return;
     if(mode==="project"){
       const toolbar=$("previewToolbar");
       const paper=$("printPage");
       // Match the paper's top edge to the sticky toolbar's bottom, plus a small gap.
       const gap=toolbar.getBoundingClientRect().height+7;
       scrollToElement(paper,gap);
     }else scrollToElement($("workspace"),headerGap);
   }));
 }
 function init(){
   $("previewDisclosureToggle").addEventListener("click",()=>{
     ++ticket;
     setPreview($("previewDisclosureToggle").getAttribute("aria-expanded")!=="true");
   });
   setPreview(false);
 }
 window.ChordWorkflow={activate,setPreview};
 // Defer-loaded before app.js: initialize synchronously so hash imports cannot be reset.
 init();
})();
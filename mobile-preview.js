"use strict";
/* Responsive WYSIWYG overview without changing document dimensions.
   Fit mode is visual-only; editing happens at original 96px/in geometry.
   Desktop, printing, and exported PDFs always use unscaled pages. */
(function(){
 const $=id=>document.getElementById(id);
 const root=$("printPage");
 if(!root)return;
 let wantedFit=true,suspended=false,pending=false;
 const mobile=()=>window.matchMedia("(max-width: 700px), (pointer: coarse)").matches;
 function dimensions(){
   const a4=$("paperSize")?.value==="a4";
   return {width:a4?794:816,height:a4?1123:1056};
 }
 function apply(){
   pending=false;
   const isMobile=mobile();
   const fit=isMobile&&wantedFit&&!suspended;
   $("mobilePageTools").hidden=!isMobile;
   root.classList.toggle("mobile-page-fit",fit);
   if(fit){
     const {width,height}=dimensions();
     // Width is measured from the actual output container, not a hardcoded
     // phone model. This responds to address bars, rotated screens and tablets.
     const cs=getComputedStyle(root);
     const available=root.clientWidth-parseFloat(cs.paddingLeft||0)-
       parseFloat(cs.paddingRight||0);
     const scale=Math.min(1,Math.max(.1,(available-4)/width));
     root.style.setProperty("--fit-scale",String(scale));
     root.style.setProperty("--fit-page-width",(width*scale)+"px");
     root.style.setProperty("--fit-page-height",(height*scale)+"px");
   }else{
     root.style.removeProperty("--fit-scale");
     root.style.removeProperty("--fit-page-width");
     root.style.removeProperty("--fit-page-height");
   }
   $("mobilePageModeBtn").textContent=fit?"Full size / edit":"Fit whole page";
   $("mobilePageModeBtn").setAttribute("aria-pressed",String(fit));
   $("mobilePageHint").textContent=fit
     ?"Whole-page view · tap a page or switch to full size to edit."
     :"Hold to move · pinch to resize · twist to rotate stickers.";
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(apply);}
 function switchMode(fit){
   wantedFit=fit;
   apply();
 }
 function init(){
   const observer=new MutationObserver(()=>schedule());
   observer.observe(root,{childList:true,subtree:false});
   $("mobilePageModeBtn").addEventListener("click",()=>switchMode(!wantedFit));
   root.addEventListener("click",event=>{
     if(!root.classList.contains("mobile-page-fit"))return;
     const paper=event.target.closest(".paper-wrapper");
     if(!paper)return;
     const index=[...root.children].indexOf(paper);
     switchMode(false);
     const target=root.children[index];
     // Make the selected full-size page available for placing and editing.
     target?.scrollIntoView({block:"nearest",inline:"start"});
   });
   window.addEventListener("resize",schedule,{passive:true});
   window.addEventListener("orientationchange",schedule,{passive:true});
   $("paperSize")?.addEventListener("change",schedule);
   window.addEventListener("beforeprint",()=>{suspended=true;apply();});
   window.addEventListener("afterprint",()=>{suspended=false;schedule();});
   schedule();
 }
 window.ChordMobilePages={
   suspend(value){suspended=!!value;apply();},
   isFitted:()=>root.classList.contains("mobile-page-fit"),
   measure:dimensions,
   refresh(){schedule();},
   edit(){if(mobile()&&wantedFit)switchMode(false);},
   fit(){if(mobile())switchMode(true);}
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
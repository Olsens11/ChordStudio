"use strict";
/* One saved document inversion setting and one consistent song/artist PDF name. */
(function(){
 const $=id=>document.getElementById(id);
 const originalTitle=document.title;
 const sanitize=value=>String(value||"")
   .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g,"-")
   .replace(/\s+/g," ").replace(/[.\s-]+$/g,"").trim();
 function filenameBase(){
   if(typeof page==="undefined"||!page)return "ChordStudio";
   const title=sanitize(page.title||$("songName").textContent).slice(0,100)||"Untitled song";
   // Imported 'artist' is the performer. For original songs, use the
   // songwriter when there isn't a performer credit; never invent an artist.
   const artist=sanitize(page.performedBy||page.artist||page.writtenBy||"").slice(0,70);
   return (title+(artist?"-"+artist:"")).slice(0,174);
 }
 function updateFilename(){
   document.title=(typeof page==="undefined"||!page)?originalTitle:filenameBase();
 }
 function apply(){
   $("printPage").classList.toggle("invert-document",Boolean($("invertDocument").checked));
   updateFilename();
 }
 function init(){
   $("invertDocument").addEventListener("change",apply);
   for(const id of ["songName","artistName"]){
     new MutationObserver(updateFilename).observe($(id),{
       childList:true,subtree:true,characterData:true
     });
   }
   apply();
 }
 window.ChordAppearance={apply,filenameBase,updateFilename};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
"use strict";
/* Give original songwriters an equal, deliberate path into the editor. */
(function(){
 const $=id=>document.getElementById(id);
 function hasUnsavedSheet(){
   if(!page)return false; // the initial example is not a user project
   return !!(
     $("songLines").textContent.trim()||
     $("songEditor").textContent.trim()||
     $("chordEditor").value.trim()||
     window.ChordLayout?.stickers()?.length);
 }
 function create(){
   if(hasUnsavedSheet()&&!window.confirm(
     "Start a new song? This replaces the current sheet. Save your project first if you want to keep your work."))return;
   const title=$("newSongTitle").value.trim()||"Untitled song";
   const artist=$("newSongArtist").value.trim();
   window.ChordSong.startBlankSong(title,artist,true);
 }
 function details(){
   if(!page){
     const title=$("songName").textContent;
     window.ChordSong.updateSongDetails(title||"Untitled song",$("artistName").textContent);
   }
   $("songDetailsTitle").value=page?.title||"Untitled song";
   $("songDetailsArtist").value=page?.artist||"";
   $("songDetailsDialog").showModal();
   $("songDetailsTitle").focus();
 }
 function close(){if($("songDetailsDialog").open)$("songDetailsDialog").close();}
 function init(){
   $("startOriginalSong").addEventListener("click",create);
   for(const id of ["newSongTitle","newSongArtist"]){
     $(id).addEventListener("keydown",event=>{
       if(event.key==="Enter"){event.preventDefault();create();}
     });
   }
   $("fileNewSongBtn").addEventListener("click",()=>{
     if(hasUnsavedSheet()&&!window.confirm(
       "Create a new document? Save the current project first if you want to keep it."))return;
     $("newSongTitle").value="";$("newSongArtist").value="";
     window.ChordSong.startBlankSong("Untitled song","",true);
   });
   document.addEventListener("keydown",event=>{
     if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.shiftKey&&
       event.key.toLowerCase()==="n"){
       event.preventDefault();
       $("fileNewSongBtn").click();
     }
   },true);
   $("editSongDetailsBtn").addEventListener("click",details);
   $("songDetailsClose").addEventListener("click",close);
   $("songDetailsCancel").addEventListener("click",close);
   $("songDetailsSave").addEventListener("click",()=>{
     window.ChordSong.updateSongDetails($("songDetailsTitle").value,$("songDetailsArtist").value);
     close();
   });
   $("songDetailsDialog").addEventListener("cancel",ev=>{ev.preventDefault();close();});
   $("songDetailsTitle").addEventListener("keydown",ev=>{
     if(ev.key==="Enter"){ev.preventDefault();$("songDetailsSave").click();}
   });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
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
   const writtenBy=$("newSongArtist").value.trim();
   const arrangedBy=$("newSongArranged").value.trim();
   const performedBy=$("newSongPerformed").value.trim();
   window.ChordSong.startBlankSong(title,"",true,true,{writtenBy,arrangedBy,performedBy});
   if(!title||title==="Untitled song")message("Your song is ready. Add a title or credits anytime from Edit → Song details & credits.");
 }
 function details(){
   if(!page){
     const title=$("songName").textContent;
     window.ChordSong.updateSongDetails(title||"Untitled song",$("artistName").textContent);
   }
   $("songDetailsTitle").value=page?.title||"Untitled song";
   $("songDetailsArtist").value=page?.performedBy??page?.artist??"";
   $("songDetailsWritten").value=page?.writtenBy||"";
   $("songDetailsArranged").value=page?.arrangedBy||"";
   $("songDetailsDialog").showModal();
   $("songDetailsTitle").focus();
 }
 function close(){if($("songDetailsDialog").open)$("songDetailsDialog").close();}
 function init(){
   $("startOriginalSong").addEventListener("click",create);
   for(const id of ["newSongTitle","newSongArtist","newSongArranged","newSongPerformed"]){
     $(id).addEventListener("keydown",event=>{
       if(event.key==="Enter"){event.preventDefault();create();}
     });
   }
   $("fileNewSongBtn").addEventListener("click",()=>{
     if(hasUnsavedSheet()&&!window.confirm(
       "Create a new document? Save the current project first if you want to keep it."))return;
     for(const id of ["newSongTitle","newSongArtist","newSongArranged","newSongPerformed"])$(id).value="";
     document.querySelectorAll(".optional-credits details").forEach(detail=>detail.open=false);
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
     window.ChordSong.updateSongDetails($("songDetailsTitle").value,{
       writtenBy:$("songDetailsWritten").value,
       performedBy:$("songDetailsArtist").value,
       arrangedBy:$("songDetailsArranged").value
     });
     close();
   });
   $("songDetailsDialog").addEventListener("cancel",ev=>{ev.preventDefault();close();});
   for(const id of ["songDetailsTitle","songDetailsWritten","songDetailsArtist","songDetailsArranged"]){
     $(id).addEventListener("keydown",ev=>{
       if(ev.key==="Enter"&&!ev.isComposing){
         ev.preventDefault();$("songDetailsSave").click();
       }
     });
   }
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
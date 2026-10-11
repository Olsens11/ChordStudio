"use strict";
/* Local recent-project snapshots. IndexedDB keeps large sticker images out of
   the small localStorage quota. Only explicit Save/Open writes to this list. */
(function(){
 const $=id=>document.getElementById(id);
 const DB="ChordStudio-recent-projects",STORE="projects",MAX=8;
 let dbPromise=null,currentId=null;
 function openDb(){
   if(dbPromise)return dbPromise;
   dbPromise=new Promise((resolve,reject)=>{
     if(!window.indexedDB){reject(Error("Local recent projects are unavailable in this browser."));return;}
     const request=indexedDB.open(DB,1);
     request.onupgradeneeded=()=>{const db=request.result;
       if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});};
     request.onsuccess=()=>resolve(request.result);
     request.onerror=()=>reject(request.error||Error("Cannot open local recent-project storage."));
   });
   dbPromise.catch(()=>{dbPromise=null;});
   return dbPromise;
 }
 async function rows(){
   const db=await openDb();
   return new Promise((resolve,reject)=>{
     const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).getAll();
     req.onsuccess=()=>resolve(req.result.sort((a,b)=>b.updated-a.updated));
     req.onerror=()=>reject(req.error);
   });
 }
 async function put(data,{newEntry=false}={}){
   if(!data||data.format!=="chordstudio-project")return;
   const db=await openDb(),id=!newEntry&&currentId?currentId:
     (crypto.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2));
   const entry={id,title:String(data.page?.title||"Untitled song").slice(0,200),
     artist:String(data.page?.artist||"").slice(0,200),
     updated:Date.now(),data:structuredClone(data)};
   await new Promise((resolve,reject)=>{
     const request=db.transaction(STORE,"readwrite").objectStore(STORE).put(entry);
     request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);
   });
   currentId=id;
   const all=await rows();
   for(const old of all.slice(MAX))await remove(old.id);
 }
 async function remove(id){
   const db=await openDb();
   await new Promise((resolve,reject)=>{
     const request=db.transaction(STORE,"readwrite").objectStore(STORE).delete(id);
     request.onsuccess=resolve;request.onerror=()=>reject(request.error);
   });
   if(currentId===id)currentId=null;
 }
 function errorText(error){
   return "Recent projects are unavailable ("+(error?.name==="QuotaExceededError"?
     "browser storage is full":error?.message||"browser storage error")+"). Downloads still work.";
 }
 function recentDate(value){
   try{return new Date(value).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});}
   catch{return "Saved locally";}
 }
 async function render(){
   const list=$("recentProjectsList");list.replaceChildren();
   try{
     const all=await rows();
     if(!all.length){
       const p=document.createElement("p");p.className="recent-empty";
       p.textContent="No recent projects on this device yet. Save or open a project to add it here.";
       list.append(p);
     }
     for(const item of all){
       const row=document.createElement("div");row.className="recent-project-row";
       const info=document.createElement("div");info.className="recent-project-info";
       const title=document.createElement("strong");title.textContent=item.title;
       const meta=document.createElement("span");
       meta.textContent=(item.artist?item.artist+" · ":"")+recentDate(item.updated);
       info.append(title,meta);
       const open=document.createElement("button");open.type="button";
       open.textContent="Open";open.title="Reopen this local project";
       open.addEventListener("click",()=>{
         try{
           window.ChordProject.load(structuredClone(item.data));
           currentId=item.id;close();
           window.ChordWorkflow?.activate("project");
         }catch(e){message("Could not reopen recent project: "+e.message,true);}
       });
       const forget=document.createElement("button");forget.type="button";
       forget.textContent="×";forget.setAttribute("aria-label","Remove "+item.title+" from recents");
       forget.title="Remove this local copy from recents (not a downloaded file)";
       forget.addEventListener("click",()=>remove(item.id).then(render).catch(e=>message(errorText(e),true)));
       row.append(info,open,forget);list.append(row);
     }
     $("recentProjectsClear").disabled=!all.length;
   }catch(e){
     const p=document.createElement("p");p.className="recent-empty";p.textContent=errorText(e);list.append(p);
   }
 }
 function close(){if($("recentProjectsDialog").open)$("recentProjectsDialog").close();}
 function init(){
   $("recentProjectsBtn").addEventListener("click",async()=>{
     $("recentProjectsDialog").showModal();await render();
   });
   $("recentProjectsClose").addEventListener("click",close);
   $("recentProjectsDone").addEventListener("click",close);
   $("recentProjectsDialog").addEventListener("cancel",e=>{e.preventDefault();close();});
   $("recentProjectsClear").addEventListener("click",async()=>{
     if(!window.confirm("Remove the locally stored recent-project copies? Downloaded .chordstudio files are not affected."))return;
     try{for(const item of await rows())await remove(item.id);await render();}
     catch(e){message(errorText(e),true);}
   });
 }
 window.ChordRecents={
   onSaved:data=>put(data).catch(e=>message(errorText(e),true)),
   onOpened:data=>put(data,{newEntry:true}).catch(e=>message(errorText(e),true)),
   newDocument:()=>{currentId=null;},
   openDialog:async()=>{$("recentProjectsDialog").showModal();await render();}
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
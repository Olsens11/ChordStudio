"use strict";
/* Full Unicode emoji search, categories and skin tones via emoji-picker-element.
   The picker and its emoji data load only when the user opens it. */
(function(){
  const $=id=>document.getElementById(id);
  let loading=null,caret={start:0,end:0};
  const FAVOURITES="😀 😃 😄 😁 😆 😅 😂 🤣 😊 🙂 🙃 😉 😍 🥰 😘 😎 🤩 🥳 😢 😭 😡 😱 🤗 🤔 🙏 👏 👍 👎 💪 ✌️ 🤘 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💕 💖 💔 ⭐ 🌟 ✨ 🔥 🎉 🎶 🎵 🎸 🎤 🥁 🎹 🎷 🎺 🎼 🎧 🌈 🌹 🌻 🍀 🌙 ☀️ 🌊 🌎 🐶 🐱 🦋 🐦 🦉 🍕 🍔 🍺 ☕ 🎁 🎈 🏆 💡 📝 📌 📎 ✅ ❌ ➡️ ⬅️ ⬆️ ⬇️ ⚡ 🚀 💯 🎯".split(" ");
  function close(){
    $("emojiPickerPopover").hidden=true;
    $("noteEmojiButton").setAttribute("aria-expanded","false");
  }
  function caretFromText(){
    const field=$("noteText");
    caret={start:field.selectionStart||0,end:field.selectionEnd||0};
  }
  function insert(unicode){
    if(!unicode||$("noteEditor").hidden)return;
    const field=$("noteText");
    const from=Math.min(caret.start,field.value.length);
    const to=Math.min(caret.end,field.value.length);
    field.setRangeText(unicode,from,to,"end");
    caretFromText();
    field.dispatchEvent(new Event("input",{bubbles:true}));
    // Reposition controls after insertion without closing the emoji panel.
  }
  function position(){
    const panel=$("emojiPickerPopover"),editor=$("noteEditor");
    const r=editor.getBoundingClientRect(),w=342,h=Math.min(470,window.innerHeight-20);
    const x=r.right+w+8<=window.innerWidth? r.right+8:
      r.left-w-8>=8?r.left-w-8:Math.max(8,window.innerWidth-w-8);
    panel.style.left=Math.round(x)+"px";
    panel.style.top=Math.round(Math.max(8,Math.min(window.innerHeight-h-8,r.top)))+"px";
  }
  function fallback(){
    const root=$("emojiPickerHost");root.replaceChildren();
    const label=document.createElement("p");label.textContent="Common emojis (full picker unavailable offline)";
    label.className="emoji-loading";root.append(label);
    const grid=document.createElement("div");grid.className="emoji-fallback-grid";
    for(const symbol of FAVOURITES){
      const button=document.createElement("button");button.type="button";button.textContent=symbol;
      button.title="Insert "+symbol;button.addEventListener("click",()=>insert(symbol));grid.append(button);
    }
    root.append(grid);
  }
  async function initialize(){
    if(loading)return loading;
    loading=(async()=>{
      try{
        await import("https://cdn.jsdelivr.net/npm/emoji-picker-element@1.29.1/index.js");
        const root=$("emojiPickerHost");
        const picker=document.createElement("emoji-picker");
        picker.setAttribute("data-source","https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1.8.0/en/emojibase/data.json");
        picker.addEventListener("emoji-click",e=>insert(e.detail?.unicode));
        picker.addEventListener("emoji-picker-error",()=>fallback());
        root.replaceChildren(picker);
      }catch(e){
        console.warn("Full emoji picker unavailable:",e);
        fallback();
      }
    })();
    return loading;
  }
  async function toggle(){
    if(!$("emojiPickerPopover").hidden){close();return;}
    caretFromText();
    $("emojiPickerPopover").hidden=false;
    $("noteEmojiButton").setAttribute("aria-expanded","true");
    position();
    await initialize();
  }
  function init(){
    $("noteEmojiButton").addEventListener("click",toggle);
    $("emojiPickerClose").addEventListener("click",close);
    for(const event of ["keyup","mouseup","select","focus","input"]){
      $("noteText").addEventListener(event,caretFromText);
    }
    document.addEventListener("pointerdown",event=>{
      if($("emojiPickerPopover").hidden)return;
      if(!event.target.closest("#emojiPickerPopover,#noteEmojiButton"))close();
    });
    window.addEventListener("resize",()=>{
      if(!$("emojiPickerPopover").hidden)position();
    });
    document.addEventListener("keydown",event=>{
      if(event.key==="Escape"&&!$("emojiPickerPopover").hidden){close();event.stopPropagation();}
    },true);
  }
  window.ChordEmoji={close,insert,open:toggle};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
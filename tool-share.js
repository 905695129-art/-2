/* Heart Tool: shareable invitation demo. No real payment or secure content gating. */
(function(){
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function payload(){
    if(document.querySelector("#editor").classList.contains("active")) readLevels();
    return {v:1,title:document.getElementById("title").value,intro:document.getElementById("intro").value,recipient:document.getElementById("recipient").value,levels:levels};
  }
  function copy(url){
    if(navigator.share){navigator.share({title:"心意闯关邀请",url:url}).catch(function(){fallback(url);});return;}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(function(){toast("专属邀请链接已复制 ♡");}).catch(function(){fallback(url);});}
    else fallback(url);
  }
  function fallback(url){var box=document.createElement("textarea");box.value=url;document.body.appendChild(box);box.select();try{document.execCommand("copy");toast("专属邀请链接已复制 ♡");}catch(e){prompt("请复制邀请链接",url);}box.remove();}
  window.shareInvite=function(){
    var d=payload(),bytes=new TextEncoder().encode(JSON.stringify(d)),bin="";
    bytes.forEach(function(b){bin+=String.fromCharCode(b);});
    var token=btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    var url=location.origin+location.pathname+"#gift="+token;
    if(url.length>7000){toast("内容太长，请精简后再分享");return;}
    persist();copy(url);
  };
  function decode(token){
    try{var s=token.replace(/-/g,"+").replace(/_/g,"/");s+="=".repeat((4-s.length%4)%4);var bin=atob(s),a=Uint8Array.from(bin,function(ch){return ch.charCodeAt(0);});var d=JSON.parse(new TextDecoder().decode(a));if(d.v!==1||!Array.isArray(d.levels)||d.levels.length>60)return null;return d;}catch(e){return null;}
  }
  function guest(d){
    document.querySelector(".shell").classList.add("hide");
    var root=document.createElement("main");root.style.cssText="max-width:620px;margin:0 auto;padding:24px 16px 60px;font-family:system-ui,-apple-system,sans-serif;color:#503b49";
    root.innerHTML='<header style="text-align:center;padding:22px 10px;background:linear-gradient(145deg,#ffe4ee,#fff8fb);border:1px solid #f1dce6;border-radius:22px"><div style="font-size:38px">💌</div><small style="letter-spacing:2px;color:#bd668b">A LITTLE GIFT FOR YOU</small><h1>'+esc(d.title)+'</h1><p style="color:#987f90;line-height:1.8">'+esc(d.intro)+'</p><p style="color:#987f90">'+(d.recipient?"送给："+esc(d.recipient):"")+'</p></header><div id="guestLevels"></div><p style="text-align:center;color:#b59eaa;font-size:11px">心意闯关 · 体验演示</p>';
    document.body.appendChild(root);var opened=[];
    function render(){root.querySelector("#guestLevels").innerHTML=d.levels.map(function(l,i){var yes=opened.indexOf(i)>=0;return '<article style="background:white;border:1px solid #f1dce6;border-radius:18px;padding:17px;margin:12px 0"><div style="display:flex;justify-content:space-between"><span style="background:#ffe8f0;color:#bd4d7b;border-radius:30px;padding:6px 10px;font-size:11px">第 '+(i+1)+' 关</span><b style="color:#bd4d7b">'+(yes?"已开启":"¥"+Number(l.price).toFixed(2))+'</b></div><h3>'+esc(l.name)+'</h3><p style="font-size:13px;color:#987f90">'+esc(l.hint)+'</p>'+(yes?'<div style="background:#fff7fa;padding:13px;border-radius:12px;line-height:1.7">'+esc(l.content)+'</div>':'<button data-open="'+i+'" style="width:100%;padding:13px;border:0;border-radius:12px;background:linear-gradient(130deg,#f3a1bd,#df6797);color:white;font-weight:700">模拟付款并解锁 · ¥'+Number(l.price).toFixed(2)+'</button>')+'</article>';}).join("");root.querySelectorAll("[data-open]").forEach(function(b){b.onclick=function(){opened.push(Number(b.dataset.open));render();};});}
    render();
  }
  var match=location.hash.match(/^#gift=(.+)$/);if(match){var d=decode(match[1]);if(d)guest(d);else toast("分享链接无效或已损坏");}
  var action=document.querySelector("#editor .actions");if(action){var b=document.createElement("button");b.className="btn soft";b.textContent="生成分享链接 ↗";b.onclick=window.shareInvite;action.insertBefore(b,action.lastElementChild);}
})();
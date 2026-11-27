// V2 share and backup helpers. Share payloads contain text/config only; media hosting is a later backend task.
function heartPayload(){
  if(document.querySelector('.level')) readLevels();
  return {v:2,title:document.getElementById('title').value,intro:document.getElementById('intro').value,recipient:document.getElementById('recipient').value,levels};
}
function shareInvite(){
  const d=heartPayload();
  const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const url=location.origin+location.pathname+'#gift='+encoded;
  if(location.protocol==='file:'){toast('网页部署后才能生成跨设备链接');return;}
  if(url.length>7000){toast('内容太长，请精简文字后再分享');return;}
  if(navigator.share){navigator.share({title:d.title,text:d.intro,url}).catch(()=>heartCopy(url));}
  else heartCopy(url);
}
function heartCopy(url){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(()=>toast('专属邀请链接已复制 ♡')).catch(()=>heartCopyFallback(url));
  }else heartCopyFallback(url);
}
function heartCopyFallback(url){
  const box=document.createElement('textarea');box.value=url;box.setAttribute('readonly','');box.style.position='fixed';box.style.opacity='0';document.body.appendChild(box);box.select();
  try{const ok=document.execCommand('copy');toast(ok?'专属邀请链接已复制 ♡':'请长按文本框复制邀请链接');if(!ok)prompt('复制这条专属邀请链接：',url);}catch(_){prompt('复制这条专属邀请链接：',url);}
  box.remove();
}
function exportData(){
  const blob=new Blob([JSON.stringify(heartPayload(),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='心意闯关备份.json';a.click();URL.revokeObjectURL(a.href);toast('备份已导出');
}
function importData(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();reader.onload=()=>{try{
    const d=JSON.parse(reader.result);if(!Array.isArray(d.levels)||!d.levels.length)throw Error();
    levels=d.levels;unlocked=[];document.getElementById('title').value=d.title||'';document.getElementById('intro').value=d.intro||'';document.getElementById('recipient').value=d.recipient||'';
    renderLevels();save();toast('备份导入成功');
  }catch(_){toast('备份文件无效');}};reader.readAsText(file);e.target.value='';
}
function heartLoadGift(){
  if(!location.hash.startsWith('#gift='))return;
  try{
    let s=location.hash.slice(6).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';
    const d=JSON.parse(decodeURIComponent(escape(atob(s))));if(d.v!==2||!Array.isArray(d.levels)||!d.levels.length)return;
    levels=d.levels;unlocked=[];document.getElementById('title').value=d.title||'一份专属惊喜';document.getElementById('intro').value=d.intro||'';document.getElementById('recipient').value=d.recipient||'';
    document.getElementById('create').classList.add('hidden');document.getElementById('lab').classList.add('hidden');document.getElementById('preview').classList.remove('hidden');
    document.querySelector('[data-tab=create]').classList.add('hidden');document.querySelector('[data-tab=lab]').classList.add('hidden');document.querySelector('[data-nav=create]').classList.add('hidden');document.querySelector('[data-nav=lab]').classList.add('hidden');
    document.querySelector('[data-tab=preview]').classList.add('active');document.querySelector('[data-nav=preview]').classList.add('active');renderPreview();
  }catch(_){toast('分享内容读取失败');}
}
window.addEventListener('load',heartLoadGift);

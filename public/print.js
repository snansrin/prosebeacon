window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.opener||event.data?.type!=='prosebeacon-report'||typeof event.data.html!=='string')return;
  const parsed=new DOMParser().parseFromString(event.data.html,'text/html');
  for(const element of parsed.querySelectorAll('script,iframe,object,embed,form,link,style'))element.remove();
  document.body.replaceChildren(...parsed.body.childNodes);
  requestAnimationFrame(()=>window.print());
});
if(window.opener)window.opener.postMessage({type:'prosebeacon-report-ready'},location.origin);

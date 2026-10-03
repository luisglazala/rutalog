/* RUTALOG mejoras-citas v10 (b64 parts) */
(function(){
  if (window.__rutalogCitasV10) return;
  var N = 8, parts = [], done = 0;
  function finish(){
    try {
      var b64 = parts.join("");
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      var code = new TextDecoder("utf-8").decode(bytes);
      (0,eval)(code);
    } catch(e){ console.error("[RUTALOG] citas v10", e); }
  }
  for (var i=0;i<N;i++){
    (function(i){
      fetch("./mejoras-citas-v10-b64-"+i+".txt?v=1",{cache:"no-store"})
        .then(function(r){return r.text();})
        .then(function(t){ parts[i]=t.trim(); done++; if(done===N) finish(); })
        .catch(function(e){ console.error(e); });
    })(i);
  }
})();

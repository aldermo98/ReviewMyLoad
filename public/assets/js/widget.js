(function(){
  var spin = document.getElementById("spin");
  var statusText = document.getElementById("statusText");
  var panel = document.getElementById("panel");
  var reviewText = document.getElementById("reviewText");
  var copyBtn = document.getElementById("copyBtn");
  var copyIcon = document.getElementById("copyIcon");
  var copyText = document.getElementById("copyText");

  var photosWrap = document.getElementById("photos");
  var photosRow = document.getElementById("photosRow");
  var photoCount = document.getElementById("photoCount");

  function setLoading(on, msg){
    if (spin) spin.style.display = on ? "inline-block" : "none";
    if (statusText) statusText.textContent = msg || (on ? "Generating…" : "");
  }

  function getTokenFromPath(){
    // /r/<token>
    var parts = (location.pathname || "").split("/").filter(Boolean);
    return parts.length >= 2 ? parts[1] : "";
  }

  function safeString(v){ return v == null ? "" : String(v).trim(); }

  function parseUrls(text){
    var raw = safeString(text);
    if (!raw) return [];
    var parts = raw.split(/[\n,|]+/g);
    var urls = [];
    for (var i=0;i<parts.length;i++){
      var m = safeString(parts[i]).match(/https?:\/\/[^\s]+/g);
      if (m) for (var j=0;j<m.length;j++) urls.push(m[j].replace(/[)\].,]+$/g,""));
    }
    // uniq
    var seen = {}; var out = [];
    for (var k=0;k<urls.length;k++){ if(!seen[urls[k]]){ seen[urls[k]]=1; out.push(urls[k]); } }
    return out;
  }

  function isImageUrl(u){
    u = (u||"").toLowerCase();
    return u.indexOf(".jpg")>-1||u.indexOf(".jpeg")>-1||u.indexOf(".png")>-1||u.indexOf(".webp")>-1||u.indexOf(".gif")>-1||
      u.indexOf("googleusercontent.com")>-1||u.indexOf("lh3.googleusercontent.com")>-1||u.indexOf("storage.googleapis.com")>-1;
  }

  function downloadImage(url){
    fetch(url).then(function(r){
      if(!r.ok) throw new Error();
      return r.blob();
    }).then(function(blob){
      var a = document.createElement("a");
      var obj = URL.createObjectURL(blob);
      a.href = obj;
      a.download = "photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(obj);
    }).catch(function(){
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  function renderPhotos(jobPhotosUrl){
    if (!photosWrap || !photosRow) return;
    photosRow.innerHTML = "";
    var urls = parseUrls(jobPhotosUrl).filter(isImageUrl);
    if (!urls.length){ photosWrap.style.display = "none"; return; }

    photosWrap.style.display = "grid";
    if (photoCount) photoCount.textContent = urls.length + " photo" + (urls.length===1?"":"s");

    for (var i=0;i<urls.length;i++){
      (function(url){
        var tile = document.createElement("div");
        tile.className = "tile";

        var img = document.createElement("img");
        img.src = url;
        img.loading = "lazy";
        img.alt = "Job photo";
        tile.appendChild(img);

        var btn = document.createElement("button");
        btn.className = "save";
        btn.type = "button";
        btn.innerHTML = "↓";
        btn.addEventListener("click", function(e){
          e.preventDefault(); e.stopPropagation();
          downloadImage(url);
        });
        tile.appendChild(btn);

        tile.addEventListener("click", function(){
          window.open(url, "_blank", "noopener,noreferrer");
        });

        photosRow.appendChild(tile);
      })(urls[i]);
    }
  }

  function copyReview(){
    var text = safeString(reviewText && reviewText.value);
    if(!text) return;
    try {
      if(navigator.clipboard && window.isSecureContext){
        navigator.clipboard.writeText(text);
      } else {
        reviewText.removeAttribute("readonly");
        reviewText.focus(); reviewText.select();
        document.execCommand("copy");
        reviewText.setAttribute("readonly","");
      }
      copyIcon.textContent = "✓";
      copyText.textContent = "Copied";
      setTimeout(function(){
        copyIcon.textContent = "⧉";
        copyText.textContent = "Copy me";
      }, 1500);
    } catch(e){}
  }

  if (copyBtn) copyBtn.addEventListener("click", copyReview);

  // Load
  (function init(){
    var token = getTokenFromPath();
    if (!token){
      setLoading(false, "Missing token.");
      return;
    }

    setLoading(true, "Generating your review…");
    fetch("/.netlify/functions/generate", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ token: token })
    })
    .then(function(res){
      if(!res.ok) return res.text().then(function(t){ throw new Error(t || "Server error"); });
      return res.json();
    })
    .then(function(data){
      renderPhotos(data.jobPhotosUrl || "");
      reviewText.value = data.review || "";
      panel.style.display = "block";
      setLoading(false, "");
    })
    .catch(function(){
      setLoading(false, "Could not generate review. Please contact the business.");
    });
  })();
})();

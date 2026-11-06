(function () {
  var CONFIG = window.SITE_CONFIG || {};
  var ROOT = document.body.dataset.root || "./";
  var PAGE = document.body.dataset.page || "";

  // ---------- Shared layout: nav, footer, checkout (one copy for every page) ----------
  var navEl = document.querySelector("[data-nav]");
  if (navEl) {
    var links = [["videos", "Videos"], ["kits", "Paint Kits"], ["game", "Game"], ["about", "About us"]];
    navEl.className = "nav";
    navEl.innerHTML = '<a class="logo" href="' + ROOT + '">Ethan<b>\'s</b> Sketchbook</a><ul>' +
      links.map(function (l) {
        return '<li><a href="' + ROOT + l[0] + '/"' + (PAGE === l[0] ? ' aria-current="page"' : "") + ">" + l[1] + "</a></li>";
      }).join("") +
      '<li><a class="sub" href="' + CONFIG.channelUrl + '?sub_confirmation=1" target="_blank" rel="noopener">Subscribe ▶</a></li></ul>';
  }
  var footEl = document.querySelector("[data-foot]");
  if (footEl) {
    footEl.className = "foot";
    footEl.innerHTML = 'Made with crayons &amp; code by Ethan + Dad · <a href="' + CONFIG.channelUrl + '" target="_blank" rel="noopener">YouTube @eethangaoo</a>';
  }
  // ---------- Traffic: one anonymous id per browser, saved in Supabase (schema site) ----------
  // Visit any page with ?notrack to stop counting this browser (e.g. Dad's own visits), ?track to undo.
  function rpc(name, body) {
    var s = CONFIG.supabase;
    if (!s || !s.url || !s.anonKey) return Promise.resolve(null);
    return fetch(s.url.replace(/\/$/, "") + "/rest/v1/rpc/" + name, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", apikey: s.anonKey, Authorization: "Bearer " + s.anonKey },
      body: JSON.stringify(body)
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.status === 204 ? null : r.json(); });
  }
  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, function (c) {
      return (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16);
    });
  }
  function stored(store, key) {
    try { var v = store.getItem(key); if (!v) { v = uuid(); store.setItem(key, v); } return v; } catch (e) { return uuid(); }
  }
  var VISITOR = stored(localStorage, "ethan-visitor"), SESSION = stored(sessionStorage, "ethan-session");
  var NOTRACK = false;
  try {
    if (/[?&]notrack\b/.test(location.search)) localStorage.setItem("ethan-notrack", "1");
    if (/[?&]track\b/.test(location.search)) localStorage.removeItem("ethan-notrack");
    NOTRACK = localStorage.getItem("ethan-notrack") === "1";
  } catch (e) {}
  function track(event, kit) {
    if (NOTRACK) return;
    rpc("site_track", {
      p_visitor: VISITOR, p_session: SESSION, p_event: event, p_path: location.pathname,
      p_referrer: event === "pageview" && document.referrer.indexOf(location.origin) !== 0 ? document.referrer : null,
      p_kit: kit || null
    }).catch(function () {});
  }
  track("pageview");

  if (document.querySelector("[data-buy]")) {
    document.body.insertAdjacentHTML("beforeend",
      '<div class="co-back" id="co"><form class="co" role="dialog" aria-modal="true" aria-labelledby="coTitle" novalidate>' +
      '<h3 id="coTitle"></h3><div class="bar"><i></i><i></i><i></i><i></i></div>' +
      '<div data-step="1"><label>Paper size</label>' +
      '<label class="opt"><input type="radio" name="paper" value="US Letter" checked> US Letter</label>' +
      '<label class="opt"><input type="radio" name="paper" value="A4"> A4</label></div>' +
      '<div data-step="2" hidden><label for="coName">Your name</label><input type="text" id="coName" autocomplete="given-name" placeholder="e.g. Sarah">' +
      '<label for="coEmail">Email (we send the kit here)</label><input type="email" id="coEmail" autocomplete="email" placeholder="you@example.com"><p class="fine">We only use your email to send the kit. No spam.</p></div>' +
      '<div data-step="3" hidden><div class="line"><span id="rvKit"></span><span id="rvPrice"></span></div>' +
      '<div class="line"><span>Delivery</span><span>Email (PDF)</span></div>' +
      '<div class="line total"><span>Total</span><span id="rvTotal"></span></div><p class="fine" id="rvTo"></p></div>' +
      '<div data-step="4" hidden><div class="thanks"><div class="big">🎉</div><h3>Thank you for supporting Ethan<span id="tyName"></span>!</h3>' +
      '<p>Surprise: <strong>this kit is free</strong>. You won\'t be charged anything.</p>' +
      '<p>We\'ll email it to <strong id="tyEmail"></strong> within 24 hours.</p><p class="fine">— Ethan &amp; Dad</p></div></div>' +
      '<div class="err" id="coErr" role="alert"></div>' +
      '<div class="act"><button type="button" id="coBack">Cancel</button><button type="button" class="go" id="coNext">Continue</button></div>' +
      "</form></div>");
  }

  // ---------- Kit line art (placeholder until real AI pages are added) ----------
  var ART = {
    shark: '<svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Shark Man holding a burger, line art">' +
      '<path class="ln c-blue" d="M108 58 L122 18 L140 60 Z"/>' +
      '<path class="ln c-blue" d="M44 96 L10 62 L22 100 L8 138 Z"/>' +
      '<ellipse class="ln c-blue" cx="118" cy="100" rx="82" ry="50"/>' +
      '<path class="ln c-belly" d="M60 112 Q120 150 186 112 Q160 136 120 138 Q84 138 60 112 Z"/>' +
      '<path class="ln c-blue" d="M96 120 Q90 150 72 156 Q98 154 112 132 Z"/>' +
      '<circle class="ln" cx="166" cy="82" r="10"/><circle class="pupil" cx="169" cy="83" r="4.5"/>' +
      '<path class="ln nofill" d="M176 110 L184 118 L190 110 L196 118"/>' +
      '<path class="ln c-blue" d="M140 122 Q160 134 176 128 L180 140 Q158 146 136 134 Z"/>' +
      '<path class="ln c-bun" d="M176 126 Q200 98 228 126 Z"/>' +
      '<path class="ln c-green" d="M174 126 L230 126 L226 132 L220 128 L214 133 L208 128 L202 133 L196 128 L190 133 L184 128 L178 133 Z"/>' +
      '<rect class="ln c-cheese" x="178" y="132" width="48" height="5"/>' +
      '<rect class="ln c-patty" x="176" y="137" width="52" height="9" rx="3"/>' +
      '<rect class="ln c-bun" x="176" y="146" width="52" height="10" rx="4"/>' +
      '<circle class="ln nofill" cx="34" cy="32" r="5"/><circle class="ln nofill" cx="52" cy="18" r="3"/><circle class="ln nofill" cx="210" cy="40" r="4"/>' +
      '</svg>'
  };
  document.querySelectorAll(".kit[data-art]").forEach(function (el) { el.innerHTML = ART[el.dataset.art] || ""; });

  // ---------- Videos (data/videos.json is refreshed from YouTube by the deploy workflow) ----------
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function cleanTitle(t) { return t.replace(/#\w+/g, "").replace(/\s{2,}/g, " ").trim(); }

  var walls = document.querySelectorAll("[data-videos]");
  if (walls.length) {
    fetch(ROOT + "data/videos.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (videos) {
        walls.forEach(function (wall) {
          var list = videos.slice(0, +wall.dataset.limit || videos.length);
          wall.innerHTML = list.map(function (v) {
            var url = v.kind === "short" ? "https://www.youtube.com/shorts/" + v.id : "https://www.youtube.com/watch?v=" + v.id;
            return '<a class="polaroid" href="' + url + '" target="_blank" rel="noopener"><div class="tape"></div>' +
              '<div class="thumb"><img loading="lazy" src="https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg" alt=""></div>' +
              '<div class="cap">' + esc(cleanTitle(v.title)) + "</div></a>";
          }).join("");
        });
      })
      .catch(function () {
        walls.forEach(function (wall) {
          wall.outerHTML = '<p>Watch all of Ethan\'s videos on <a href="' + CONFIG.channelUrl + '" target="_blank" rel="noopener">YouTube</a>.</p>';
        });
      });
  }

  // ---------- "Watch Ethan paint it" embed: fills in once a video ID is set on the page ----------
  document.querySelectorAll("[data-video-id]").forEach(function (slot) {
    var id = slot.dataset.videoId.trim();
    if (!/^[\w-]{11}$/.test(id)) return;
    slot.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '" title="Ethan painting this kit" ' +
      'allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
    slot.style.borderStyle = "solid";
    slot.style.padding = "0";
  });

  // ---------- Simulated checkout: feels like a real order, free at the end ----------
  var back = document.getElementById("co");
  if (!back) return;
  var box = back.querySelector(".co");
  var nextBtn = document.getElementById("coNext"), backBtn = document.getElementById("coBack");
  var errEl = document.getElementById("coErr");
  var order = {}, step = 1;

  function show(n) {
    step = n;
    box.querySelectorAll("[data-step]").forEach(function (s) { s.hidden = +s.dataset.step !== n; });
    box.querySelectorAll(".bar i").forEach(function (b, i) { b.classList.toggle("on", i < n); });
    nextBtn.textContent = n === 3 ? "Complete order" : n === 4 ? "Done" : "Continue";
    backBtn.textContent = n === 1 ? "Cancel" : "Back";
    backBtn.style.display = n === 4 ? "none" : "";
    errEl.textContent = "";
    var first = box.querySelector('[data-step="' + n + '"] input');
    if (first) first.focus();
  }
  function open(btn) {
    order = { kit: btn.dataset.kit, price: +btn.dataset.price };
    track("kit_buy_click", order.kit);
    document.getElementById("coTitle").textContent = order.kit;
    back.classList.add("on");
    show(1);
  }
  function close() { back.classList.remove("on"); }

  document.querySelectorAll("[data-buy]").forEach(function (b) { b.addEventListener("click", function () { open(b); }); });
  backBtn.addEventListener("click", function () { step === 1 ? close() : show(step - 1); });
  back.addEventListener("click", function (e) { if (e.target === back) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && back.classList.contains("on")) close(); });
  box.addEventListener("submit", function (e) { e.preventDefault(); nextBtn.click(); });

  // Saves name + email to site.orders (Supabase). Not configured = nothing is saved.
  function submitOrder() {
    return rpc("site_place_order", {
      p_visitor: VISITOR, p_session: SESSION, p_path: location.pathname, p_kit: order.kit,
      p_paper: order.paper, p_name: order.name, p_email: order.email, p_price: order.price
    });
  }

  nextBtn.addEventListener("click", function () {
    if (step === 1) {
      order.paper = box.querySelector("input[name=paper]:checked").value;
    } else if (step === 2) {
      order.name = document.getElementById("coName").value.trim();
      order.email = document.getElementById("coEmail").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email)) { errEl.textContent = "Please enter a valid email so we can send your kit."; return; }
      var price = "$" + order.price.toFixed(2);
      document.getElementById("rvKit").textContent = order.kit + " (" + order.paper + ")";
      document.getElementById("rvPrice").textContent = price;
      document.getElementById("rvTotal").textContent = price;
      document.getElementById("rvTo").textContent = "Your kit will be sent to " + order.email;
      track("checkout_details", order.kit);
    } else if (step === 3) {
      nextBtn.disabled = true;
      nextBtn.textContent = "Placing order…";
      submitOrder()
        .then(function () {
          document.getElementById("tyName").textContent = order.name ? ", " + order.name : "";
          document.getElementById("tyEmail").textContent = order.email;
          show(4);
        })
        .catch(function () { errEl.textContent = "Sorry, we couldn't place your order. Please try again in a minute."; nextBtn.textContent = "Complete order"; })
        .then(function () { nextBtn.disabled = false; });
      return;
    } else if (step === 4) {
      return close();
    }
    show(step + 1);
  });
})();

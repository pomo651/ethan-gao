// Shark Man's Treasure Dive: the blindfold coin puzzle for kids.
// 100 coins, 10 shiny (heads). Split into two chests, flip one chest, shiny counts must match.
(function () {
  var CONFIG = window.SITE_CONFIG || {};
  var TOTAL = 100, HEADS = 10;
  var STORE = "ethan-coin-game-v1";

  // ---------- per-browser stats ----------
  function load() {
    try { var s = JSON.parse(localStorage.getItem(STORE)); if (s && s.player) return s; } catch (e) {}
    return { player: uuid(), tries: 0, wins: 0, firstWinTry: null };
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(stats)); } catch (e) {} }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }
  var stats = load();

  // One pearl per win; show up to 10 and a "+N" after that.
  function paintPearls() {
    var shown = Math.max(5, Math.min(stats.wins, 10)), html = "Pearls: ";
    for (var i = 0; i < shown; i++) html += '<i class="' + (i < stats.wins ? "got" : "") + '"></i>';
    if (stats.wins > 10) html += " <b>+" + (stats.wins - 10) + "</b>";
    html += ' <small>' + stats.tries + (stats.tries === 1 ? " dive" : " dives") + " · 1 pearl per win</small>";
    document.getElementById("pearls").innerHTML = html;
  }

  // Shared stats across all players (Supabase RPC). Optional: without it, only this browser's stats show.
  function reportAttempt(won) {
    var s = CONFIG.supabase;
    if (!s || !s.url || !s.anonKey) return Promise.resolve(null);
    return fetch(s.url.replace(/\/$/, "") + "/rest/v1/rpc/record_coin_attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: s.anonKey, Authorization: "Bearer " + s.anonKey },
      body: JSON.stringify({ p_player: stats.player, p_won: won })
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  // ---------- Shark Man's voice ----------
  var sayEl = document.getElementById("say");
  function say(text) {
    sayEl.textContent = text;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
  var readBtn = document.getElementById("readBtn");
  if ("speechSynthesis" in window) {
    readBtn.addEventListener("click", function () {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(sayEl.textContent);
      u.rate = 0.9; u.pitch = 1.1;
      speechSynthesis.speak(u);
    });
  } else {
    readBtn.hidden = true;
  }

  // ---------- game state ----------
  var coins, phase, flipped;
  var el = {
    coinsA: document.querySelector('[data-coins="A"]'),
    coinsB: document.querySelector('[data-coins="B"]'),
    countA: document.querySelector('[data-count="A"]'),
    countB: document.querySelector('[data-count="B"]'),
    headsA: document.querySelector('[data-heads="A"]'),
    headsB: document.querySelector('[data-heads="B"]'),
    actions: document.getElementById("actions"),
    result: document.getElementById("result"),
    board: document.getElementById("board"),
    dive: document.getElementById("dive"),
    guide: document.getElementById("guide")
  };
  var NAME = { A: "left chest", B: "right chest" };

  function inPile(p) { return coins.filter(function (c) { return c.pile === p; }); }

  function newGame() {
    var heads = {};
    while (Object.keys(heads).length < HEADS) heads[Math.floor(Math.random() * TOTAL)] = true;
    coins = [];
    for (var i = 0; i < TOTAL; i++) coins.push({ id: i, heads: !!heads[i], pile: "B" });
    phase = "split";
    flipped = null;
    el.dive.classList.remove("revealed");
    el.guide.classList.remove("dance");
    el.result.hidden = true;
    el.headsA.textContent = el.headsB.textContent = "";
    say("I found 100 coins! 10 are shiny side up, but it's too dark to see. Move some coins into the left chest. Tap a coin, or use the plus buttons.");
    renderCoins();
    renderActions();
  }

  function coinHtml(c) {
    return '<button type="button" class="dive-coin" data-id="' + c.id + '" aria-label="Coin">' +
      '<span class="dive-face dive-back">?</span>' +
      '<span class="dive-face dive-front ' + (c.heads ? "h" : "t") + '">' + (c.heads ? "★" : "") + "</span></button>";
  }

  function renderCoins() {
    var a = inPile("A"), b = inPile("B");
    el.coinsA.innerHTML = a.length ? a.map(coinHtml).join("") : '<p class="dive-empty">Empty! Tap coins in the right chest to move them here.</p>';
    el.coinsB.innerHTML = b.length ? b.map(coinHtml).join("") : '<p class="dive-empty">Empty! Tap coins in the left chest to move them here.</p>';
    el.countA.textContent = a.length + (a.length === 1 ? " coin" : " coins");
    el.countB.textContent = b.length + (b.length === 1 ? " coin" : " coins");
  }

  function btn(label, cls, fn) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "dive-btn " + (cls || ""); b.textContent = label;
    b.addEventListener("click", fn);
    el.actions.appendChild(b);
    return b;
  }

  function move(n) {
    var from = n > 0 ? inPile("B") : inPile("A");
    for (var i = 0; i < Math.abs(n) && i < from.length; i++) from[from.length - 1 - i].pile = n > 0 ? "A" : "B";
    renderCoins();
    renderActions();
  }

  function setStep(n) {
    document.querySelectorAll(".dive-steps [data-step]").forEach(function (s) { s.classList.toggle("on", +s.dataset.step === n); });
  }

  function renderActions() {
    el.actions.innerHTML = "";
    var a = inPile("A").length;
    if (phase === "split") {
      setStep(1);
      var plus1 = btn("+1 coin", "alt", function () { move(1); });
      var plus5 = btn("+5 coins", "alt", function () { move(5); });
      var minus = btn("−1", "alt", function () { move(-1); });
      plus1.disabled = plus5.disabled = a === TOTAL;
      minus.disabled = a === 0;
      var done = btn("Done! →", "", function () {
        phase = "flip";
        say("Now you get ONE magic flip! Pick a chest, and I'll flip over every coin in it.");
        renderActions();
      });
      if (a === 0 || a === TOTAL) { done.disabled = true; done.title = "Both chests need at least one coin"; }
    } else if (phase === "flip") {
      setStep(2);
      btn("🔄 Flip the left chest", "", function () { doFlip("A"); });
      btn("🔄 Flip the right chest", "", function () { doFlip("B"); });
      btn("← Move coins again", "alt", function () {
        phase = "split";
        say("Okay! Move coins between the chests, then press Done.");
        renderActions();
      });
    } else if (phase === "flipped") {
      setStep(3);
      btn("🔦 Turn on the light!", "", reveal);
    } else if (phase === "done") {
      setStep(0);
      btn("Dive again ↻", "", newGame);
    }
  }

  // Tapping a coin moves it to the other chest (only while sorting).
  el.board.addEventListener("click", function (e) {
    var t = e.target.closest(".dive-coin");
    if (!t || phase !== "split") return;
    var c = coins[+t.dataset.id];
    c.pile = c.pile === "A" ? "B" : "A";
    renderCoins();
    renderActions();
  });

  function doFlip(pile) {
    flipped = pile;
    coins.forEach(function (c) { if (c.pile === pile) c.heads = !c.heads; });
    phase = "flipped";
    say("Flip! Every coin in the " + NAME[pile] + " turned over. It's still dark... ready to turn on the light?");
    // Still dark: the flipped chest's coins spin but faces stay hidden.
    document.querySelectorAll('[data-coins="' + pile + '"] .dive-coin').forEach(function (n, i) {
      n.style.animationDelay = Math.min(i * 8, 600) + "ms";
      n.classList.add("dive-spin");
    });
    el.actions.innerHTML = "";
    // Re-render after the spin so the reveal shows the flipped side.
    setTimeout(function () { renderCoins(); renderActions(); }, 900);
  }

  function reveal() {
    phase = "done";
    var hA = inPile("A").filter(function (c) { return c.heads; }).length;
    var hB = inPile("B").filter(function (c) { return c.heads; }).length;
    var nFlipped = inPile(flipped).length;
    var won = hA === hB;
    el.dive.classList.add("revealed");
    el.headsA.textContent = "★ " + hA + " shiny";
    el.headsB.textContent = "★ " + hB + " shiny";

    stats.tries += 1;
    if (won) { stats.wins += 1; if (stats.firstWinTry === null) stats.firstWinTry = stats.tries; }
    save();
    paintPearls();
    renderActions();

    el.result.hidden = false;
    el.result.className = "dive-result " + (won ? "win" : "lose");
    if (won) {
      // A guaranteed win means the flipped chest had exactly as many coins as there are shiny coins.
      var lucky = nFlipped !== HEADS;
      el.guide.classList.add("dance");
      say(lucky
        ? "You did it! Both chests have " + hA + " shiny coins. That one was lucky. There's a way to win every single time. Can you find it?"
        : "WOW! Both chests have " + hA + " shiny coins. You found the treasure! You earned a pearl!");
      el.result.innerHTML =
        '<div class="dive-big">🏆</div><h2>' + (lucky ? "You won! (lucky one 🍀)" : "Treasure found! You cracked it!") + "</h2>" +
        "<p>Both chests have <strong>" + hA + " shiny coins</strong>. " +
        (stats.wins === 1 ? "You solved it on dive <strong>#" + stats.tries + "</strong>." : "That's pearl <strong>#" + stats.wins + "</strong>!") + "</p>" +
        '<div id="pct"></div>' +
        (lucky ? '<p class="muted">You flipped a chest with ' + nFlipped + " coins, so this was luck. Can you find the way that works every time?</p>"
               : '<details class="dive-why"><summary>Why does this always work?</summary><p>Put exactly 10 coins in one chest. Say 3 of them are shiny. Then the other chest has the other 7 shiny coins. Flip the 10-coin chest: its 3 shiny coins go dull, and its 7 dull coins turn shiny. Now both chests have 7! It works with any number, every time.</p></details>') +
        '<p style="margin-top:16px"><button type="button" class="dive-btn alt" id="share">Challenge a friend 📣</button></p>';
      confetti();
      reportAttempt(true).then(function (g) {
        var p = document.getElementById("pct");
        if (g && typeof g.percentile === "number" && g.players > 1) {
          var pct = Math.round(g.percentile);
          p.innerHTML = '<p class="dive-pct">You beat <strong>' + pct + "%</strong> of players! 🎉</p>" +
            '<div class="dive-meter"><i style="width:' + pct + '%"></i></div>' +
            '<p class="muted" style="font-size:16px">' + g.players + " people have played so far</p>";
        } else if (g) {
          p.innerHTML = '<p class="dive-pct">You\'re one of the first divers! Share it and see who beats you.</p>';
        }
      });
    } else {
      reportAttempt(false);
      say("Oh no, the left chest has " + hA + " shiny coins and the right chest has " + hB + ". They don't match. I think you've got this. Try again!");
      el.result.innerHTML =
        '<div class="dive-big">🙈</div><h2>Not this time!</h2>' +
        "<p>Left chest: <strong>" + hA + "</strong> shiny · Right chest: <strong>" + hB + "</strong> shiny. They need to match.</p>" +
        hint() +
        '<p style="margin-top:16px"><button type="button" class="dive-btn alt" id="share">Challenge a friend 📣</button></p>';
    }
    var share = document.getElementById("share");
    if (share) share.addEventListener("click", shareGame);
    el.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hint() {
    var fails = stats.tries - stats.wins;
    if (stats.wins > 0 || fails < 2) return "";
    if (fails < 4) return '<p class="dad">Hint: there are 10 shiny coins. Could that number tell you how many coins to put in a chest?</p>';
    return '<p class="dad">Bigger hint: put exactly 10 coins in the left chest. Then think about which chest to flip.</p>';
  }

  function shareGame() {
    var url = location.href.split("#")[0];
    var text = "Shark Man's Treasure Dive: 100 coins, 10 shiny, too dark to see, ONE flip. Can you make the chests match?";
    if (navigator.share) { navigator.share({ title: "Shark Man's Treasure Dive", text: text, url: url }).catch(function () {}); return; }
    var b = document.getElementById("share");
    (navigator.clipboard ? navigator.clipboard.writeText(text + " " + url) : Promise.reject())
      .then(function () { b.textContent = "Link copied! ✓"; })
      .catch(function () { b.textContent = url; });
  }

  function confetti() {
    var box = document.getElementById("confetti");
    var colors = ["#f97316", "#facc15", "#10b981", "#ec4899", "#3b82f6"];
    var html = "";
    for (var i = 0; i < 90; i++) {
      html += '<i style="left:' + (Math.random() * 100) + "%;background:" + colors[i % colors.length] +
        ";animation-delay:" + (Math.random() * 0.6).toFixed(2) + "s;animation-duration:" + (2 + Math.random() * 1.5).toFixed(2) +
        "s;transform:rotate(" + Math.floor(Math.random() * 360) + 'deg)"></i>';
    }
    box.innerHTML = html;
    setTimeout(function () { box.innerHTML = ""; }, 4200);
  }

  paintPearls();
  newGame();
})();

// The Blindfold Coin Puzzle. 100 coins, 10 heads; split into two piles, flip one pile, heads must match.
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
  function paintStats() {
    document.getElementById("stTries").textContent = stats.tries;
    document.getElementById("stWins").textContent = stats.wins;
    document.getElementById("stRate").textContent = stats.tries ? Math.round(100 * stats.wins / stats.tries) + "%" : "–";
  }

  // Shared stats across all players (Supabase RPC). Optional: without it, only this browser's stats show.
  function reportAttempt(won) {
    var s = CONFIG.gameStats;
    if (!s || !s.url || !s.anonKey) return Promise.resolve(null);
    return fetch(s.url.replace(/\/$/, "") + "/rest/v1/rpc/record_coin_attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: s.anonKey, Authorization: "Bearer " + s.anonKey },
      body: JSON.stringify({ p_player: stats.player, p_won: won })
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
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
    step: document.getElementById("stepText"),
    actions: document.getElementById("actions"),
    result: document.getElementById("result"),
    board: document.getElementById("board")
  };

  function newGame() {
    var heads = {};
    while (Object.keys(heads).length < HEADS) heads[Math.floor(Math.random() * TOTAL)] = true;
    coins = [];
    for (var i = 0; i < TOTAL; i++) coins.push({ id: i, heads: !!heads[i], pile: "B" });
    phase = "split";
    flipped = null;
    el.board.classList.remove("revealed");
    el.result.hidden = true;
    el.headsA.textContent = el.headsB.textContent = "";
    renderCoins();
    renderActions();
  }

  function coinHtml(c) {
    return '<button type="button" class="g-coin" data-id="' + c.id + '" aria-label="Coin">' +
      '<span class="g-face g-back">?</span>' +
      '<span class="g-face g-front ' + (c.heads ? "h" : "t") + '">' + (c.heads ? "H" : "T") + "</span></button>";
  }

  function renderCoins() {
    var a = coins.filter(function (c) { return c.pile === "A"; });
    var b = coins.filter(function (c) { return c.pile === "B"; });
    el.coinsA.innerHTML = a.length ? a.map(coinHtml).join("") : '<p class="g-empty">Tap coins in Pile B to move them here</p>';
    el.coinsB.innerHTML = b.length ? b.map(coinHtml).join("") : '<p class="g-empty">Tap coins in Pile A to move them here</p>';
    el.countA.textContent = a.length + (a.length === 1 ? " coin" : " coins");
    el.countB.textContent = b.length + (b.length === 1 ? " coin" : " coins");
  }

  function btn(label, cls, fn) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn " + (cls || ""); b.textContent = label;
    b.addEventListener("click", fn);
    el.actions.appendChild(b);
    return b;
  }

  function renderActions() {
    el.actions.innerHTML = "";
    var a = coins.filter(function (c) { return c.pile === "A"; }).length;
    if (phase === "split") {
      el.step.textContent = "Step 1 of 3 · Tap coins to move them between piles (you can feel how many you're holding)";
      var done = btn("Done splitting →", "", function () { phase = "flip"; renderActions(); });
      if (a === 0 || a === TOTAL) { done.disabled = true; done.title = "Both piles need at least one coin"; }
      if (a > 0) btn("Put all back", "alt", function () { coins.forEach(function (c) { c.pile = "B"; }); renderCoins(); renderActions(); });
    } else if (phase === "flip") {
      el.step.textContent = "Step 2 of 3 · Your one move: flip every coin in one pile";
      btn("Flip Pile A", "", function () { doFlip("A"); });
      btn("Flip Pile B", "", function () { doFlip("B"); });
      btn("← Change piles", "alt", function () { phase = "split"; renderActions(); });
    } else if (phase === "flipped") {
      el.step.textContent = "Step 3 of 3 · Pile " + flipped + " is flipped. Ready to look?";
      btn("Take off the blindfold 👀", "", reveal);
    } else if (phase === "done") {
      el.step.textContent = "Blindfold off!";
      btn("Play again ↻", "", newGame);
    }
  }

  // Moving coins between piles (only while splitting).
  el.board.addEventListener("click", function (e) {
    var t = e.target.closest(".g-coin");
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
    // Still blindfolded: the flipped pile wobbles but faces stay hidden.
    document.querySelectorAll('[data-coins="' + pile + '"] .g-coin').forEach(function (n, i) {
      n.style.animationDelay = Math.min(i * 8, 600) + "ms";
      n.classList.add("g-wobble");
    });
    // Re-render faces after the wobble so the reveal shows the post-flip side.
    el.actions.innerHTML = "";
    setTimeout(function () { renderCoins(); renderActions(); }, 900);
  }

  function reveal() {
    phase = "done";
    var hA = coins.filter(function (c) { return c.pile === "A" && c.heads; }).length;
    var hB = coins.filter(function (c) { return c.pile === "B" && c.heads; }).length;
    var nFlipped = coins.filter(function (c) { return c.pile === flipped; }).length;
    var won = hA === hB;
    el.board.classList.add("revealed");
    el.headsA.textContent = "· " + hA + " heads";
    el.headsB.textContent = "· " + hB + " heads";

    stats.tries += 1;
    if (won) { stats.wins += 1; if (stats.firstWinTry === null) stats.firstWinTry = stats.tries; }
    save();
    paintStats();
    renderActions();

    el.result.hidden = false;
    el.result.className = "g-result card " + (won ? "win" : "lose");
    if (won) {
      // A guaranteed win means the flipped pile had exactly as many coins as there are heads.
      var lucky = nFlipped !== HEADS;
      el.result.innerHTML =
        '<div class="g-big">🏆</div><h2>' + (lucky ? "You won! (lucky one 🍀)" : "Good job! You cracked it!") + "</h2>" +
        "<p>Both piles have <strong>" + hA + " heads</strong>. " +
        (stats.wins === 1 ? "You solved it on try <strong>#" + stats.tries + "</strong>." : "That's win <strong>#" + stats.wins + "</strong> in " + stats.tries + " tries.") + "</p>" +
        '<p class="g-pct" id="pct"></p>' +
        (lucky ? '<p class="muted">You flipped a pile of ' + nFlipped + " coins, so this was luck. There's a way to win <em>every</em> time. Can you find it?</p>"
               : '<details class="g-why"><summary>Why does this always work?</summary><p>Make one pile exactly 10 coins. If k of them are heads, the other pile has the remaining 10 − k heads. Flip the 10-coin pile: its k heads become tails and its 10 − k tails become heads. Now both piles have 10 − k heads. Every time.</p></details>') +
        '<p style="margin-top:14px"><button type="button" class="btn alt" id="share">Challenge a friend 📣</button></p>';
      confetti();
      reportAttempt(true).then(function (g) {
        var p = document.getElementById("pct");
        if (g && typeof g.percentile === "number" && g.players > 1) {
          p.innerHTML = "You beat <strong>" + Math.round(g.percentile) + "%</strong> of players! 🎉" +
            '<br><small class="muted">' + g.players + " people have played so far</small>";
        } else if (g) {
          p.textContent = "You're one of the first players. Share it and see who beats you!";
        }
      });
    } else {
      reportAttempt(false);
      el.result.innerHTML =
        '<div class="g-big">🙈</div><h2>So close! Not this time.</h2>' +
        "<p>Pile A has <strong>" + hA + "</strong> heads and Pile B has <strong>" + hB + "</strong>. They need to match.</p>" +
        hint() +
        '<p style="margin-top:14px"><button type="button" class="btn alt" id="share">Challenge a friend 📣</button></p>';
    }
    var share = document.getElementById("share");
    if (share) share.addEventListener("click", shareGame);
    el.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hint() {
    var fails = stats.tries - stats.wins;
    if (stats.wins > 0 || fails < 2) return "";
    if (fails < 4) return '<p class="dad">Hint: how many heads are there in total? Does that number help you pick a pile size?</p>';
    return '<p class="dad">Bigger hint: try making Pile A exactly 10 coins. Then think about which pile to flip.</p>';
  }

  function shareGame() {
    var url = location.href.split("#")[0];
    var text = "100 coins, 10 heads up, you're blindfolded. One flip to make the heads match. Can you solve it?";
    if (navigator.share) { navigator.share({ title: "Blindfold Coin Puzzle", text: text, url: url }).catch(function () {}); return; }
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

  paintStats();
  newGame();
})();

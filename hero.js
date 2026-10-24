(function () {
  "use strict";

  // --- Notify form: submits to Formspree via fetch, falls back to a normal POST without JS. ---
  var notifyForm = document.getElementById("notify-form");
  if (notifyForm) {
    notifyForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = document.getElementById("notify-status");
      var button = notifyForm.querySelector("button[type=submit]");
      if (button) button.disabled = true;

      fetch(notifyForm.action, {
        method: "POST",
        body: new FormData(notifyForm),
        headers: { Accept: "application/json" },
      })
        .then(function (res) {
          if (res.ok) {
            if (status) status.textContent = "Thanks. We'll let you know when the hosted version is ready.";
            notifyForm.reset();
          } else {
            if (status) status.textContent = "Something went wrong. Please try again.";
          }
        })
        .catch(function () {
          if (status) status.textContent = "Something went wrong. Please try again.";
        })
        .finally(function () {
          if (button) button.disabled = false;
        });
    });
  }

  // --- Hero subtraction animation. Only runs when motion is allowed. ---
  if (!document.documentElement.classList.contains("motion-ok")) return;

  var fullSentenceEl = document.querySelector(".hero-full-sentence");
  var headline = document.querySelector(".hero-headline");
  var subGroup = document.querySelector("[data-hero-reveal]");
  var replayBtn = document.getElementById("replay-btn");
  if (!fullSentenceEl || !headline || !subGroup) return;

  var fullSentence = fullSentenceEl.textContent.trim();
  var words = fullSentence.split(" ");

  // Indices of "first" and "ask" in the fixed sentence above. Every other
  // word fades out (opacity only, so nothing reflows) in random order and
  // timing. The two survivors then slide from wherever they landed in the
  // sentence into the final "Ask first." arrangement.
  var KEEP_INDICES = [9, 10];
  var BEAT_MS = 2400;
  var FADE_WINDOW_MS = 2400;
  var FADE_DURATION_MS = 550;
  var PRE_SLIDE_PAUSE_MS = 300;
  var SLIDE_DURATION_MS = 650;

  function buildSpans() {
    headline.setAttribute("aria-label", fullSentence);
    headline.innerHTML = "";
    var wrap = document.createElement("span");
    wrap.className = "hero-word-wrap";
    wrap.setAttribute("aria-hidden", "true");
    words.forEach(function (w, i) {
      var span = document.createElement("span");
      span.className = "hero-word";
      span.textContent = w + (i < words.length - 1 ? " " : "");
      wrap.appendChild(span);
    });
    headline.appendChild(wrap);
    return wrap;
  }

  function applyFlip(span, oldRect, newRect) {
    var dx = oldRect.left - newRect.left;
    var dy = oldRect.top - newRect.top;
    span.style.transition = "none";
    span.style.display = "inline-block";
    span.style.transform = "translate(" + dx + "px, " + dy + "px)";
  }

  function runSequence() {
    var wrap = buildSpans();
    var spans = wrap.querySelectorAll(".hero-word");

    var fadeIndices = [];
    for (var i = 0; i < spans.length; i++) {
      if (KEEP_INDICES.indexOf(i) === -1) fadeIndices.push(i);
    }

    function slideToFinal() {
      var askOld = spans[10].getBoundingClientRect();
      var firstOld = spans[9].getBoundingClientRect();

      headline.innerHTML = "";
      var finalWrap = document.createElement("span");
      finalWrap.className = "hero-word-wrap";
      finalWrap.setAttribute("aria-hidden", "true");
      var askSpan = document.createElement("span");
      askSpan.className = "hero-word";
      askSpan.textContent = "Ask";
      var firstSpan = document.createElement("span");
      firstSpan.className = "hero-word";
      firstSpan.textContent = "first.";
      finalWrap.appendChild(askSpan);
      finalWrap.appendChild(document.createTextNode(" "));
      finalWrap.appendChild(firstSpan);
      headline.appendChild(finalWrap);

      var askNew = askSpan.getBoundingClientRect();
      var firstNew = firstSpan.getBoundingClientRect();
      applyFlip(askSpan, askOld, askNew);
      applyFlip(firstSpan, firstOld, firstNew);

      void finalWrap.offsetWidth; // force reflow before transitioning

      requestAnimationFrame(function () {
        askSpan.style.transition = "transform " + SLIDE_DURATION_MS + "ms ease";
        askSpan.style.transform = "translate(0, 0)";
        firstSpan.style.transition = "transform " + SLIDE_DURATION_MS + "ms ease";
        firstSpan.style.transform = "translate(0, 0)";
      });

      setTimeout(function () {
        headline.classList.add("settled");
        subGroup.classList.add("revealed");
        if (replayBtn) replayBtn.hidden = false;
      }, SLIDE_DURATION_MS + 50);
    }

    setTimeout(function () {
      fadeIndices.forEach(function (idx) {
        var delay = Math.random() * FADE_WINDOW_MS;
        setTimeout(function () {
          var span = spans[idx];
          span.style.transition = "opacity " + FADE_DURATION_MS + "ms ease";
          span.style.opacity = "0";
        }, delay);
      });

      setTimeout(slideToFinal, FADE_WINDOW_MS + FADE_DURATION_MS + PRE_SLIDE_PAUSE_MS);
    }, BEAT_MS);
  }

  runSequence();

  if (replayBtn) {
    replayBtn.addEventListener("click", function () {
      replayBtn.hidden = true;
      subGroup.classList.remove("revealed");
      headline.classList.remove("settled");
      runSequence();
    });
  }
})();

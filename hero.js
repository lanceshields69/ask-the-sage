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
  var wordmark = document.querySelector(".wordmark");
  var replayBtn = document.getElementById("replay-btn");
  if (!fullSentenceEl || !headline || !subGroup) return;

  var fullSentence = fullSentenceEl.textContent.trim();
  var words = fullSentence.split(" ");

  // Indices of "first" and "ask" in the fixed sentence above. Every other
  // word fades out (opacity only, so nothing reflows) in random order and
  // timing. The two survivors then slide from wherever they landed in the
  // sentence into the final "Ask first." arrangement.
  var KEEP_INDICES = [9, 10];
  // Index of the last word of the first sentence ("you."); a forced break
  // goes right after it, so the second sentence ("It should...") always
  // starts its own line, matching the same treatment on the subhead.
  var LINE_BREAK_AFTER_INDEX = 6;
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
      if (i === LINE_BREAK_AFTER_INDEX) {
        wrap.appendChild(document.createElement("br"));
      }
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
        if (wordmark) wordmark.classList.add("revealed");
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
      if (wordmark) wordmark.classList.remove("revealed");
      runSequence();
    });
  }
})();

(function () {
  // --- "See it work" chat: streams in once the panel scrolls into view. ---
  if (!document.documentElement.classList.contains("motion-ok")) return;
  if (typeof IntersectionObserver === "undefined") return;

  var panel = document.getElementById("chat-panel");
  var thread = document.getElementById("chat-thread");
  var thinking = document.getElementById("chat-thinking");
  var answerEl = document.getElementById("chat-answer");
  var controls = document.getElementById("chat-controls");
  var showAllBtn = document.getElementById("chat-show-all");
  var replayBtn = document.getElementById("chat-replay");
  if (!panel || !thread || !thinking || !answerEl || !controls || !showAllBtn || !replayBtn) return;

  var turns = thread.querySelectorAll(".chat-turn");
  var personTurn = turns[0];
  var aiTurn = turns[1];
  if (!personTurn || !aiTurn) return;

  // Keep the real, complete markup available to assistive tech at all times;
  // the thread itself becomes a purely visual, animated copy of it.
  var srCopy = document.createElement("div");
  srCopy.className = "sr-only";
  srCopy.innerHTML = thread.innerHTML;
  thread.parentNode.insertBefore(srCopy, thread);
  thread.setAttribute("aria-hidden", "true");

  var fullAnswerHTML = answerEl.innerHTML;

  // Hide the visual copy immediately, before the user ever scrolls to it,
  // so there's no flash of the full answer before the stream clears and
  // replays it.
  personTurn.style.opacity = "0";
  aiTurn.style.opacity = "0";
  thinking.hidden = true;
  answerEl.innerHTML = "";

  // Each segment streams word by word; boldWords bolds that many leading
  // words (matching the brief's script exactly). The passage is a citation,
  // not generated text, so it fades in as one unit instead of streaming.
  var SEGMENTS = [
    { words: "The usual answer".split(" "), boldWords: 3 },
    { words: "A third note is reasonable if it's short and gives them something useful, like a competing deadline or a quick update. Two sentences is plenty.".split(" ") },
    { words: "The sage's view: differs".split(" "), boldWords: 4 },
    { words: "Verdict: wait until next week".split(" ") },
    { passage: true },
    { words: "Delicate things fall apart when handled too much. With a team, a deal, or a relationship, constant checking does more harm than leaving it be.".split(" ") },
    { words: "In the sage's voice: Turn the fish too often and it breaks. Leave it, and it cooks.".split(" "), className: "panel-voice" },
    { words: "Applied to your situation: Two notes already say you're interested. A third this soon reads as pressure. Give it a few more days, then send one short note only if something has changed.".split(" "), boldWords: 4 },
    { words: "Where they differ: the usual answer says send a short note now. The sage says let it rest.".split(" "), boldWords: 3 },
  ];

  var SEGMENT_PAUSE_MS = 1700;
  var WORD_MIN_MS = 25;
  var WORD_MAX_MS = 40;

  var runToken = 0;
  var started = false;

  function buildPassageEl() {
    var wrap = document.createElement("div");
    wrap.className = "panel-passage";
    wrap.style.opacity = "0";
    wrap.innerHTML =
      '<p class="panel-passage-zh zh">治大國，若烹小鮮</p>' +
      '<div class="panel-passage-en">' +
      '<p class="panel-pinyin">zhì dà guó, ruò pēng xiǎo xiān</p>' +
      '<p class="panel-gloss">"Govern a great state as you would cook a small fish." (Chapter 60)</p>' +
      "</div>";
    return wrap;
  }

  function streamSegment(token, segment, onDone) {
    if (token !== runToken) return;

    if (segment.passage) {
      var passageEl = buildPassageEl();
      answerEl.appendChild(passageEl);
      requestAnimationFrame(function () {
        if (token !== runToken) return;
        passageEl.style.transition = "opacity 450ms ease";
        passageEl.style.opacity = "1";
      });
      setTimeout(function () {
        if (token === runToken) onDone();
      }, 500);
      return;
    }

    var p = document.createElement("p");
    if (segment.className) p.className = segment.className;
    answerEl.appendChild(p);

    var words = segment.words;
    var i = 0;
    function next() {
      if (token !== runToken) return;
      if (i >= words.length) {
        onDone();
        return;
      }
      var unit = segment.boldWords && i < segment.boldWords ? document.createElement("strong") : document.createElement("span");
      unit.textContent = words[i] + (i < words.length - 1 ? " " : "");
      p.appendChild(unit);
      i++;
      setTimeout(next, WORD_MIN_MS + Math.random() * (WORD_MAX_MS - WORD_MIN_MS));
    }
    next();
  }

  function streamAll(token, index) {
    if (token !== runToken) return;
    if (index >= SEGMENTS.length) {
      finish();
      return;
    }
    streamSegment(token, SEGMENTS[index], function () {
      setTimeout(function () {
        streamAll(token, index + 1);
      }, SEGMENT_PAUSE_MS);
    });
  }

  function finish() {
    thinking.hidden = true;
    showAllBtn.hidden = true;
    replayBtn.hidden = false;
  }

  function completeInstantly() {
    runToken++;
    personTurn.style.transition = "none";
    personTurn.style.opacity = "1";
    aiTurn.style.transition = "none";
    aiTurn.style.opacity = "1";
    thinking.hidden = true;
    answerEl.innerHTML = fullAnswerHTML;
    controls.hidden = false;
    showAllBtn.hidden = true;
    replayBtn.hidden = false;
  }

  function runSequence() {
    var token = ++runToken;
    answerEl.innerHTML = "";
    thinking.hidden = true;
    controls.hidden = false;
    showAllBtn.hidden = false;
    replayBtn.hidden = true;

    personTurn.style.transition = "none";
    personTurn.style.opacity = "0";
    aiTurn.style.transition = "none";
    aiTurn.style.opacity = "0";
    void thread.offsetWidth; // force reflow before transitioning

    requestAnimationFrame(function () {
      if (token !== runToken) return;
      personTurn.style.transition = "opacity 400ms ease";
      personTurn.style.opacity = "1";
    });

    setTimeout(function () {
      if (token !== runToken) return;
      aiTurn.style.transition = "opacity 300ms ease";
      aiTurn.style.opacity = "1";
      thinking.hidden = false;
      setTimeout(function () {
        if (token !== runToken) return;
        thinking.hidden = true;
        streamAll(token, 0);
      }, 1000);
    }, 500);
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !started) {
          started = true;
          observer.disconnect();
          runSequence();
        }
      });
    },
    { threshold: 0.3 },
  );
  observer.observe(panel);

  showAllBtn.addEventListener("click", completeInstantly);
  replayBtn.addEventListener("click", runSequence);
})();

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const ZOOM_SCALE = 1.75;
  const LOOK_SECONDS = 30;
  const RING_CIRCUMFERENCE = 2 * Math.PI * 36; // r = 36

  // Embedded fallback if opened directly via file:// instead of GitHub Pages / HTTP server
  const FALLBACK_SCENES = [
    {
      id: "sunny_park",
      title: "Park on a Sunny Holiday",
      image: "images/park.webp",
      questions: [
        { type: "Observe", text: "1. What games and activities are the children playing in the park?" },
        { type: "Detail", text: "2. Spot three things in the sky or trees. Describe where each one is." },
        { type: "Safety", text: "3. Who is taking care of the younger children, and what are they doing?" },
        { type: "Write", text: "4. Write 3 sentences about what you would do first if you visited this park." }
      ]
    },
    {
      id: "railway_station",
      title: "A Busy Railway Station",
      image: "images/station.webp",
      questions: [
        { type: "Observe", text: "1. What are the passengers carrying, and how are they moving their luggage?" },
        { type: "Detail", text: "2. Find the station clock and platform sign. What details can you read?" },
        { type: "People", text: "3. Describe two different workers you see on the platform and their jobs." },
        { type: "Imagine", text: "4. Pick one family on the platform. Where are they going? Write 3 sentences." }
      ]
    },
    {
      id: "engaged_classroom",
      title: "An Engaged Classroom",
      image: "images/classroom.webp",
      questions: [
        { type: "Observe", text: "1. What subject do you think the teacher is teaching? Give two clues from the picture." },
        { type: "Detail", text: "2. Name five items you can see on the walls, shelves, or students' desks." },
        { type: "Feelings", text: "3. How do the students look? How can you tell they are paying attention?" },
        { type: "Write", text: "4. Write 3 sentences comparing this classroom to your own classroom." }
      ]
    },
    {
      id: "busy_market",
      title: "Busy Market Place",
      image: "images/market.webp",
      questions: [
        { type: "Observe", text: "1. Name four fruits or vegetables being sold at the stalls." },
        { type: "Colors", text: "2. Which stall looks the most colorful? Describe the items on display." },
        { type: "Action", text: "3. What are the shopkeepers and customers doing? Describe one conversation." },
        { type: "Write", text: "4. Imagine you have ₹100 to spend at this market. What will you buy and why?" }
      ]
    },
    {
      id: "swimming_pool",
      title: "At the Swimming Pool",
      image: "images/pool.webp",
      questions: [
        { type: "Observe", text: "1. What safety gear are the swimmers wearing in the water?" },
        { type: "Count", text: "2. Count how many people are inside the pool and how many are outside." },
        { type: "Rules", text: "3. Why is walking instead of running important around a swimming pool?" },
        { type: "Write", text: "4. Write 3 sentences describing how the water feels and what sounds you would hear." }
      ]
    }
  ];

  // State
  let scenes = [];
  let currentSceneIndex = -1;
  let currentQuestionIndex = -1; // -1 = Look-First mode

  // Zoom & Pan state
  let isZoomed = false;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let lastTapTime = 0;

  // Countdown timer state
  let timerId = null;
  let secondsLeft = LOOK_SECONDS;
  let timerPaused = false;

  // DOM Elements
  const nextSceneBtn = document.getElementById("next-scene-btn");
  const zoomStatus = document.getElementById("zoom-status");
  const imageContainer = document.getElementById("image-container");
  const mainImage = document.getElementById("main-image");
  const resetPanBtn = document.getElementById("reset-pan-btn");

  const lookFirstCard = document.getElementById("look-first-card");
  const ringProgress = document.getElementById("ring-progress");
  const countdownSeconds = document.getElementById("countdown-seconds");
  const startBtn = document.getElementById("start-btn");
  const timerToggleBtn = document.getElementById("timer-toggle-btn");

  const questionCardSlot = document.getElementById("question-card-slot");
  const navArea = document.getElementById("nav-area");
  const counterSpan = document.getElementById("counter");
  const progressDots = document.getElementById("progress-dots");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  // 1. Load scenes via relative ./scenes.json
  fetch("./scenes.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      scenes = Array.isArray(data) && data.length ? data : FALLBACK_SCENES;
      initApp();
    })
    .catch(() => {
      scenes = FALLBACK_SCENES;
      initApp();
    });

  function initApp() {
    bindEvents();
    loadRandomScene();
  }

  function pickRandomSceneIndex() {
    if (scenes.length <= 1) return 0;
    let nextIndex = currentSceneIndex;
    while (nextIndex === currentSceneIndex) {
      nextIndex = Math.floor(Math.random() * scenes.length);
    }
    return nextIndex;
  }

  function loadRandomScene() {
    const index = pickRandomSceneIndex();
    loadScene(index);
  }

  function loadScene(index) {
    currentSceneIndex = index;
    currentQuestionIndex = -1;
    const scene = scenes[index];

    mainImage.src = scene.image;
    mainImage.alt = "Picture comprehension scene";

    resetZoom();
    showLookFirstMode();
  }

  // 2. Look-First Mode & 30s Countdown Ring
  function showLookFirstMode() {
    currentQuestionIndex = -1;
    lookFirstCard.hidden = false;
    questionCardSlot.hidden = true;
    navArea.hidden = true;
    startCountdown();
  }

  function startCountdown() {
    stopCountdown();
    secondsLeft = LOOK_SECONDS;
    timerPaused = false;
    timerToggleBtn.textContent = "Pause Timer";
    updateCountdownUI();

    timerId = window.setInterval(() => {
      if (timerPaused) return;
      secondsLeft = Math.max(0, secondsLeft - 1);
      updateCountdownUI();
      if (secondsLeft === 0) {
        stopCountdown();
      }
    }, 1000);
  }

  function stopCountdown() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function updateCountdownUI() {
    countdownSeconds.textContent = secondsLeft > 0 ? `${secondsLeft}s` : "Ready!";
    const elapsedFraction = (LOOK_SECONDS - secondsLeft) / LOOK_SECONDS;
    ringProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * elapsedFraction);
  }

  // 3. One-at-a-Time Question Card
  function startQuestions() {
    stopCountdown();
    currentQuestionIndex = 0;
    renderCurrentQuestion();
  }

  function renderCurrentQuestion() {
    const scene = scenes[currentSceneIndex];
    const q = scene.questions[currentQuestionIndex];
    if (!q) return;

    lookFirstCard.hidden = true;
    questionCardSlot.hidden = false;
    navArea.hidden = false;

    const card = document.createElement("article");
    card.className = "question-card";
    card.dataset.type = q.type;

    const badge = document.createElement("span");
    badge.className = "type-badge";
    badge.textContent = q.type;

    const text = document.createElement("p");
    text.className = "question-text";
    text.textContent = q.text;

    card.append(badge, text);
    questionCardSlot.innerHTML = "";
    questionCardSlot.appendChild(card);

    updateNavigation(scene.questions.length);
  }

  function updateNavigation(total) {
    counterSpan.textContent = `Question ${currentQuestionIndex + 1} of ${total}`;
    prevBtn.disabled = currentQuestionIndex <= 0;
    nextBtn.disabled = currentQuestionIndex >= total - 1;

    progressDots.innerHTML = "";
    for (let i = 0; i < total; i += 1) {
      const dot = document.createElement("span");
      dot.className = "progress-dot";
      if (i < currentQuestionIndex) dot.classList.add("done");
      if (i === currentQuestionIndex) dot.classList.add("current");
      progressDots.appendChild(dot);
    }
  }

  function showNextQuestion() {
    if (currentQuestionIndex === -1) {
      startQuestions();
      return;
    }
    const total = scenes[currentSceneIndex].questions.length;
    if (currentQuestionIndex < total - 1) {
      currentQuestionIndex += 1;
      renderCurrentQuestion();
    }
  }

  function showPrevQuestion() {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex -= 1;
      renderCurrentQuestion();
    }
  }

  // 4. Interactive 1.75x Zoom & Drag/Pan (iPad Safari Pointer Events)
  function applyImageTransform() {
    if (!isZoomed) {
      mainImage.style.transform = "translate3d(0, 0, 0) scale(1)";
      return;
    }
    clampPan();
    mainImage.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${ZOOM_SCALE})`;
  }

  function clampPan() {
    const containerRect = imageContainer.getBoundingClientRect();
    const imgWidth = mainImage.offsetWidth * ZOOM_SCALE;
    const imgHeight = mainImage.offsetHeight * ZOOM_SCALE;

    const maxX = Math.max(0, (imgWidth - containerRect.width) / 2);
    const maxY = Math.max(0, (imgHeight - containerRect.height) / 2);

    panX = Math.min(maxX, Math.max(-maxX, panX));
    panY = Math.min(maxY, Math.max(-maxY, panY));
  }

  function toggleZoom() {
    isZoomed = !isZoomed;
    if (!isZoomed) {
      resetZoom();
      return;
    }
    panX = 0;
    panY = 0;
    imageContainer.classList.add("zoomed");
    resetPanBtn.hidden = false;
    zoomStatus.textContent = "Drag picture to look around (1.75×)";
    applyImageTransform();
  }

  function resetZoom() {
    isZoomed = false;
    isDragging = false;
    panX = 0;
    panY = 0;
    imageContainer.classList.remove("zoomed", "dragging");
    resetPanBtn.hidden = true;
    zoomStatus.textContent = "Tap to Zoom";
    applyImageTransform();
  }

  // 5. Event Wiring
  function bindEvents() {
    nextSceneBtn.addEventListener("click", loadRandomScene);

    startBtn.addEventListener("click", startQuestions);

    timerToggleBtn.addEventListener("click", () => {
      timerPaused = !timerPaused;
      timerToggleBtn.textContent = timerPaused ? "Resume Timer" : "Pause Timer";
    });

    prevBtn.addEventListener("click", showPrevQuestion);
    nextBtn.addEventListener("click", showNextQuestion);

    resetPanBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      resetZoom();
    });

    // Pointer drag-to-pan + tap/double-tap handling (mouse & iPad touch)
    imageContainer.addEventListener("pointerdown", (e) => {
      if (e.target.closest("#reset-pan-btn")) return;
      if (!isZoomed) return;
      isDragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      panStartX = panX;
      panStartY = panY;
      imageContainer.classList.add("dragging");
      imageContainer.setPointerCapture(e.pointerId);
    });

    imageContainer.addEventListener("pointermove", (e) => {
      if (!isDragging || !isZoomed) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragMoved = true;
      }
      panX = panStartX + dx;
      panY = panStartY + dy;
      applyImageTransform();
    });

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      imageContainer.classList.remove("dragging");
    }

    imageContainer.addEventListener("pointerup", endDrag);
    imageContainer.addEventListener("pointercancel", endDrag);

    imageContainer.addEventListener("click", (e) => {
      if (e.target.closest("#reset-pan-btn")) return;
      if (dragMoved) {
        dragMoved = false;
        return;
      }

      if (currentQuestionIndex === -1) {
        startQuestions();
        return;
      }

      const now = Date.now();
      if (now - lastTapTime < 320) {
        toggleZoom();
        lastTapTime = 0;
      } else {
        lastTapTime = now;
      }
    });

    window.addEventListener("resize", () => {
      if (isZoomed) applyImageTransform();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isZoomed) {
        resetZoom();
      } else if (e.key === "ArrowLeft") {
        showPrevQuestion();
      } else if (e.key === "ArrowRight") {
        showNextQuestion();
      }
    });
  }
});

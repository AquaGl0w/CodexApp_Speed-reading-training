const wordGroups = [
  ["集中力", "集約力", "集積力", "注視力"],
  ["瞬発力", "瞬間力", "瞬読力", "反発力"],
  ["観察眼", "観測眼", "洞察眼", "観察力"],
  ["読解力", "読取力", "解読力", "読破力"],
  ["記憶術", "記録術", "記銘力", "記憶力"],
  ["反射神経", "反応神経", "反射速度", "反応速度"],
  ["判断力", "判読力", "判別力", "決断力"],
  ["視野拡張", "視野拡大", "視界拡張", "視線拡張"],
  ["認識速度", "認知速度", "認識精度", "認知精度"],
  ["要約力", "要点力", "要約術", "要領力"],
  ["連想力", "連結力", "想起力", "連読力"],
  ["注意力", "注目力", "注意深度", "集中深度"],
  ["理解度", "理解力", "把握度", "解釈力"],
  ["直感力", "直観力", "瞬感力", "直読力"],
  ["分析力", "分解力", "解析力", "分類力"],
  ["思考力", "試行力", "思索力", "推考力"],
  ["洞察力", "洞観力", "洞察眼", "観察力"],
  ["没入力", "没頭力", "入力速度", "集中量"],
  ["発想力", "発見力", "発話力", "創想力"],
  ["探索力", "検索力", "探知力", "索引力"],
  ["速読力", "即読力", "精読力", "速解力"],
  ["記号認識", "記号認知", "符号認識", "図形認識"],
  ["視線移動", "視点移動", "視線誘導", "視点誘導"],
  ["短期記憶", "短時記憶", "長期記憶", "瞬間記憶"],
  ["文脈把握", "文章把握", "文意把握", "要旨把握"],
  ["語彙判断", "語意判断", "語形判断", "語句判断"],
  ["速度維持", "速度向上", "精度維持", "精度向上"],
  ["視覚処理", "知覚処理", "視覚認知", "知覚認知"]
];

const words = [...new Set(wordGroups.flat())];
const bestScoreKeyPrefix = "speedWordCatchBestScore:";

const difficultySettings = {
  beginner: {
    label: "初級",
    summary: "8問 / 3択 / ゆっくり",
    totalRounds: 8,
    optionCount: 3,
    baseFlashMs: 980,
    minFlashMs: 640,
    roundPressure: 10,
    comboPressure: 14,
    correctBase: 150,
    speedBonusBase: 90,
    speedBonusStep: 16,
    comboBonus: 18,
    hitDelayMs: 680,
    missDelayMs: 1100
  },
  intermediate: {
    label: "中級",
    summary: "10問 / 4択 / 標準",
    totalRounds: 10,
    optionCount: 4,
    baseFlashMs: 740,
    minFlashMs: 360,
    roundPressure: 18,
    comboPressure: 28,
    correctBase: 180,
    speedBonusBase: 120,
    speedBonusStep: 12,
    comboBonus: 30,
    hitDelayMs: 560,
    missDelayMs: 980
  },
  advanced: {
    label: "上級",
    summary: "12問 / 4択 / 高速",
    totalRounds: 12,
    optionCount: 4,
    baseFlashMs: 560,
    minFlashMs: 240,
    roundPressure: 24,
    comboPressure: 36,
    correctBase: 230,
    speedBonusBase: 160,
    speedBonusStep: 10,
    comboBonus: 45,
    hitDelayMs: 460,
    missDelayMs: 840
  }
};

const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const accuracyEl = document.querySelector("#accuracy");
const roundLabelEl = document.querySelector("#roundLabel");
const speedLabelEl = document.querySelector("#speedLabel");
const meterBarEl = document.querySelector("#meterBar");
const flashZoneEl = document.querySelector("#flashZone");
const flashWordEl = document.querySelector("#flashWord");
const flashHintEl = document.querySelector("#flashHint");
const choicesEl = document.querySelector("#choices");
const resultTextEl = document.querySelector("#resultText");
const startButtonEl = document.querySelector("#startButton");
const resetButtonEl = document.querySelector("#resetButton");
const particleLayerEl = document.querySelector("#particleLayer");
const difficultySummaryEl = document.querySelector("#difficultySummary");
const difficultyButtonEls = document.querySelectorAll(".difficulty-button");
const resultPanelEl = document.querySelector("#resultPanel");
const rankTextEl = document.querySelector("#rankText");
const bestScoreTextEl = document.querySelector("#bestScoreText");
const scoreDiffTextEl = document.querySelector("#scoreDiffText");

let currentLevel = "intermediate";
let state = createInitialState();
let flashTimerId = 0;
let nextTimerId = 0;
let countdownTimerId = 0;
let audioContext = null;

function createInitialState() {
  return {
    score: 0,
    combo: 0,
    round: 0,
    correct: 0,
    answered: 0,
    answer: "",
    accepting: false,
    choiceStartedAt: 0,
    playing: false,
    countingDown: false,
    level: currentLevel
  };
}

function startGame() {
  clearTimers();
  state = createInitialState();
  state.playing = true;
  startButtonEl.disabled = true;
  resetButtonEl.disabled = false;
  setDifficultyControlsEnabled(false);
  hideResultPanel();
  resultTextEl.textContent = "";
  updateStats();
  startCountdown();
}

function resetGame() {
  clearTimers();
  state = createInitialState();
  flashWordEl.textContent = "READY";
  flashHintEl.textContent = "START";
  flashWordEl.classList.remove("is-countdown", "is-flashing");
  resultTextEl.textContent = "";
  hideResultPanel();
  choicesEl.hidden = true;
  meterBarEl.style.transition = "none";
  meterBarEl.style.transform = "scaleX(0)";
  startButtonEl.textContent = "START";
  startButtonEl.disabled = false;
  resetButtonEl.disabled = true;
  setDifficultyControlsEnabled(true);
  updateStats();
}

function nextRound() {
  const settings = getCurrentSettings();

  if (state.round >= settings.totalRounds) {
    finishGame();
    return;
  }

  state.round += 1;
  state.accepting = false;
  state.countingDown = false;
  choicesEl.hidden = true;
  choicesEl.innerHTML = "";
  hideResultPanel();
  resultTextEl.textContent = "";
  flashZoneEl.classList.remove("is-hit", "is-miss");
  flashWordEl.classList.remove("is-countdown");

  const flashMs = getFlashMs();
  const answer = pick(words);
  state.answer = answer;

  roundLabelEl.textContent = `ROUND ${state.round} / ${settings.totalRounds}`;
  speedLabelEl.textContent = `${(flashMs / 1000).toFixed(2)}s`;
  flashWordEl.textContent = answer;
  flashHintEl.textContent = "FOCUS";
  flashWordEl.classList.remove("is-flashing");
  void flashWordEl.offsetWidth;
  flashWordEl.classList.add("is-flashing");
  runMeter(flashMs);

  flashTimerId = window.setTimeout(() => {
    flashWordEl.textContent = "？";
    flashHintEl.textContent = "CATCH";
    showChoices(answer);
  }, flashMs);
}

function getFlashMs() {
  const settings = getCurrentSettings();
  const pressure = state.round * settings.roundPressure + state.combo * settings.comboPressure;
  return Math.max(settings.minFlashMs, settings.baseFlashMs - pressure);
}

function showChoices(answer) {
  const settings = getCurrentSettings();
  const options = getChoiceOptions(answer, settings.optionCount);

  choicesEl.innerHTML = "";
  options.forEach((word, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.dataset.word = word;
    button.innerHTML = `<span>${index + 1}</span><strong>${word}</strong>`;
    button.addEventListener("click", () => answerChoice(button));
    choicesEl.append(button);
  });

  choicesEl.hidden = false;
  state.accepting = true;
  state.choiceStartedAt = performance.now();
}

function answerChoice(button) {
  if (!state.accepting) return;

  state.accepting = false;
  const selected = button.dataset.word;
  const isCorrect = selected === state.answer;
  const elapsedMs = performance.now() - state.choiceStartedAt;

  state.answered += 1;
  choicesEl.querySelectorAll(".choice-button").forEach((choiceButton) => {
    choiceButton.disabled = true;
    if (choiceButton.dataset.word === state.answer) {
      choiceButton.classList.add("is-correct");
    }
  });

  if (isCorrect) {
    const settings = getCurrentSettings();
    const speedBonus = Math.max(0, settings.speedBonusBase - Math.round(elapsedMs / settings.speedBonusStep));
    const comboBonus = state.combo * settings.comboBonus;
    const gained = settings.correctBase + speedBonus + comboBonus;
    state.combo += 1;
    state.correct += 1;
    state.score += gained;
    button.classList.add("is-correct");
    flashZoneEl.classList.add("is-hit");
    resultTextEl.textContent = `HIT +${gained}`;
    playTone("hit");
    createBurst();
    scheduleNextRound(settings.hitDelayMs);
  } else {
    const settings = getCurrentSettings();
    state.combo = 0;
    button.classList.add("is-wrong");
    flashZoneEl.classList.add("is-miss");
    resultTextEl.textContent = `MISS  正解: ${state.answer}`;
    playTone("miss");
    scheduleNextRound(settings.missDelayMs);
  }

  updateStats();
}

function scheduleNextRound(delayMs) {
  nextTimerId = window.setTimeout(() => {
    nextRound();
  }, delayMs);
}

function finishGame() {
  const settings = getCurrentSettings();
  clearTimers();
  state.playing = false;
  state.accepting = false;
  state.countingDown = false;
  choicesEl.hidden = true;
  meterBarEl.style.transition = "none";
  meterBarEl.style.transform = "scaleX(0)";
  const result = updateBestScore();
  flashWordEl.textContent = `${state.score.toLocaleString("ja-JP")}点`;
  flashHintEl.textContent = `${settings.label}  正答 ${state.correct} / ${settings.totalRounds}`;
  resultTextEl.textContent = result.isNewBest ? "NEW BEST" : getFinishMessage();
  showResultPanel(result);
  playTone(result.isNewBest ? "best" : "finish");
  startButtonEl.textContent = "RETRY";
  startButtonEl.disabled = false;
  resetButtonEl.disabled = true;
  setDifficultyControlsEnabled(true);
}

function getFinishMessage() {
  const rate = state.correct / getCurrentSettings().totalRounds;
  if (rate === 1) return "PERFECT";
  if (rate >= 0.8) return "GREAT RUN";
  if (rate >= 0.5) return "GOOD SPEED";
  return "NEXT CHALLENGE";
}

function updateStats() {
  const settings = getCurrentSettings();
  const accuracy = state.answered === 0 ? 0 : Math.round((state.correct / state.answered) * 100);
  scoreEl.textContent = state.score.toLocaleString("ja-JP");
  comboEl.textContent = state.combo;
  accuracyEl.textContent = `${accuracy}%`;
  roundLabelEl.textContent = `ROUND ${state.round} / ${settings.totalRounds}`;
  speedLabelEl.textContent = `${(getFlashMs() / 1000).toFixed(2)}s`;
  difficultySummaryEl.textContent = settings.summary;
}

function changeDifficulty(level) {
  if (state.playing || !difficultySettings[level]) return;

  currentLevel = level;
  state.level = level;
  flashWordEl.textContent = "READY";
  flashHintEl.textContent = difficultySettings[level].label;
  resultTextEl.textContent = "";
  hideResultPanel();
  updateDifficultyButtons();
  updateStats();
}

function getCurrentSettings() {
  return difficultySettings[state.level || currentLevel];
}

function updateDifficultyButtons() {
  difficultyButtonEls.forEach((button) => {
    const isActive = button.dataset.level === currentLevel;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setDifficultyControlsEnabled(isEnabled) {
  difficultyButtonEls.forEach((button) => {
    button.disabled = !isEnabled;
  });
}

function startCountdown() {
  const sequence = ["3", "2", "1", "GO"];
  state.countingDown = true;
  choicesEl.hidden = true;
  flashHintEl.textContent = "READY";
  meterBarEl.style.transition = "none";
  meterBarEl.style.transform = "scaleX(0)";

  const showStep = (index) => {
    if (!state.playing || !state.countingDown) return;

    if (index >= sequence.length) {
      state.countingDown = false;
      flashWordEl.classList.remove("is-countdown");
      nextRound();
      return;
    }

    flashWordEl.textContent = sequence[index];
    flashWordEl.classList.remove("is-countdown");
    void flashWordEl.offsetWidth;
    flashWordEl.classList.add("is-countdown");
    flashHintEl.textContent = index < 3 ? "COUNTDOWN" : "START";
    playTone(index < 3 ? "count" : "go");
    countdownTimerId = window.setTimeout(() => showStep(index + 1), 520);
  };

  showStep(0);
}

function getChoiceOptions(answer, optionCount) {
  const similarWords = getSimilarWords(answer);
  const fallbackWords = words.filter((word) => word !== answer && !similarWords.includes(word));
  const distractors = [
    ...shuffle(similarWords).slice(0, optionCount - 1),
    ...shuffle(fallbackWords)
  ].slice(0, optionCount - 1);

  return shuffle([answer, ...distractors]);
}

function getSimilarWords(answer) {
  const group = wordGroups.find((items) => items.includes(answer));
  if (!group) return [];
  return group.filter((word) => word !== answer);
}

function updateBestScore() {
  const key = `${bestScoreKeyPrefix}${state.level}`;
  const previousBest = readBestScore(key);
  const isNewBest = state.score > previousBest;
  const bestScore = isNewBest ? state.score : previousBest;

  if (isNewBest) {
    window.localStorage.setItem(key, String(state.score));
  }

  return {
    bestScore,
    previousBest,
    scoreDiff: state.score - previousBest,
    isNewBest,
    rank: getRank()
  };
}

function readBestScore(key) {
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? value : 0;
}

function getRank() {
  const settings = getCurrentSettings();
  const rate = state.correct / settings.totalRounds;
  if (rate === 1 && state.combo >= Math.floor(settings.totalRounds * 0.7)) return "S";
  if (rate >= 0.9) return "A";
  if (rate >= 0.75) return "B";
  if (rate >= 0.5) return "C";
  return "D";
}

function showResultPanel(result) {
  rankTextEl.textContent = result.rank;
  bestScoreTextEl.textContent = result.bestScore.toLocaleString("ja-JP");
  scoreDiffTextEl.textContent =
    result.previousBest === 0 ? "初記録" : `${result.scoreDiff >= 0 ? "+" : ""}${result.scoreDiff.toLocaleString("ja-JP")}`;
  resultPanelEl.hidden = false;
}

function hideResultPanel() {
  resultPanelEl.hidden = true;
  rankTextEl.textContent = "-";
  bestScoreTextEl.textContent = readBestScore(`${bestScoreKeyPrefix}${state.level || currentLevel}`).toLocaleString("ja-JP");
  scoreDiffTextEl.textContent = "0";
}

function playTone(type) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext ||= new AudioContextClass();
  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  const oscillator = audioContext.createOscillator();
  const settings = {
    count: [420, 0.035, 0.07],
    go: [680, 0.055, 0.12],
    hit: [820, 0.07, 0.12],
    miss: [180, 0.06, 0.16],
    finish: [520, 0.055, 0.18],
    best: [960, 0.075, 0.22]
  }[type];

  if (!settings) return;

  oscillator.type = type === "miss" ? "sawtooth" : "sine";
  oscillator.frequency.setValueAtTime(settings[0], now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(settings[1], now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + settings[2]);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + settings[2] + 0.03);
}

function runMeter(durationMs) {
  meterBarEl.style.transition = "none";
  meterBarEl.style.transform = "scaleX(1)";

  requestAnimationFrame(() => {
    meterBarEl.style.transition = `transform ${durationMs}ms linear`;
    meterBarEl.style.transform = "scaleX(0)";
  });
}

function createBurst() {
  const colors = ["#0fb5a5", "#6d5dfc", "#ffbf3f", "#ff6b6b", "#6ee7b7"];
  const rect = flashZoneEl.getBoundingClientRect();
  const shellRect = particleLayerEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2 - shellRect.left;
  const centerY = rect.top + rect.height / 2 - shellRect.top;

  for (let index = 0; index < 24; index += 1) {
    const particle = document.createElement("span");
    const angle = (Math.PI * 2 * index) / 24;
    const distance = 80 + Math.random() * 100;
    particle.className = "particle";
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    particle.style.background = colors[index % colors.length];
    particle.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
    particleLayerEl.append(particle);
    particle.addEventListener("animationend", () => particle.remove());
  }
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function clearTimers() {
  window.clearTimeout(flashTimerId);
  window.clearTimeout(nextTimerId);
  window.clearTimeout(countdownTimerId);
}

startButtonEl.addEventListener("click", startGame);
resetButtonEl.addEventListener("click", resetGame);
difficultyButtonEls.forEach((button) => {
  button.addEventListener("click", () => changeDifficulty(button.dataset.level));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !state.playing) {
    startGame();
    return;
  }

  const index = Number(event.key) - 1;
  const button = choicesEl.querySelectorAll(".choice-button")[index];
  if (state.accepting && button) {
    button.click();
  }
});

updateDifficultyButtons();
updateStats();

import { MegaDriveSynth } from "../js/megasynth.js";

const status = document.getElementById("status");
const keyboard = document.getElementById("keyboard");
const commonControlsRoot =
  document.getElementById("commonControls");
const operatorControlsRoot =
  document.getElementById("operatorControls");
const envelopeCanvas =
  document.getElementById("envelopeCanvas");
const envelopeContext =
  envelopeCanvas.getContext("2d");
const heldKeys = new Set();

const OPERATOR_NUMBERS = [
  1,
  2,
  3,
  4,
];

const OPERATOR_PARAM_DEFS = [
  { id: "dt", label: "DT", min: 0, max: 7, step: 1 },
  { id: "multi", label: "MULTI", min: 0, max: 15, step: 1 },
  { id: "tl", label: "TL", min: 0, max: 127, step: 1 },
  { id: "ar", label: "AR", min: 0, max: 31, step: 1 },
  { id: "d1r", label: "D1R", min: 0, max: 31, step: 1 },
  { id: "d2r", label: "D2R", min: 0, max: 31, step: 1 },
  { id: "sl", label: "SL", min: 0, max: 15, step: 1 },
  { id: "rr", label: "RR", min: 0, max: 15, step: 1 },
];

const COMMON_PARAM_DEFS = [
  { id: "algorithm", label: "ALGO", min: 0, max: 7, step: 1 },
  { id: "feedback", label: "FB", min: 0, max: 7, step: 1 },
];

const VOICE_COUNT = 6;

const REFERENCE_MIDI = 62;
const REFERENCE_BLOCK = 4;
const REFERENCE_FNUM = 553;

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const ROW_DEFS = [
  { keys: "1234567890", baseMidi: 67 },
  { keys: "qwertyuiop", baseMidi: 62 },
  { keys: "asdfghjkl", baseMidi: 57 },
  { keys: "zxcvbnm", baseMidi: 52 },
];

const KEY_LAYOUT = ROW_DEFS.flatMap((row) => {
  return Array.from(row.keys).map((key, index) => {
    const midi = row.baseMidi + index;

    return {
      key,
      label: key.toUpperCase(),
      midi,
      noteName: midiToNoteName(midi),
      pitch: createPitchFromMidi(midi),
      rowLength: row.keys.length,
    };
  });
});

const commonState = {
  algorithm: 7,
  feedback: 0,
};

const operatorStates = {
  1: {
    dt: 0,
    multi: 1,
    tl: 127,
    ar: 31,
    d1r: 0,
    d2r: 0,
    sl: 0,
    rr: 15,
  },
  2: {
    dt: 0,
    multi: 1,
    tl: 127,
    ar: 31,
    d1r: 0,
    d2r: 0,
    sl: 0,
    rr: 15,
  },
  3: {
    dt: 0,
    multi: 1,
    tl: 127,
    ar: 31,
    d1r: 0,
    d2r: 0,
    sl: 0,
    rr: 15,
  },
  4: {
    dt: 0,
    multi: 1,
    tl: 8,
    ar: 22,
    d1r: 6,
    d2r: 3,
    sl: 3,
    rr: 8,
  },
};

const commonControls = new Map();
const operatorControls = new Map();
const envelopeDescription =
  document.getElementById(
    "envelopeDescription"
  );

const ALGORITHM_DESCRIPTIONS = [
  'ALGO 0 <span class="op-color-1">OP1</span> -> <span class="op-color-2">OP2</span> -> <span class="op-color-3">OP3</span> -> <span class="op-color-4">OP4</span> -> OUT',
  'ALGO 1 (<span class="op-color-1">OP1</span> + <span class="op-color-2">OP2</span>) -> <span class="op-color-3">OP3</span> -> <span class="op-color-4">OP4</span> -> OUT',
  'ALGO 2 (<span class="op-color-1">OP1</span> + (<span class="op-color-2">OP2</span> -> <span class="op-color-3">OP3</span>)) -> <span class="op-color-4">OP4</span> -> OUT',
  'ALGO 3 ((<span class="op-color-1">OP1</span> -> <span class="op-color-2">OP2</span>) + <span class="op-color-3">OP3</span>) -> <span class="op-color-4">OP4</span> -> OUT',
  'ALGO 4 (<span class="op-color-1">OP1</span> -> <span class="op-color-2">OP2</span>) + (<span class="op-color-3">OP3</span> -> <span class="op-color-4">OP4</span>) -> OUT',
  'ALGO 5 (<span class="op-color-1">OP1</span> -> <span class="op-color-2">OP2</span>) + (<span class="op-color-1">OP1</span> -> <span class="op-color-3">OP3</span>) + (<span class="op-color-1">OP1</span> -> <span class="op-color-4">OP4</span>) -> OUT',
  'ALGO 6 (<span class="op-color-1">OP1</span> -> <span class="op-color-2">OP2</span>) + <span class="op-color-3">OP3</span> + <span class="op-color-4">OP4</span> -> OUT',
  'ALGO 7 <span class="op-color-1">OP1</span> + <span class="op-color-2">OP2</span> + <span class="op-color-3">OP3</span> + <span class="op-color-4">OP4</span> -> OUT',
];

let audioContext = null;
let audioReadyPromise = null;
let megaSynth = null;
let synth = null;
let analyser = null;
let analyserTimeData = null;
let visualFrame = 0;
let outputEnvelopeHistory = [];

const voices = Array.from(
  { length: VOICE_COUNT },
  (_, channel) => ({
    channel,
    held: false,
    key: null,
    startedAt: 0,
  })
);

const activeKeys = new Map();

function setStatus(message) {
  status.textContent = message;
}

function midiToNoteName(midi) {
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;

  return `${note}${octave}`;
}

function createPitchFromMidi(midi) {
  let block = REFERENCE_BLOCK;
  let fnum =
    REFERENCE_FNUM *
    Math.pow(2, (midi - REFERENCE_MIDI) / 12);

  while (fnum >= 1024 && block < 7) {
    fnum /= 2;
    block += 1;
  }

  while (fnum < 512 && block > 0) {
    fnum *= 2;
    block -= 1;
  }

  return {
    block,
    fnum: Math.max(
      0,
      Math.min(0x7ff, Math.round(fnum))
    ),
  };
}

function applyPatchToVoices() {
  if (!synth) {
    return;
  }

  for (
    let channel = 0;
    channel < VOICE_COUNT;
    channel += 1
  ) {
    for (const operator of OPERATOR_NUMBERS) {
      synth.setOperator(
        channel,
        operator,
        operatorStates[operator]
      );
    }

    synth.setAlgo(
      channel,
      commonState.algorithm,
      commonState.feedback
    );

    synth.setPan(channel, true, true);
  }
}

function clampValue(value, min, max) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

function renderAlgorithmDiagram() {
  if (!envelopeDescription) {
    return;
  }

  const algorithm =
    commonState.algorithm;
  const feedback =
    commonState.feedback;
  const description =
    ALGORITHM_DESCRIPTIONS[
      algorithm
    ] || `ALGO ${algorithm}`;

  const feedbackText =
    feedback === 0
      ? "FB off"
      : `OP1 feedback ${feedback}.`;

  envelopeDescription.className =
    "algo-inline";
  envelopeDescription.innerHTML =
    `${description} ${feedbackText}`;
}

function clearCanvas(
  context,
  canvas
) {
  context.fillStyle = "#241d16";
  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );
}

function buildNormalizedHistory(
  history
) {
  if (history.length < 2) {
    return [];
  }

  let peak = 0;
  for (const value of history) {
    if (value > peak) {
      peak = value;
    }
  }

  if (peak <= 0.000001) {
    return history.map(() => 0);
  }

  return history.map((value) =>
    Math.min(1, value / peak)
  );
}

function drawOutputEnvelopeOverlay(
  points,
  layout
) {
  if (!points || points.length < 2) {
    return;
  }

  envelopeContext.strokeStyle =
    "#7be0d6";
  envelopeContext.lineWidth = 2;
  envelopeContext.beginPath();

  for (
    let index = 0;
    index < points.length;
    index += 1
  ) {
    const x =
      layout.left +
      (layout.innerWidth * index) /
        (points.length - 1);
    const y =
      layout.bottom -
      points[index] *
        layout.innerHeight *
        0.94;

    if (index === 0) {
      envelopeContext.moveTo(x, y);
    } else {
      envelopeContext.lineTo(x, y);
    }
  }

  envelopeContext.stroke();
}

function drawOperatorGuide(
  layout,
  settings,
  style
) {
  const attackPortion =
    0.06 +
    ((31 - settings.ar) / 31) * 0.22;
  const decayPortion =
    0.08 +
    ((31 - settings.d1r) / 31) * 0.16;
  const sustainPortion =
    0.16 +
    ((31 - settings.d2r) / 31) * 0.18;
  const releasePortion =
    0.10 +
    ((15 - settings.rr) / 15) * 0.20;
  const tailPortion = Math.max(
    0.08,
    1 -
      (attackPortion +
        decayPortion +
        sustainPortion +
        releasePortion)
  );

  const x0 = layout.left;
  const x1 =
    layout.left +
    layout.innerWidth * attackPortion;
  const x2 =
    x1 +
    layout.innerWidth * decayPortion;
  const x3 =
    x2 +
    layout.innerWidth * sustainPortion;
  const x4 =
    x3 +
    layout.innerWidth * tailPortion;
  const x5 = layout.right;

  const intensity =
    1 -
    (settings.tl / 127) * 0.75 -
    (settings.dt / 7) * 0.04;
  const peakLevel =
    0.08 +
    (1 - intensity) * 0.12 +
    style.verticalBias;
  const decayLevel = Math.min(
    0.90,
    peakLevel +
      0.12 +
      (settings.d1r / 31) * 0.18 +
      style.verticalBias
  );
  const sustainLevel = Math.max(
    decayLevel,
    0.10 +
      (settings.sl / 15) * 0.70 +
      (settings.d2r / 31) * 0.04 +
      style.verticalBias
  );
  const tailLevel = Math.min(
    0.94,
    sustainLevel +
      0.04 +
      (settings.rr / 15) * 0.04
  );
  const peakY =
    layout.top +
    layout.innerHeight * peakLevel;
  const decayY =
    layout.top +
    layout.innerHeight * decayLevel;
  const sustainY =
    layout.top +
    layout.innerHeight * sustainLevel;
  const tailY =
    layout.top +
    layout.innerHeight * tailLevel;

  envelopeContext.strokeStyle =
    style.color;
  envelopeContext.lineWidth =
    style.lineWidth;
  envelopeContext.beginPath();
  envelopeContext.moveTo(
    x0,
    layout.bottom
  );
  envelopeContext.lineTo(x1, peakY);
  envelopeContext.lineTo(x2, decayY);
  envelopeContext.lineTo(x3, sustainY);
  envelopeContext.lineTo(x4, tailY);
  envelopeContext.lineTo(
    x5,
    layout.bottom
  );
  envelopeContext.stroke();
}

function drawEnvelopeGuide() {
  clearCanvas(
    envelopeContext,
    envelopeCanvas
  );

  const width = envelopeCanvas.width;
  const height = envelopeCanvas.height;
  const left = 22;
  const right = width - 18;
  const top = 16;
  const bottom = height - 20;
  const innerWidth = right - left;
  const innerHeight = bottom - top;
  const layout = {
    left,
    right,
    top,
    bottom,
    innerWidth,
    innerHeight,
  };

  envelopeContext.strokeStyle =
    "#514233";
  envelopeContext.lineWidth = 1;
  envelopeContext.beginPath();
  envelopeContext.moveTo(left, bottom);
  envelopeContext.lineTo(right, bottom);
  envelopeContext.moveTo(left, top);
  envelopeContext.lineTo(left, bottom);
  envelopeContext.stroke();

  for (let index = 1; index <= 4; index += 1) {
    const x =
      left +
      (innerWidth * index) / 5;
    envelopeContext.strokeStyle =
      "rgba(214, 177, 132, 0.18)";
    envelopeContext.beginPath();
    envelopeContext.moveTo(x, top);
    envelopeContext.lineTo(x, bottom);
    envelopeContext.stroke();
  }

  const guideStyles = [
    {
      color: "#f2c078",
      lineWidth: 2.6,
      verticalBias: 0,
    },
    {
      color: "#ff93bc",
      lineWidth: 2,
      verticalBias: -0.015,
    },
    {
      color: "#9dff9b",
      lineWidth: 2,
      verticalBias: 0.015,
    },
    {
      color: "#89b7ff",
      lineWidth: 2,
      verticalBias: -0.03,
    },
  ];

  for (const operator of OPERATOR_NUMBERS) {
    drawOperatorGuide(
      layout,
      operatorStates[operator],
      guideStyles[operator - 1]
    );
  }

  const normalizedHistory =
    buildNormalizedHistory(
      outputEnvelopeHistory
    );
  drawOutputEnvelopeOverlay(
    normalizedHistory,
    layout
  );

  envelopeContext.fillStyle =
    "#f6ead7";
  envelopeContext.font =
    "13px sans-serif";
  envelopeContext.fillText(
    "attack",
    left + 6,
    bottom - 8
  );
  envelopeContext.fillText(
    "hold",
    left + innerWidth * 0.28,
    top + 18
  );
  envelopeContext.fillText(
    "release",
    left + innerWidth * 0.72,
    top + 18
  );

  envelopeContext.fillStyle =
    "#d6b184";
  envelopeContext.fillText(
    "Orange/Pink/Green/Blue: OP1-OP4 guides. Cyan: recent output level.",
    18,
    28
  );
}

function sampleOutputEnvelope() {
  if (!analyser || !analyserTimeData) {
    return;
  }

  analyser.getFloatTimeDomainData(
    analyserTimeData
  );

  let sum = 0;
  for (
    let index = 0;
    index < analyserTimeData.length;
    index += 1
  ) {
    const value = analyserTimeData[index];
    sum += value * value;
  }

  const rms = Math.sqrt(
    sum / analyserTimeData.length
  );

  outputEnvelopeHistory.push(rms);
  if (outputEnvelopeHistory.length > 160) {
    outputEnvelopeHistory.shift();
  }
}

function updateVisuals() {
  sampleOutputEnvelope();
  drawEnvelopeGuide();
  visualFrame =
    requestAnimationFrame(
      updateVisuals
    );
}

function ensureVisualLoop() {
  if (!visualFrame) {
    visualFrame =
      requestAnimationFrame(
        updateVisuals
      );
  }
}

function createParamControl(config) {
  const {
    label,
    min,
    max,
    step,
    value,
    onChange,
  } = config;

  const wrapper =
    document.createElement("div");
  wrapper.className = "param-control";

  const labelElement =
    document.createElement("div");
  labelElement.className = "param-label";
  labelElement.textContent = label;

  const minusButton =
    document.createElement("button");
  minusButton.type = "button";
  minusButton.className = "param-button";
  minusButton.textContent = "-";

  const valueElement =
    document.createElement("button");
  valueElement.type = "button";
  valueElement.className = "param-value";
  valueElement.setAttribute(
    "aria-label",
    label
  );

  const plusButton =
    document.createElement("button");
  plusButton.type = "button";
  plusButton.className = "param-button";
  plusButton.textContent = "+";

  const updateVisual =
    (nextValue) => {
      valueElement.textContent = String(nextValue);
    };

  let currentValue = value;
  let dragStartX = 0;
  let dragStartValue = value;
  const valueRange =
    Math.max(step, max - min);
  const dragPixelsForFullRange = 160;

  const applyValue =
    (nextValue) => {
      currentValue =
        clampValue(
          nextValue,
          min,
          max
        );
      updateVisual(currentValue);
      onChange(currentValue);
    };

  minusButton.addEventListener(
    "click",
    () => {
      applyValue(currentValue - step);
    }
  );

  plusButton.addEventListener(
    "click",
    () => {
      applyValue(currentValue + step);
    }
  );

  valueElement.addEventListener(
    "pointerdown",
    (event) => {
      dragStartX = event.clientX;
      dragStartValue = currentValue;
      valueElement.classList.add(
        "is-dragging"
      );
      valueElement.setPointerCapture(
        event.pointerId
      );
    }
  );

  valueElement.addEventListener(
    "pointermove",
    (event) => {
      if (
        valueElement.hasPointerCapture(
          event.pointerId
        ) === false
      ) {
        return;
      }

      const deltaX =
        event.clientX - dragStartX;
      const deltaSteps =
        Math.round(
          (deltaX / dragPixelsForFullRange) *
          (valueRange / step)
        );

      applyValue(
        dragStartValue +
        deltaSteps * step
      );
    }
  );

  const endDrag =
    (event) => {
      if (
        valueElement.hasPointerCapture(
          event.pointerId
        )
      ) {
        valueElement.releasePointerCapture(
          event.pointerId
        );
      }
      valueElement.classList.remove(
        "is-dragging"
      );
    };

  valueElement.addEventListener(
    "pointerup",
    endDrag
  );
  valueElement.addEventListener(
    "pointercancel",
    endDrag
  );

  wrapper.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const direction =
        event.deltaY < 0
          ? step
          : -step;
      applyValue(currentValue + direction);
    },
    { passive: false }
  );

  wrapper.appendChild(labelElement);
  wrapper.appendChild(minusButton);
  wrapper.appendChild(valueElement);
  wrapper.appendChild(plusButton);

  updateVisual(value);

  return {
    element: wrapper,
    updateVisual,
  };
}

function buildCommonControls() {
  commonControlsRoot.innerHTML = "";

  for (const config of COMMON_PARAM_DEFS) {
    const control =
      createParamControl({
        ...config,
        value: commonState[config.id],
        onChange: (nextValue) => {
          commonState[config.id] =
            nextValue;
          renderAlgorithmDiagram();
          if (synth) {
            applyPatchToVoices();
          }
        },
      });

    commonControls.set(
      config.id,
      control
    );

    commonControlsRoot.appendChild(
      control.element
    );
  }
}

function buildOperatorControls() {
  operatorControlsRoot.innerHTML = "";

  for (const operator of OPERATOR_NUMBERS) {
    const row =
      document.createElement("div");
    row.className =
      "operator-row";

    const name =
      document.createElement("div");
    name.className =
      `operator-name op-color-${operator}`;
    name.textContent =
      `OP${operator}`;

    const strip =
      document.createElement("div");
    strip.className = "param-strip";

    const rowControls =
      new Map();

    for (const config of OPERATOR_PARAM_DEFS) {
      const control =
        createParamControl({
          ...config,
          value:
            operatorStates[operator][
              config.id
            ],
          onChange: (nextValue) => {
            operatorStates[operator][
              config.id
            ] = nextValue;
            if (synth) {
              applyPatchToVoices();
            }
          },
        });

      rowControls.set(
        config.id,
        control
      );

      strip.appendChild(
        control.element
      );
    }

    operatorControls.set(
      operator,
      rowControls
    );

    row.appendChild(name);
    row.appendChild(strip);
    operatorControlsRoot.appendChild(
      row
    );
  }
}

function updateKeyboardVisuals() {
  for (const button of keyboard.querySelectorAll(".key")) {
    button.classList.toggle(
      "is-active",
      activeKeys.has(button.dataset.key)
    );
  }
}

function resetVoiceState() {
  for (const voice of voices) {
    voice.held = false;
    voice.key = null;
    voice.startedAt = 0;
  }

  activeKeys.clear();
  updateKeyboardVisuals();
}

function stopAllNotes() {
  if (!synth) {
    return;
  }

  for (
    let channel = 0;
    channel < VOICE_COUNT;
    channel += 1
  ) {
    synth.noteOff(channel);
  }

  resetVoiceState();
}

function chooseVoice() {
  const freeVoice = voices.find(
    (voice) => !voice.held
  );

  if (freeVoice) {
    return freeVoice;
  }

  let oldest = voices[0];

  for (const voice of voices) {
    if (voice.startedAt < oldest.startedAt) {
      oldest = voice;
    }
  }

  return oldest;
}

async function initializeDirectAudio() {
  setStatus(
    "Loading YM2612 MegaDriveSynth..."
  );

  if (!analyser) {
    analyser =
      audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;
    analyserTimeData = new Float32Array(
      analyser.fftSize
    );
  }

  analyser.connect(
    audioContext.destination
  );

  megaSynth =
    new MegaDriveSynth({
      audioContext,
      outputNode: analyser,
      workletUrl:
        "../js/ym2612-worklet.js",
      ym2612WasmUrl:
        "../generated/ym2612_wasm.wasm",
    });

  await megaSynth.start();

  synth = megaSynth.fm;

  applyPatchToVoices();
  ensureVisualLoop();

  setStatus(
    `Audio ready. YM2612 via MegaDriveSynth at ${audioContext.sampleRate} Hz.`
  );
}

async function ensureAudioReady() {
  if (!audioContext) {
    audioContext =
      new AudioContext();
  }

  if (
    audioContext.state !== "running"
  ) {
    await audioContext.resume();
  }

  if (!audioReadyPromise) {
    audioReadyPromise =
      initializeDirectAudio();
  }

  try {
    await audioReadyPromise;
  } catch (error) {
    audioReadyPromise = null;
    throw error;
  }

}

async function pressKey(key) {
  console.log(`pressKey: ${key}`);

  heldKeys.add(key);

  const entry = KEY_LAYOUT.find(
    (item) => item.key === key
  );

  if (
    !entry ||
    activeKeys.has(key)
  ) {
    return;
  }

  try {
    await ensureAudioReady();
  } catch (error) {
    console.error(error);

    setStatus(
      `Error: ${error.message}`
    );

    return;
  }

  // The key may have been released while waiting for audio initialization.
  if (
    heldKeys.has(key) === false
  ) {
    return;
  }

  const voice = chooseVoice();

  if (voice.held) {
    synth.noteOff(
      voice.channel
    );

    if (voice.key) {
      activeKeys.delete(
        voice.key
      );
    }
  }

  synth.noteOn(
    voice.channel,
    entry.pitch.block,
    entry.pitch.fnum
  );

  voice.held = true;
  voice.key = key;
  voice.startedAt =
    performance.now();

  activeKeys.set(
    key,
    voice.channel
  );

  updateKeyboardVisuals();

  setStatus(
    `Playing ${entry.noteName} on channel ${voice.channel + 1}.`
  );
}

function releaseKey(key) {
  heldKeys.delete(key);

  if (!synth) {
    return;
  }

  const channel =
    activeKeys.get(key);

  if (channel === undefined) {
    return;
  }

  synth.noteOff(channel);

  activeKeys.delete(key);

  voices[channel].held = false;
  voices[channel].key = null;
  voices[channel].startedAt = 0;

  updateKeyboardVisuals();
}

function buildKeyboard() {
  keyboard.innerHTML = "";

  for (const row of ROW_DEFS) {
    const rowElement =
      document.createElement("div");

    rowElement.className =
      "key-row";

    rowElement.dataset.count =
      String(row.keys.length);

    for (const keyChar of row.keys) {
      const entry =
        KEY_LAYOUT.find(
          (item) =>
            item.key === keyChar
        );

      const button =
        document.createElement(
          "button"
        );

      button.type = "button";
      button.className = "key";
      button.dataset.key =
        entry.key;

      button.innerHTML = `
        <strong>${entry.label}</strong>
        <span>${entry.noteName}</span>
        <small>b${entry.pitch.block} / f${entry.pitch.fnum}</small>
      `;

      button.addEventListener(
        "pointerdown",
        async (event) => {
          event.preventDefault();

          await pressKey(
            entry.key
          );
        }
      );

      button.addEventListener(
        "pointerup",
        () => {
          releaseKey(
            entry.key
          );
        }
      );

      button.addEventListener(
        "pointerleave",
        () => {
          releaseKey(
            entry.key
          );
        }
      );

      button.addEventListener(
        "pointercancel",
        () => {
          releaseKey(
            entry.key
          );
        }
      );

      rowElement.appendChild(
        button
      );
    }

    keyboard.appendChild(
      rowElement
    );
  }
}

window.addEventListener(
  "keydown",
  (event) => {
    const key =
      event.key.toLowerCase();

    if (
      !KEY_LAYOUT.some(
        (entry) =>
          entry.key === key
      )
    ) {
      return;
    }

    event.preventDefault();

    if (event.repeat) {
      return;
    }

    void pressKey(key);
  }
);

window.addEventListener(
  "keyup",
  (event) => {
    const key =
      event.key.toLowerCase();

    if (
      !KEY_LAYOUT.some(
        (entry) =>
          entry.key === key
      )
    ) {
      return;
    }

    event.preventDefault();

    releaseKey(key);
  }
);

window.addEventListener(
  "blur",
  () => {
    stopAllNotes();
  }
);

buildCommonControls();
buildOperatorControls();
buildKeyboard();
drawEnvelopeGuide();
renderAlgorithmDiagram();

import {
  MegaDriveSynth,
  MEGADRIVE_FM_PRESETS,
  MEGADRIVE_FM_PRESET_ORDER,
} from "../js/megasynth.js";
import {
  DEFAULT_ROW_DEFS,
  buildKeyboard as buildKeyboardView,
  createKeyLayout,
  findLayoutEntry,
  hasLayoutKey,
} from "./synth_keyboard.js";
import {
  drawEnvelopeGuide as drawEnvelopeGuideView,
} from "./synth_envelope.js";
import {
  buildCommonControls as buildCommonControlsView,
  buildHeader,
  buildOperatorControls as buildOperatorControlsView,
} from "./synth_controls.js";

const status = document.getElementById("status");
const keyboard = document.getElementById("keyboard");
const prepareOverlay =
  document.getElementById(
    "prepareOverlay"
  );
const commonControlsRoot =
  document.getElementById("commonControls");
const commonHeaderRoot =
  document.getElementById("commonHeader");
const operatorControlsRoot =
  document.getElementById("operatorControls");
const operatorHeaderRoot =
  document.getElementById("operatorHeader");
const presetSelect =
  document.getElementById("presetSelect");
const envelopeCanvas =
  document.getElementById("envelopeCanvas");
const envelopeContext =
  envelopeCanvas.getContext("2d");
const heldKeys = new Set();
const activePointers = new Map();

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

const ROW_DEFS =
  DEFAULT_ROW_DEFS;

const KEY_LAYOUT =
  createKeyLayout({
    rowDefs: ROW_DEFS,
    referenceMidi:
      REFERENCE_MIDI,
    referenceBlock:
      REFERENCE_BLOCK,
    referenceFnum:
      REFERENCE_FNUM,
  });

const commonState = {
  algorithm: 7,
  feedback: 0,
};

let currentPresetName =
  "one-op-basic";

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
let visualFrame = 0;
let outputEnvelopeHistory = [];
let outputEnvelopeHeldVoicePeak = 1;
const OUTPUT_ENVELOPE_HISTORY_SIZE =
  640;
const OUTPUT_ENVELOPE_SILENCE_FLOOR =
  0.002;
const OUTPUT_ENVELOPE_SLOW_SCALE =
  0.12;
let audioInitStarted = false;

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

function updateKeyboardAvailability() {
  const isInitializing =
    audioInitStarted &&
    !synth;

  keyboard.classList.toggle(
    "is-loading",
    isInitializing
  );

  prepareOverlay?.classList.toggle(
    "is-visible",
    isInitializing
  );
  prepareOverlay?.setAttribute(
    "aria-hidden",
    String(!isInitializing)
  );
}

function appendOutputEnvelopePoints(
  rmsValues
) {
  const heldVoiceCount = voices.filter(
    (voice) => voice.held
  ).length;
  const anyVoiceHeld =
    heldVoiceCount > 0;
  let chunkPeak = 0;

  if (
    heldVoiceCount >
    outputEnvelopeHeldVoicePeak
  ) {
    outputEnvelopeHeldVoicePeak =
      heldVoiceCount;
  }

  for (const value of rmsValues) {
    if (value > chunkPeak) {
      chunkPeak = value;
    }
  }

  const treatAsSilentTail =
    !anyVoiceHeld &&
    chunkPeak <
      OUTPUT_ENVELOPE_SILENCE_FLOOR * 2;

  for (const value of rmsValues) {
    const nextValue =
      treatAsSilentTail ? 0 : value;
    outputEnvelopeHistory.push(nextValue);
  }

  while (
    outputEnvelopeHistory.length >
    OUTPUT_ENVELOPE_HISTORY_SIZE
  ) {
    outputEnvelopeHistory.shift();
  }
}

function attachMegaSynthVisualTap() {
  if (!megaSynth?.node) {
    return;
  }

  megaSynth.node.port.addEventListener(
    "message",
    (event) => {
      const message = event.data;

      if (
        message?.type !==
        "output-envelope"
      ) {
        return;
      }

      if (
        message.rmsValues instanceof
        Float32Array
      ) {
        appendOutputEnvelopePoints(
          message.rmsValues
        );
        return;
      }

      if (
        Array.isArray(
          message.rmsValues
        )
      ) {
        appendOutputEnvelopePoints(
          message.rmsValues
        );
      }
    }
  );
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

function syncControlsFromState() {
  for (const config of COMMON_PARAM_DEFS) {
    commonControls
      .get(config.id)
      ?.updateVisual(
        commonState[config.id]
      );
  }

  for (const operator of OPERATOR_NUMBERS) {
    const rowControls =
      operatorControls.get(operator);

    for (const config of OPERATOR_PARAM_DEFS) {
      rowControls
        ?.get(config.id)
        ?.updateVisual(
          operatorStates[operator][
            config.id
          ]
        );
    }
  }

  if (presetSelect) {
    presetSelect.value =
      currentPresetName;
  }
}

function applyPresetState(
  presetName
) {
  const preset =
    MEGADRIVE_FM_PRESETS[
      presetName
    ];

  if (!preset) {
    return;
  }

  currentPresetName =
    presetName;
  commonState.algorithm =
    preset.algorithm ?? 7;
  commonState.feedback =
    preset.feedback ?? 0;

  for (const operator of OPERATOR_NUMBERS) {
    const nextOperator =
      preset.operators?.[operator] ||
      {};

    operatorStates[operator] = {
      ...operatorStates[operator],
      ...nextOperator,
    };
  }

  syncControlsFromState();
  renderAlgorithmDiagram();
  drawEnvelopeGuide();

  if (synth) {
    applyPatchToVoices();
  }
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

function drawEnvelopeGuide() {
  drawEnvelopeGuideView({
    canvas: envelopeCanvas,
    context: envelopeContext,
    operatorNumbers:
      OPERATOR_NUMBERS,
    operatorStates,
    outputEnvelopeHistory,
    outputEnvelopeHeldVoicePeak,
    outputEnvelopeSilenceFloor:
      OUTPUT_ENVELOPE_SILENCE_FLOOR,
    outputEnvelopeBaseScale:
      OUTPUT_ENVELOPE_SLOW_SCALE,
  });
}

function updateVisuals() {
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

function buildCommonControls() {
  buildCommonControlsView({
    root: commonControlsRoot,
    defs: COMMON_PARAM_DEFS,
    state: commonState,
    controlsMap: commonControls,
    onChange: (id, nextValue) => {
      commonState[id] = nextValue;
      currentPresetName =
        "custom";
      if (presetSelect) {
        presetSelect.value =
          "custom";
      }
      renderAlgorithmDiagram();
      drawEnvelopeGuide();
      if (synth) {
        applyPatchToVoices();
      }
    },
  });
}

function buildCommonHeader() {
  buildHeader(
    commonHeaderRoot,
    COMMON_PARAM_DEFS
  );
}

function buildOperatorHeader() {
  buildHeader(
    operatorHeaderRoot,
    OPERATOR_PARAM_DEFS
  );
}

function buildOperatorControls() {
  buildOperatorControlsView({
    root: operatorControlsRoot,
    operatorNumbers:
      OPERATOR_NUMBERS,
    defs: OPERATOR_PARAM_DEFS,
    operatorStates,
    controlsMap: operatorControls,
    onChange: (
      operator,
      id,
      nextValue
    ) => {
      operatorStates[operator][id] =
        nextValue;
      currentPresetName =
        "custom";
      if (presetSelect) {
        presetSelect.value =
          "custom";
      }
      drawEnvelopeGuide();
      if (synth) {
        applyPatchToVoices();
      }
    },
  });
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

function clearInputState() {
  heldKeys.clear();
  activePointers.clear();
  resetVoiceState();
  outputEnvelopeHeldVoicePeak = 1;
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

  clearInputState();
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
  updateKeyboardAvailability();

  megaSynth =
    new MegaDriveSynth({
      audioContext,
      workletUrl:
        "../js/ym2612-worklet.js",
      ym2612WasmUrl:
        "../generated/ym2612_wasm.wasm",
    });

  await megaSynth.start();

  synth = megaSynth.fm;
  attachMegaSynthVisualTap();

  applyPatchToVoices();
  stopAllNotes();
  ensureVisualLoop();
  updateKeyboardAvailability();

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
    audioInitStarted = true;
    updateKeyboardAvailability();
    audioReadyPromise =
      initializeDirectAudio();
  }

  try {
    await audioReadyPromise;
  } catch (error) {
    audioReadyPromise = null;
    audioInitStarted = false;
    updateKeyboardAvailability();
    throw error;
  }

}

async function pressKey(key) {
  heldKeys.add(key);

  const entry =
    findLayoutEntry(
      KEY_LAYOUT,
      key
    );

  if (
    !entry ||
    activeKeys.has(key)
  ) {
    return;
  }

  if (
    audioReadyPromise &&
    !synth
  ) {
    setStatus(
      "Preparing audio..."
    );
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

function releasePointerKey(pointerId) {
  const key =
    activePointers.get(pointerId);

  if (!key) {
    return;
  }

  activePointers.delete(pointerId);
  releaseKey(key);
}

function buildKeyboard() {
  buildKeyboardView({
    root: keyboard,
    rowDefs: ROW_DEFS,
    layout: KEY_LAYOUT,
    onPointerDown: async (
      event,
      entry,
      button
    ) => {
      activePointers.set(
        event.pointerId,
        entry.key
      );
      button.setPointerCapture(
        event.pointerId
      );

      await pressKey(entry.key);
    },
    onPointerUp: (
      event,
      entry,
      button
    ) => {
      if (
        button.hasPointerCapture(
          event.pointerId
        )
      ) {
        button.releasePointerCapture(
          event.pointerId
        );
      }

      releasePointerKey(
        event.pointerId
      );
    },
    onPointerCancel: (
      event,
      entry,
      button
    ) => {
      if (
        button.hasPointerCapture(
          event.pointerId
        )
      ) {
        button.releasePointerCapture(
          event.pointerId
        );
      }

      releasePointerKey(
        event.pointerId
      );
    },
  });
}

function buildPresetSelect() {
  if (!presetSelect) {
    return;
  }

  presetSelect.innerHTML = "";

  const customOption =
    document.createElement("option");
  customOption.value = "custom";
  customOption.textContent =
    "Custom";
  presetSelect.appendChild(
    customOption
  );

  for (const presetName of MEGADRIVE_FM_PRESET_ORDER) {
    const preset =
      MEGADRIVE_FM_PRESETS[
        presetName
      ];

    const option =
      document.createElement("option");
    option.value = presetName;
    option.textContent =
      preset?.label || presetName;
    presetSelect.appendChild(option);
  }

  presetSelect.addEventListener(
    "change",
    () => {
      if (
        presetSelect.value ===
        "custom"
      ) {
        currentPresetName =
          "custom";
        return;
      }

      applyPresetState(
        presetSelect.value
      );
    }
  );

  presetSelect.value =
    currentPresetName;
}

window.addEventListener(
  "pointerup",
  (event) => {
    releasePointerKey(
      event.pointerId
    );
  }
);

window.addEventListener(
  "pointercancel",
  (event) => {
    releasePointerKey(
      event.pointerId
    );
  }
);

window.addEventListener(
  "keydown",
  (event) => {
    const key =
      event.key.toLowerCase();

    if (
      !hasLayoutKey(
        KEY_LAYOUT,
        key
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
      !hasLayoutKey(
        KEY_LAYOUT,
        key
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

buildCommonHeader();
buildCommonControls();
buildOperatorHeader();
buildOperatorControls();
buildPresetSelect();
buildKeyboard();
applyPresetState(currentPresetName);
updateKeyboardAvailability();

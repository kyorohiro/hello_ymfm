import {
  MEGADRIVE_FM_PRESETS,
  MEGADRIVE_FM_PRESET_ORDER,
  MegaSynthLooper,
} from "../js/megasynth.js";
import {
  createTfiFromPreset,
  parseTfi,
} from "../js/tfi.js";
import {
  buildKeyboard as buildKeyboardView,
  createFretboardLayout,
  createFretboardState,
  findLayoutEntry,
  hasLayoutKey,
  renderFretboardControls,
  setFretPosition,
  setInstrument,
  shiftStringWindowIndex,
  setStringWindowIndex,
  shiftFretPosition,
} from "./synth_keyboard.js";
import {
  drawEnvelopeGuide as drawEnvelopeGuideView,
} from "./synth_envelope.js";
import {
  buildCommonControls as buildCommonControlsView,
  buildHeader,
  buildOperatorControls as buildOperatorControlsView,
} from "./synth_controls.js";
import {
  attachOutputEnvelopeTap,
  chooseVoice,
  clearInputState as clearRuntimeInputState,
  createVoices,
  initializeDirectAudio as initializeDirectAudioRuntime,
  stopAllNotes as stopAllRuntimeNotes,
} from "./synth_runtime.js";
import {
  createSynthInputController,
} from "./synth_input.js";

const status = document.getElementById("status");
const keyboard = document.getElementById("keyboard");
const instrumentControlsRoot =
  document.getElementById(
    "instrumentControls"
  );
const positionControlsRoot =
  document.getElementById(
    "positionControls"
  );
const fretDisplayRoot =
  document.getElementById(
    "fretDisplay"
  );
const stringDisplayRoot =
  document.getElementById(
    "stringDisplay"
  );
const stringWindowControlsRoot =
  document.getElementById(
    "stringWindowControls"
  );
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
const tfiFileInput =
  document.getElementById("tfiFile");
const exportTfiButton =
  document.getElementById(
    "exportTfiButton"
  );
const tfiSummary =
  document.getElementById("tfiSummary");
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

const fretboardState =
  createFretboardState();
let fretboardLayout =
  createFretboardLayout({
    state: fretboardState,
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
let importedTfiName = "";

const operatorStates = {
  1: {
    dt: 0,
    multi: 1,
    tl: 127,
    rs: 0,
    ar: 31,
    d1r: 0,
    d2r: 0,
    sl: 0,
    rr: 15,
    ssg: 0,
  },
  2: {
    dt: 0,
    multi: 1,
    tl: 127,
    rs: 0,
    ar: 31,
    d1r: 0,
    d2r: 0,
    sl: 0,
    rr: 15,
    ssg: 0,
  },
  3: {
    dt: 0,
    multi: 1,
    tl: 127,
    rs: 0,
    ar: 31,
    d1r: 0,
    d2r: 0,
    sl: 0,
    rr: 15,
    ssg: 0,
  },
  4: {
    dt: 0,
    multi: 1,
    tl: 8,
    rs: 0,
    ar: 22,
    d1r: 6,
    d2r: 3,
    sl: 3,
    rr: 8,
    ssg: 0,
  },
};

const commonControls = new Map();
const operatorControls = new Map();
const envelopeDescription =
  document.getElementById(
    "envelopeDescription"
  );
const looperStartButton =
  document.getElementById(
    "looperStartButton"
  );
const looperRecordButton =
  document.getElementById(
    "looperRecordButton"
  );
const looperStopButton =
  document.getElementById(
    "looperStopButton"
  );
const looperClearButton =
  document.getElementById(
    "looperClearButton"
  );
const looperStateRoot =
  document.getElementById(
    "looperState"
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
let looper = null;

const voices =
  createVoices(VOICE_COUNT);

const activeKeys = new Map();
let inputController = null;

function setStatus(message) {
  status.textContent = message;
}

function updateLooperUi() {
  if (!looper) {
    if (looperStateRoot) {
      looperStateRoot.textContent =
        "Looper idle.";
    }
    looperRecordButton?.classList.remove(
      "is-selected"
    );
    return;
  }

  const state = looper.getState();
  const loopText =
    state.loopLength === null
      ? "loop not fixed"
      : `loop ${state.loopLength.toFixed(2)}s`;
  const recordText =
    state.recording
      ? "recording"
      : "not recording";

  if (looperStateRoot) {
    looperStateRoot.textContent =
      state.running
        ? `Looper running, ${recordText}, units ${state.unitCount}, ${loopText}.`
        : `Looper idle, units ${state.unitCount}, ${loopText}.`;
  }

  looperRecordButton?.classList.toggle(
    "is-selected",
    state.recording
  );
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

function rebuildFretboardLayout() {
  fretboardLayout =
    createFretboardLayout({
      state: fretboardState,
      referenceMidi:
        REFERENCE_MIDI,
      referenceBlock:
        REFERENCE_BLOCK,
      referenceFnum:
        REFERENCE_FNUM,
    });
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

function updateTfiSummary() {
  if (!tfiSummary) {
    return;
  }

  if (!importedTfiName) {
    tfiSummary.textContent =
      "No TFI loaded.";
    return;
  }

  tfiSummary.textContent =
    `TFI: ${importedTfiName} -> Custom`;
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
  importedTfiName = "";
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
  updateTfiSummary();
  renderAlgorithmDiagram();
  drawEnvelopeGuide();

  if (synth) {
    applyPatchToVoices();
  }
}

function applyImportedTfiPreset(
  fileName,
  preset
) {
  currentPresetName =
    "custom";
  importedTfiName = fileName;
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
  updateTfiSummary();
  renderAlgorithmDiagram();
  drawEnvelopeGuide();

  if (synth) {
    applyPatchToVoices();
  }
}

function buildCurrentPresetState() {
  const preset = {
    algorithm:
      commonState.algorithm,
    feedback:
      commonState.feedback,
    operators: {},
  };

  for (const operator of OPERATOR_NUMBERS) {
    preset.operators[operator] = {
      ...operatorStates[operator],
    };
  }

  return preset;
}

function createTfiExportName() {
  const baseName =
    importedTfiName
      ? importedTfiName.replace(/\.tfi$/i, "")
      : currentPresetName ===
          "custom"
        ? "ym2612-custom"
        : currentPresetName;

  return `${baseName}.tfi`;
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

function clearInputState() {
  clearRuntimeInputState({
    heldKeys,
    activePointers,
    voices,
    activeKeys,
    updateKeyboardVisuals,
    onCleared: () => {
      outputEnvelopeHeldVoicePeak = 1;
    },
  });
}

function renderFretboardUi() {
  renderFretboardControls({
    instrumentRoot:
      instrumentControlsRoot,
    positionRoot:
      positionControlsRoot,
    fretDisplayRoot,
    stringDisplayRoot,
    stringWindowRoot:
      stringWindowControlsRoot,
    state: fretboardState,
    onInstrumentChange: (
      instrument
    ) => {
      stopAllNotes();
      setInstrument(
        fretboardState,
        instrument
      );
      rebuildFretboardLayout();
      buildKeyboard();
      updateKeyboardVisuals();
      renderFretboardUi();
    },
    onPositionPresetSelect: (
      fret
    ) => {
      stopAllNotes();
      setFretPosition(
        fretboardState,
        fret
      );
      rebuildFretboardLayout();
      buildKeyboard();
      updateKeyboardVisuals();
      renderFretboardUi();
    },
    onStringWindowChange: (
      index
    ) => {
      stopAllNotes();
      setStringWindowIndex(
        fretboardState,
        index
      );
      rebuildFretboardLayout();
      buildKeyboard();
      updateKeyboardVisuals();
      renderFretboardUi();
    },
  });
}

function stopAllNotes() {
  stopAllRuntimeNotes({
    synth,
    voices,
    heldKeys,
    activePointers,
    activeKeys,
    updateKeyboardVisuals,
    onCleared: () => {
      outputEnvelopeHeldVoicePeak = 1;
    },
  });
}

function getPlayableSynth() {
  if (looper?.running) {
    return looper;
  }

  return synth;
}

async function ensureLooper() {
  await ensureAudioReady();

  if (!megaSynth) {
    return null;
  }

  if (!looper) {
    looper = new MegaSynthLooper({
      synth: megaSynth,
    });
  }

  updateLooperUi();
  return looper;
}

async function startLooper() {
  const currentLooper =
    await ensureLooper();

  if (!currentLooper) {
    return;
  }

  await currentLooper.start();
  updateLooperUi();
  setStatus(
    "Looper started. Press Space or Record to capture a unit."
  );
}

async function toggleLooperRecord() {
  const currentLooper =
    await ensureLooper();

  if (!currentLooper) {
    return;
  }

  if (!currentLooper.running) {
    await currentLooper.start();
  }

  const wasRecording =
    currentLooper.recording;
  const completedUnit =
    currentLooper.toggleRecord();

  updateLooperUi();

  if (wasRecording) {
    if (completedUnit) {
      setStatus(
        `Recorded ${completedUnit.id}.`
      );
    } else {
      setStatus(
        "Recording finished."
      );
    }
  } else {
    setStatus(
      "Recording new loop unit..."
    );
  }
}

function stopLooper() {
  if (!looper) {
    return;
  }

  looper.stop();
  updateLooperUi();
  stopAllNotes();
  setStatus("Looper stopped.");
}

function clearLooper() {
  if (!looper) {
    return;
  }

  looper.clear();
  updateLooperUi();
  stopAllNotes();
  setStatus("Looper cleared.");
}

async function initializeDirectAudio() {
  updateKeyboardAvailability();

  const runtime =
    await initializeDirectAudioRuntime({
      audioContext,
      workletUrl:
        "../js/ym2612-worklet.js",
      ym2612WasmUrl:
        "../generated/ym2612_wasm.wasm",
      setStatus,
    });

  megaSynth = runtime.megaSynth;
  synth = runtime.synth;
  looper = new MegaSynthLooper({
    synth: megaSynth,
  });

  attachOutputEnvelopeTap({
    megaSynth,
    onEnvelope:
      appendOutputEnvelopePoints,
  });

  applyPatchToVoices();
  stopAllNotes();
  ensureVisualLoop();
  updateKeyboardAvailability();

  setStatus(
    `Audio ready. YM2612 via MegaDriveSynth at ${audioContext.sampleRate} Hz.`
  );
  updateLooperUi();
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

function buildKeyboard() {
  buildKeyboardView({
    root: keyboard,
    rowDefs:
      fretboardLayout.rowDefs,
    layoutEntries:
      fretboardLayout.entries,
    onPointerDown: (
      event,
      entry,
      button
    ) =>
      inputController
        ?.handlePointerDown(
          event,
          entry,
          button
        ),
    onPointerUp: (
      event,
      entry,
      button
    ) =>
      inputController?.handlePointerUp(
        event,
        entry,
        button
      ),
    onPointerCancel: (
      event,
      entry,
      button
    ) =>
      inputController?.handlePointerCancel(
        event,
        entry,
        button
      ),
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

function buildTfiLoader() {
  if (!tfiFileInput) {
    return;
  }

  tfiFileInput.addEventListener(
    "change",
    async (event) => {
      const [file] =
        event.target.files || [];

      if (!file) {
        return;
      }

      try {
        const arrayBuffer =
          await file.arrayBuffer();
        const preset =
          parseTfi(
            new Uint8Array(
              arrayBuffer
            )
          );

        stopAllNotes();
        applyImportedTfiPreset(
          file.name,
          preset
        );
        setStatus(
          `Loaded TFI ${file.name}.`
        );
      } catch (error) {
        importedTfiName = "";
        updateTfiSummary();
        setStatus(
          `Failed to load TFI: ${error.message}`
        );
      } finally {
        tfiFileInput.value = "";
      }
    }
  );

  updateTfiSummary();
}

function buildTfiExporter() {
  if (!exportTfiButton) {
    return;
  }

  exportTfiButton.addEventListener(
    "click",
    () => {
      try {
        const preset =
          buildCurrentPresetState();
        const bytes =
          createTfiFromPreset(
            preset
          );
        const blob =
          new Blob([bytes], {
            type: "application/octet-stream",
          });
        const url =
          URL.createObjectURL(
            blob
          );
        const anchor =
          document.createElement(
            "a"
          );
        anchor.href = url;
        anchor.download =
          createTfiExportName();
        document.body.appendChild(
          anchor
        );
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(
          url
        );
        setStatus(
          `Exported ${anchor.download}.`
        );
      } catch (error) {
        setStatus(
          `Failed to export TFI: ${error.message}`
        );
      }
    }
  );
}

inputController =
  createSynthInputController({
    getKeyLayout: () =>
      fretboardLayout.entries,
    findLayoutEntry,
    hasLayoutKey,
    heldKeys,
    activePointers,
    activeKeys,
    voices,
    getAudioReadyPromise:
      () => audioReadyPromise,
    getSynth: () =>
      getPlayableSynth(),
    ensureAudioReady,
    chooseVoice,
    updateKeyboardVisuals,
    setStatus,
    stopAllNotes,
    onShiftFret: (delta) => {
      stopAllNotes();
      shiftFretPosition(
        fretboardState,
        delta
      );
      rebuildFretboardLayout();
      buildKeyboard();
      updateKeyboardVisuals();
      renderFretboardUi();
    },
    onShiftStringWindow: (
      delta
    ) => {
      stopAllNotes();
      shiftStringWindowIndex(
        fretboardState,
        delta
      );
      rebuildFretboardLayout();
      buildKeyboard();
      updateKeyboardVisuals();
      renderFretboardUi();
    },
    onToggleRecord: () => {
      void toggleLooperRecord();
    },
  });

inputController.attachWindowInput();

buildCommonHeader();
buildCommonControls();
buildOperatorHeader();
buildOperatorControls();
buildPresetSelect();
buildTfiLoader();
buildTfiExporter();
looperStartButton?.addEventListener(
  "click",
  () => {
    void startLooper();
  }
);
looperRecordButton?.addEventListener(
  "click",
  () => {
    void toggleLooperRecord();
  }
);
looperStopButton?.addEventListener(
  "click",
  () => {
    stopLooper();
  }
);
looperClearButton?.addEventListener(
  "click",
  () => {
    clearLooper();
  }
);
renderFretboardUi();
buildKeyboard();
applyPresetState(currentPresetName);
updateKeyboardAvailability();
updateLooperUi();

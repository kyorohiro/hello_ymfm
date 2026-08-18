import ym2612ModuleFactory from "./generated/ym2612_wasm.js";
import { createYm2612, YM2612_CLOCK } from "./ym2612.js";
import {
  YM2612DirectTransport,
  YM2612WorkletTransport,
  YM2612Synth,
} from "./ym2612synth.js";

const useWorklet = true;

const status = document.getElementById("status");
const keyboard = document.getElementById("keyboard");
const codeOutput = document.getElementById("codeOutput");
const heldKeys = new Set();

const CONTROL_IDS = [
  "dt",
  "multi",
  "tl",
  "ar",
  "d1r",
  "d2r",
  "sl",
  "rr",
  "algorithm",
  "feedback",
];

const controls = Object.fromEntries(
  CONTROL_IDS.map((id) => [id, document.getElementById(id)])
);

const values = Object.fromEntries(
  CONTROL_IDS.map((id) => [id, document.getElementById(`${id}Value`)])
);

const VOICE_COUNT = 4;

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

const patchState = {
  dt: 0,
  multi: 1,
  tl: 8,
  ar: 22,
  d1r: 6,
  d2r: 3,
  sl: 3,
  rr: 8,
  algorithm: 7,
  feedback: 0,
};

let audioContext = null;
let audioReadyPromise = null;
let ym2612 = null;
let synth = null;
let processor = null;
let active = false;

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

function syncControlLabels() {
  for (const id of CONTROL_IDS) {
    values[id].textContent = controls[id].value;
  }
}

function renderCodeSample() {
  codeOutput.textContent = [
    "const synth = new YM2612Synth({ transport });",
    `synth.setOperator(0, 4, { dt: ${patchState.dt}, multi: ${patchState.multi}, tl: ${patchState.tl}, ar: ${patchState.ar}, d1r: ${patchState.d1r}, d2r: ${patchState.d2r}, sl: ${patchState.sl}, rr: ${patchState.rr} });`,
    `synth.setAlgo(0, ${patchState.algorithm}, ${patchState.feedback});`,
    "synth.noteOn(0, block, fnum);",
    "synth.noteOff(0);",
  ].join("\n");
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
    synth.setOperator(channel, 1, {
      tl: 0x7f,
      multi: 1,
      ar: 31,
      d1r: 0,
      d2r: 0,
      sl: 0,
      rr: 15,
    });

    synth.setOperator(channel, 2, {
      tl: 0x7f,
      multi: 1,
      ar: 31,
      d1r: 0,
      d2r: 0,
      sl: 0,
      rr: 15,
    });

    synth.setOperator(channel, 3, {
      tl: 0x7f,
      multi: 1,
      ar: 31,
      d1r: 0,
      d2r: 0,
      sl: 0,
      rr: 15,
    });

    synth.setOperator(channel, 4, {
      dt: patchState.dt,
      multi: patchState.multi,
      tl: patchState.tl,
      ar: patchState.ar,
      d1r: patchState.d1r,
      d2r: patchState.d2r,
      sl: patchState.sl,
      rr: patchState.rr,
    });

    synth.setAlgo(
      channel,
      patchState.algorithm,
      patchState.feedback
    );

    synth.setPan(channel, true, true);
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
  setStatus("Loading YM2612 WASM...");

  ym2612 = await createYm2612(
    ym2612ModuleFactory
  );

  const transport =
    new YM2612DirectTransport(ym2612);

  synth = new YM2612Synth({
    transport,
  });

  processor =
    audioContext.createScriptProcessor(
      1024,
      0,
      2
    );

  processor.onaudioprocess = (event) => {
    const leftOut =
      event.outputBuffer.getChannelData(0);

    const rightOut =
      event.outputBuffer.getChannelData(1);

    if (!active || !ym2612) {
      leftOut.fill(0);
      rightOut.fill(0);
      return;
    }

    const { left, right } =
      ym2612.generateStereo(leftOut.length);

    leftOut.set(left);
    rightOut.set(right);
  };

  processor.connect(
    audioContext.destination
  );

  applyPatchToVoices();

  const sampleRate =
    ym2612.sampleRate(YM2612_CLOCK);

  setStatus(
    `Audio ready. YM2612 at ${sampleRate} Hz. Direct`
  );
}

function waitForWorkletReady(node) {
  return new Promise((resolve, reject) => {
    const handleMessage = (event) => {
      const message = event.data;

      if (message?.type === "ready") {
        node.port.removeEventListener(
          "message",
          handleMessage
        );

        resolve(message);
        return;
      }

      if (message?.type === "error") {
        node.port.removeEventListener(
          "message",
          handleMessage
        );

        reject(
          new Error(
            message.message ||
            "YM2612 AudioWorklet initialization failed"
          )
        );
      }
    };

    node.port.addEventListener(
      "message",
      handleMessage
    );

    node.port.start();
  });
}

async function loadYm2612WasmBinary() {
  const response = await fetch(
    "./generated/ym2612_wasm.wasm"
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load YM2612 WASM: ${response.status} ${response.statusText}`
    );
  }

  return response.arrayBuffer();
}

async function initializeWorkletAudio() {
  setStatus(
    "Loading YM2612 AudioWorklet..."
  );

  /*
   * Load the AudioWorklet JavaScript module first.
   *
   * The Emscripten-generated module cannot load its
   * .wasm file directly from AudioWorkletGlobalScope,
   * so the WASM binary is fetched on the main thread
   * and transferred to the worklet explicitly.
   */
  await audioContext.audioWorklet.addModule(
    "./ym2612-worklet.js"
  );

  const wasmBinary =
    await loadYm2612WasmBinary();

  processor = new AudioWorkletNode(
    audioContext,
    "ym2612-processor",
    {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    }
  );

  processor.connect(
    audioContext.destination
  );

  const ready =
    waitForWorkletReady(processor);

  /*
   * Transfer ownership of the ArrayBuffer to the
   * AudioWorklet instead of copying it.
   */
  processor.port.postMessage(
    {
      type: "initialize",
      wasmBinary,
    },
    [
      wasmBinary,
    ]
  );

  const result = await ready;

  const transport =
    new YM2612WorkletTransport(
      processor
    );

  synth = new YM2612Synth({
    transport,
  });

  applyPatchToVoices();

  if (result.sampleRate) {
    setStatus(
      `Audio ready. YM2612 at ${result.sampleRate} Hz. AudioWorklet`
    );
  } else {
    setStatus(
      "Audio ready. YM2612 AudioWorklet."
    );
  }
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
      useWorklet
        ? initializeWorkletAudio()
        : initializeDirectAudio();
  }

  try {
    await audioReadyPromise;
  } catch (error) {
    audioReadyPromise = null;
    throw error;
  }

  active = true;
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

for (const id of CONTROL_IDS) {
  controls[id].addEventListener(
    "input",
    () => {
      patchState[id] =
        Number(
          controls[id].value
        );

      syncControlLabels();
      renderCodeSample();

      if (synth) {
        applyPatchToVoices();
      }
    }
  );
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

buildKeyboard();
syncControlLabels();
renderCodeSample();
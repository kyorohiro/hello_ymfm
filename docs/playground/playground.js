import {
  MegaDriveSynth,
  MEGADRIVE_FM_PRESETS,
} from "../js/megasynth.js";
import {
  createPitchFromMidi,
} from "../synth/synth_keyboard.js";

const REFERENCE_MIDI = 62;
const REFERENCE_BLOCK = 4;
const REFERENCE_FNUM = 553;
const NOTE_TO_SEMITONE = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};
const SCALE_INTERVALS = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};
const EXAMPLES = {
  single: `fm.setPreset(0, MEGADRIVE_FM_PRESETS["one-op-basic"]);
await play("C4", { channel: 0, duration: 0.35 });
await sleep(0.12);
await play("E4", { channel: 0, duration: 0.35 });
await sleep(0.12);
await play("G4", { channel: 0, duration: 0.5 });
`,
  random: `fm.setPreset(0, MEGADRIVE_FM_PRESETS["2op-bell"]);
const notes = scale("Eb2", "majorPentatonic", 2);

for (let step = 0; step < 16; step += 1) {
  await play(choose(notes), {
    channel: 0,
    duration: 0.12 + rand() * 0.15,
  });
  await sleep(0.08);
}
`,
  "fm-direct": `fm.reset();
fm.setPreset(0, MEGADRIVE_FM_PRESETS["one-op-basic"]);
fm.setOperator(0, 4, {
  multi: 3,
  tl: 10,
  ar: 24,
  d1r: 8,
  d2r: 5,
  sl: 5,
  rr: 8,
});
fm.setAlgo(0, 7, 0);
fm.setPan(0, true, true);

for (const note of ["C3", "G3", "Bb3", "C4"]) {
  await play(note, { channel: 0, duration: 0.22 });
  await sleep(0.06);
}
`,
};

const runButton =
  document.getElementById("runButton");
const stopButton =
  document.getElementById("stopButton");
const loadExampleButton =
  document.getElementById(
    "loadExampleButton"
  );
const exampleSelect =
  document.getElementById(
    "exampleSelect"
  );
const editor =
  document.getElementById("editor");
const status =
  document.getElementById("status");
const runtimeState =
  document.getElementById(
    "runtimeState"
  );
const consoleOutput =
  document.getElementById(
    "consoleOutput"
  );

const megaDrive =
  new MegaDriveSynth({
    workletUrl:
      "../js/ym2612-worklet.js",
    ym2612WasmUrl:
      "../generated/ym2612_wasm.wasm",
  });

let synth = null;
let currentRunToken = 0;
let activeNotes = new Set();

function setStatus(message) {
  status.textContent = message;
}

function setRuntimeState(message) {
  runtimeState.textContent = message;
}

function logLine(message) {
  consoleOutput.textContent += `${message}\n`;
  consoleOutput.scrollTop =
    consoleOutput.scrollHeight;
}

function clearConsole() {
  consoleOutput.textContent = "";
}

async function ensureReady() {
  if (synth) {
    await megaDrive.resume();
    setRuntimeState("Audio ready");
    return;
  }

  setStatus(
    "Loading Mega Drive audio..."
  );
  setRuntimeState("Preparing...");
  await megaDrive.start();
  synth = megaDrive.fm;
  synth.setPreset(
    0,
    MEGADRIVE_FM_PRESETS[
      "one-op-basic"
    ]
  );
  setRuntimeState("Audio ready");
  setStatus("Audio ready.");
}

function stopAll() {
  if (!synth) {
    return;
  }

  for (let channel = 0; channel < 6; channel += 1) {
    synth.noteOff(channel);
  }
  activeNotes.clear();
}

function parseNoteName(noteName) {
  const match =
    /^([A-G](?:#|b)?)(-?\d+)$/.exec(
      String(noteName).trim()
    );

  if (!match) {
    throw new Error(
      `Unsupported note name: ${noteName}`
    );
  }

  const [, note, octaveText] =
    match;
  const semitone =
    NOTE_TO_SEMITONE[note];

  if (semitone === undefined) {
    throw new Error(
      `Unsupported note: ${note}`
    );
  }

  const octave =
    Number(octaveText);
  return (octave + 1) * 12 + semitone;
}

function toPitch(noteOrMidi) {
  const midi =
    typeof noteOrMidi === "number"
      ? noteOrMidi
      : parseNoteName(noteOrMidi);

  return createPitchFromMidi(midi, {
    referenceMidi:
      REFERENCE_MIDI,
    referenceBlock:
      REFERENCE_BLOCK,
    referenceFnum:
      REFERENCE_FNUM,
  });
}

async function sleep(seconds, runToken = currentRunToken) {
  const waitMs =
    Math.max(0, seconds * 1000);

  await new Promise((resolve) => {
    window.setTimeout(resolve, waitMs);
  });

  if (runToken !== currentRunToken) {
    throw new Error("Run stopped");
  }
}

async function play(
  note,
  options = {}
) {
  if (!synth) {
    throw new Error(
      "Audio is not ready yet"
    );
  }

  const channel =
    options.channel ?? 0;
  const duration =
    options.duration ?? 0.2;
  const presetName =
    options.preset ?? null;

  if (presetName) {
    const preset =
      MEGADRIVE_FM_PRESETS[
        presetName
      ];
    if (!preset) {
      throw new Error(
        `Unknown preset: ${presetName}`
      );
    }
    synth.setPreset(
      channel,
      preset
    );
  }

  const pitch = toPitch(note);
  synth.noteOn(
    channel,
    pitch.block,
    pitch.fnum
  );
  activeNotes.add(channel);
  logLine(
    `play ${String(note)} ch=${channel + 1}`
  );

  await sleep(duration);

  synth.noteOff(channel);
  activeNotes.delete(channel);
}

function scale(
  root,
  name,
  octaves = 1
) {
  const intervals =
    SCALE_INTERVALS[name];

  if (!intervals) {
    throw new Error(
      `Unknown scale: ${name}`
    );
  }

  const rootMidi =
    parseNoteName(root);
  const notes = [];

  for (
    let octave = 0;
    octave < octaves;
    octave += 1
  ) {
    for (const interval of intervals) {
      notes.push(
        midiToNoteName(
          rootMidi +
            octave * 12 +
            interval
        )
      );
    }
  }

  return notes;
}

function choose(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(
      "choose() requires a non-empty array"
    );
  }

  return values[
    Math.floor(Math.random() * values.length)
  ];
}

function rand() {
  return Math.random();
}

function randInt(min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return (
    Math.floor(
      Math.random() *
        (high - low + 1)
    ) + low
  );
}

function midiToNoteName(midi) {
  const names = [
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
  const note =
    names[
      ((midi % 12) + 12) % 12
    ];
  const octave =
    Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

async function runCode() {
  currentRunToken += 1;
  const runToken =
    currentRunToken;
  runButton.disabled = true;
  clearConsole();

  try {
    await ensureReady();
    stopAll();
    setStatus("Running...");
    setRuntimeState("Running");

    const api = {
      fm: synth,
      play: (note, options) =>
        play(note, options),
      sleep: (seconds) =>
        sleep(seconds, runToken),
      stopAll,
      choose,
      rand,
      randInt,
      scale,
      MEGADRIVE_FM_PRESETS,
      log: (...args) => {
        logLine(
          args
            .map((value) =>
              typeof value === "string"
                ? value
                : JSON.stringify(value)
            )
            .join(" ")
        );
      },
    };

    const AsyncFunction =
      Object.getPrototypeOf(
        async function () {}
      ).constructor;
    const userFunction =
      new AsyncFunction(
        ...Object.keys(api),
        `"use strict";\n${editor.value}`
      );

    await userFunction(
      ...Object.values(api)
    );

    if (runToken === currentRunToken) {
      setStatus("Done.");
      setRuntimeState("Audio ready");
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Run stopped"
    ) {
      setStatus("Stopped.");
      setRuntimeState("Audio ready");
    } else {
      console.error(error);
      setStatus(
        `Error: ${error.message}`
      );
      setRuntimeState("Error");
      logLine(
        error?.stack ?? String(error)
      );
    }
  } finally {
    if (runToken === currentRunToken) {
      runButton.disabled = false;
    }
  }
}

function stopRun() {
  currentRunToken += 1;
  stopAll();
  megaDrive.stopRecordingPlayback?.();
  setStatus("Stopped.");
  setRuntimeState("Audio ready");
  runButton.disabled = false;
}

function loadExample() {
  const nextCode =
    EXAMPLES[
      exampleSelect.value
    ] ?? EXAMPLES.single;
  editor.value = nextCode;
  setStatus(
    `Loaded example: ${exampleSelect.value}`
  );
}

runButton.addEventListener(
  "click",
  () => {
    void runCode();
  }
);

stopButton.addEventListener(
  "click",
  () => {
    stopRun();
  }
);

loadExampleButton.addEventListener(
  "click",
  () => {
    loadExample();
  }
);

editor.value = EXAMPLES.single;
clearConsole();
setRuntimeState("Audio idle");

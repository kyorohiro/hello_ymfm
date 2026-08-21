export const TFI_FILE_SIZE = 42;

// TFI stores operators in YM2612 physical slot order:
// S1, S3, S2, S4
//
// YM2612Synth public API uses logical operators:
// O1, O2, O3, O4
//
// This table converts one TFI operator block index into the synth's
// public logical operator number.
export const TFI_OPERATOR_FILE_ORDER = [1, 3, 2, 4];

const TFI_OPERATOR_SIZE = 10;
const TFI_OPERATOR_DATA_START = 2;

export function parseTfi(data) {
  const bytes = toTfiBytes(data);

  const preset = {
    algorithm: validateRange("algorithm", bytes[0], 0, 7),
    feedback: validateRange("feedback", bytes[1], 0, 7),
    operators: {},
  };

  for (let blockIndex = 0; blockIndex < TFI_OPERATOR_FILE_ORDER.length; blockIndex += 1) {
    const logicalOperator = TFI_OPERATOR_FILE_ORDER[blockIndex];
    const base = TFI_OPERATOR_DATA_START + blockIndex * TFI_OPERATOR_SIZE;

    preset.operators[logicalOperator] = {
      multi: validateRange("multi", bytes[base + 0], 0, 15),
      dt: tfiDetuneToYm2612Detune(bytes[base + 1]),
      tl: validateRange("tl", bytes[base + 2], 0, 127),
      rs: validateRange("rs", bytes[base + 3], 0, 3),
      ar: validateRange("ar", bytes[base + 4], 0, 31),
      d1r: validateRange("d1r", bytes[base + 5], 0, 31),
      d2r: validateRange("d2r", bytes[base + 6], 0, 31),
      rr: validateRange("rr", bytes[base + 7], 0, 15),
      sl: validateRange("sl", bytes[base + 8], 0, 15),
      ssg: validateRange("ssg", bytes[base + 9], 0, 15),
    };
  }

  return preset;
}

export function applyTfiToSynth(synth, channel, data) {
  if (!synth || typeof synth.setPreset !== "function") {
    throw new Error("applyTfiToSynth requires a synth with setPreset(channel, preset)");
  }

  const preset = parseTfi(data);
  synth.setPreset(channel, preset);
  return preset;
}

export function createTfiFromPreset(preset) {
  if (!preset || typeof preset !== "object") {
    throw new Error("preset must be an object");
  }

  const bytes = new Uint8Array(TFI_FILE_SIZE);
  bytes[0] = validateRange("algorithm", preset.algorithm ?? 7, 0, 7);
  bytes[1] = validateRange("feedback", preset.feedback ?? 0, 0, 7);

  for (let blockIndex = 0; blockIndex < TFI_OPERATOR_FILE_ORDER.length; blockIndex += 1) {
    const logicalOperator = TFI_OPERATOR_FILE_ORDER[blockIndex];
    const operator = preset.operators?.[logicalOperator] || {};
    const base = TFI_OPERATOR_DATA_START + blockIndex * TFI_OPERATOR_SIZE;

    bytes[base + 0] = validateRange("multi", operator.multi ?? 1, 0, 15);
    bytes[base + 1] = ym2612DetuneToTfiDetune(operator.dt ?? 0);
    bytes[base + 2] = validateRange("tl", operator.tl ?? 127, 0, 127);
    bytes[base + 3] = validateRange("rs", operator.rs ?? 0, 0, 3);
    bytes[base + 4] = validateRange("ar", operator.ar ?? 0, 0, 31);
    bytes[base + 5] = validateRange("d1r", operator.d1r ?? 0, 0, 31);
    bytes[base + 6] = validateRange(
      "d2r",
      operator.sr ?? operator.d2r ?? 0,
      0,
      31
    );
    bytes[base + 7] = validateRange("rr", operator.rr ?? 15, 0, 15);
    bytes[base + 8] = validateRange("sl", operator.sl ?? 0, 0, 15);
    bytes[base + 9] = validateRange("ssg", operator.ssg ?? 0, 0, 15);
  }

  return bytes;
}

export function tfiDetuneToYm2612Detune(tfiDetune) {
  const detune = validateRange("detune", tfiDetune, 0, 6);
  const table = [7, 6, 5, 0, 1, 2, 3];
  return table[detune];
}

export function ym2612DetuneToTfiDetune(ym2612Detune) {
  const detune = validateRange("dt", ym2612Detune, 0, 7);
  const table = [3, 4, 5, 6, 3, 2, 1, 0];
  return table[detune];
}

function toTfiBytes(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length !== TFI_FILE_SIZE) {
    throw new Error(`TFI data must be exactly ${TFI_FILE_SIZE} bytes`);
  }
  return bytes;
}

function validateRange(name, value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer in range ${min}..${max}`);
  }
  return value;
}

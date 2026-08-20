export const MEGADRIVE_FM_PRESETS = {
  "one-op-basic": {
    label: "1OP Basic",
    algorithm: 7,
    feedback: 0,
    operators: {
      1: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      2: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      3: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      4: { dt: 0, multi: 1, tl: 8, ar: 22, d1r: 6, d2r: 3, sl: 3, rr: 8 },
    },
  },
  "one-op-flute": {
    label: "1OP Flute-ish",
    algorithm: 7,
    feedback: 0,
    operators: {
      1: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      2: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      3: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      4: { dt: 0, multi: 1, tl: 18, ar: 18, d1r: 5, d2r: 2, sl: 2, rr: 6 },
    },
  },
  "two-op-bell": {
    label: "2OP Bell",
    algorithm: 4,
    feedback: 1,
    operators: {
      1: { dt: 0, multi: 6, tl: 10, ar: 31, d1r: 20, d2r: 8, sl: 7, rr: 7 },
      2: { dt: 0, multi: 1, tl: 16, ar: 28, d1r: 12, d2r: 4, sl: 5, rr: 6 },
      3: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      4: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
    },
  },
  "two-op-organ": {
    label: "2OP Organ-ish",
    algorithm: 4,
    feedback: 0,
    operators: {
      1: { dt: 0, multi: 2, tl: 20, ar: 31, d1r: 4, d2r: 2, sl: 2, rr: 6 },
      2: { dt: 0, multi: 1, tl: 4, ar: 31, d1r: 4, d2r: 2, sl: 2, rr: 6 },
      3: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      4: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
    },
  },
  "four-op-brass": {
    label: "4OP Brass-ish",
    algorithm: 3,
    feedback: 2,
    operators: {
      1: { dt: 0, multi: 2, tl: 18, ar: 28, d1r: 9, d2r: 4, sl: 4, rr: 7 },
      2: { dt: 0, multi: 1, tl: 12, ar: 26, d1r: 8, d2r: 3, sl: 4, rr: 7 },
      3: { dt: 0, multi: 3, tl: 22, ar: 24, d1r: 10, d2r: 5, sl: 5, rr: 7 },
      4: { dt: 0, multi: 1, tl: 6, ar: 30, d1r: 7, d2r: 3, sl: 3, rr: 6 },
    },
  },
  "four-op-pad": {
    label: "4OP Soft Pad",
    algorithm: 5,
    feedback: 1,
    operators: {
      1: { dt: 0, multi: 1, tl: 28, ar: 18, d1r: 5, d2r: 2, sl: 4, rr: 5 },
      2: { dt: 0, multi: 1, tl: 18, ar: 20, d1r: 6, d2r: 2, sl: 4, rr: 5 },
      3: { dt: 1, multi: 2, tl: 24, ar: 18, d1r: 6, d2r: 3, sl: 5, rr: 5 },
      4: { dt: 0, multi: 1, tl: 10, ar: 22, d1r: 6, d2r: 3, sl: 4, rr: 5 },
    },
  },
  coin: {
    label: "SFX Coin",
    algorithm: 4,
    feedback: 1,
    operators: {
      1: { dt: 0, multi: 4, tl: 14, ar: 31, d1r: 24, d2r: 14, sl: 9, rr: 8 },
      2: { dt: 0, multi: 1, tl: 2, ar: 31, d1r: 20, d2r: 8, sl: 6, rr: 6 },
      3: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      4: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
    },
  },
  laser: {
    label: "SFX Laser",
    algorithm: 4,
    feedback: 4,
    operators: {
      1: { dt: 1, multi: 2, tl: 5, ar: 31, d1r: 20, d2r: 10, sl: 6, rr: 7 },
      2: { dt: 0, multi: 1, tl: 2, ar: 28, d1r: 16, d2r: 7, sl: 4, rr: 6 },
      3: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      4: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
    },
  },
  hit: {
    label: "SFX Hit",
    algorithm: 4,
    feedback: 2,
    operators: {
      1: { dt: 0, multi: 5, tl: 10, ar: 31, d1r: 27, d2r: 18, sl: 11, rr: 7 },
      2: { dt: 0, multi: 1, tl: 4, ar: 29, d1r: 22, d2r: 9, sl: 7, rr: 6 },
      3: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      4: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
    },
  },
  burst: {
    label: "SFX Rough Burst",
    algorithm: 4,
    feedback: 6,
    operators: {
      1: { dt: 2, multi: 1, tl: 2, ar: 31, d1r: 31, d2r: 24, sl: 13, rr: 10 },
      2: { dt: 1, multi: 1, tl: 5, ar: 26, d1r: 24, d2r: 14, sl: 10, rr: 9 },
      3: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
      4: { dt: 0, multi: 1, tl: 127, ar: 31, d1r: 0, d2r: 0, sl: 0, rr: 15 },
    },
  },
};

export const MEGADRIVE_FM_PRESET_ORDER = [
  "one-op-basic",
  "one-op-flute",
  "two-op-bell",
  "two-op-organ",
  "four-op-brass",
  "four-op-pad",
  "coin",
  "laser",
  "hit",
  "burst",
];

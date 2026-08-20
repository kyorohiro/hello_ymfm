import {
  YM2612Synth,
  YM2612WorkletTransport,
} from "./ym2612synth.js";

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

/**
 * Browser-side Mega Drive synth runtime.
 *
 * This class hides:
 *
 * - AudioContext
 * - AudioWorkletNode
 * - YM2612 WASM loading
 * - AudioWorklet initialization
 *
 * The YM2612 control API itself is exposed through `fm`.
 *
 * Future:
 *
 * - Sega PSG
 * - DAC helpers
 * - sample-timed scheduling
 * - VGM playback
 */
export class MegaDriveSynth {
  constructor(options = {}) {
    this.workletUrl =
      options.workletUrl ?? "./ym2612-worklet.js";

    this.ym2612WasmUrl =
      options.ym2612WasmUrl ?? "./generated/ym2612_wasm.wasm";

    this.audioContext =
      options.audioContext ?? null;

    this.outputNode =
      options.outputNode ?? null;

    this.node = null;

    /**
     * YM2612Synth instance.
     *
     * Available after start().
     */
    this.fm = null;

    this.readyPromise = null;
    this.state = "idle";
  }

  /**
   * Initialize and start the browser audio runtime.
   *
   * This should normally be called from a user gesture such as
   * a click, pointerdown, or keydown event.
   */
  async start() {
    if (this.readyPromise) {
      await this.readyPromise;
      await this.resume();
      return this;
    }

    this.state = "starting";
    this.readyPromise = this.#initialize();

    try {
      await this.readyPromise;
    } catch (error) {
      this.readyPromise = null;
      this.state = "error";
      throw error;
    }

    await this.resume();
    this.state = "ready";

    return this;
  }

  async resume() {
    if (
      this.audioContext &&
      this.audioContext.state !== "running"
    ) {
      await this.audioContext.resume();
    }
  }

  async suspend() {
    if (
      this.audioContext &&
      this.audioContext.state === "running"
    ) {
      await this.audioContext.suspend();
    }
  }

  reset() {
    this.fm?.reset();
  }

  async close() {
    if (this.node) {
      this.node.disconnect();
      this.node = null;
    }

    this.fm = null;
    this.readyPromise = null;
    this.state = "closed";

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  isReady() {
    return this.state === "ready" && !!this.fm;
  }

  isStarting() {
    return this.state === "starting";
  }

  async #initialize() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state !== "running") {
      await this.audioContext.resume();
    }

    await this.audioContext.audioWorklet.addModule(
      this.workletUrl
    );

    const response = await fetch(
      this.ym2612WasmUrl
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load YM2612 WASM: ${response.status} ${response.statusText}`
      );
    }

    const wasmBinary =
      await response.arrayBuffer();

    this.node =
      new AudioWorkletNode(
        this.audioContext,
        "ym2612-processor",
        {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        }
      );

    this.node.connect(
      this.outputNode ??
      this.audioContext.destination
    );

    const workletReady =
      this.#waitForWorkletReady();

    this.node.port.postMessage(
      {
        type: "initialize",
        wasmBinary,
      },
      [
        wasmBinary,
      ]
    );

    await workletReady;

    const transport =
      new YM2612WorkletTransport(
        this.node
      );

    this.fm =
      new YM2612Synth({
        transport,
      });
  }

  #waitForWorkletReady() {
    return new Promise((resolve, reject) => {
      const handleMessage = (event) => {
        const message = event.data;

        if (message?.type === "ready") {
          this.node.port.removeEventListener(
            "message",
            handleMessage
          );

          resolve(message);
          return;
        }

        if (message?.type === "error") {
          this.node.port.removeEventListener(
            "message",
            handleMessage
          );

          reject(
            new Error(
              message.message ||
              "MegaDriveSynth AudioWorklet initialization failed"
            )
          );
        }
      };

      this.node.port.addEventListener(
        "message",
        handleMessage
      );

      this.node.port.start();
    });
  }
}

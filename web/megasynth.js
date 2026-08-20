import {
  YM2612Synth,
  YM2612WorkletTransport,
} from "./ym2612synth.js";
export {
  MEGADRIVE_FM_PRESETS,
  MEGADRIVE_FM_PRESET_ORDER,
} from "./megadrive-fm-presets.js";

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
    this.ownsAudioContext =
      !options.audioContext;

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

    if (
      this.audioContext &&
      this.ownsAudioContext
    ) {
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

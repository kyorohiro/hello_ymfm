import ym2612ModuleFactory from "../generated/ym2612_wasm.js";
import { createYm2612 } from "./ym2612.js";

class YM2612Processor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.ym2612 = null;
    this.pendingCommands = [];

    this.port.onmessage = (event) => {
      const command = event.data;

      if (command.type === "initialize") {
        void this.init(command.wasmBinary);
        return;
      }

      if (!this.ym2612) {
        this.pendingCommands.push(command);
        return;
      }

      this.applyCommand(command);
    };
  }

  async init(wasmBinary) {
    try {
      this.ym2612 = await createYm2612(
        ym2612ModuleFactory,
        {
          wasmBinary: new Uint8Array(wasmBinary),
        }
      );

      for (const command of this.pendingCommands) {
        this.applyCommand(command);
      }

      this.pendingCommands.length = 0;

      this.port.postMessage({
        type: "ready",
      });
    } catch (error) {
      this.port.postMessage({
        type: "error",
        message: error instanceof Error
          ? error.message
          : String(error),
      });
    }
  }

  applyCommand(command) {
    if (command.type === "write") {
      this.ym2612.writeRegister(
        command.register,
        command.value,
        command.port
      );
      return;
    }

    if (command.type === "reset") {
      this.ym2612.reset();
    }
  }

  process(inputs, outputs) {
    const output = outputs[0];

    if (!output || output.length < 2) {
      return true;
    }

    const leftOut = output[0];
    const rightOut = output[1];

    if (!this.ym2612) {
      leftOut.fill(0);
      rightOut.fill(0);
      return true;
    }

    const { left, right } =
      this.ym2612.generateStereo(leftOut.length);

    leftOut.set(left);
    rightOut.set(right);

    return true;
  }
}

registerProcessor("ym2612-processor", YM2612Processor);

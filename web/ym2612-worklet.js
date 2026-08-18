import ym2612ModuleFactory from "./generated/ym2612_wasm.js";
import { createYm2612 } from "./ym2612.js";

class YM2612Processor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.ym2612 = null;

    this.port.onmessage = (event) => {
      const command = event.data;

      if (!this.ym2612) {
        return;
      }

      if (command.type === "write") {
        this.ym2612.writeRegister(
          command.register,
          command.value,
          command.port
        );
      }

      if (command.type === "reset") {
        this.ym2612.reset();
      }
    };

    this.init();
  }

  async init() {
    this.ym2612 = await createYm2612(ym2612ModuleFactory);
  }

  process(inputs, outputs) {
    const output = outputs[0];
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

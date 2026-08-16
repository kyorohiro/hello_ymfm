export const YM2612_CLOCK = 7670454;

export class Ym2612 {
  constructor(module, handle, api) {
    this.module = module;
    this.handle = handle;
    this.api = api;
    this.leftPtr = 0;
    this.rightPtr = 0;
    this.envPtrs = [0, 0, 0, 0];
    this.bufferFrames = 0;
  }

  static async create(options = {}) {
    const { moduleFactory, moduleOptions } = options;
    if (!moduleFactory) {
      throw new Error("moduleFactory is required");
    }

    const module = await moduleFactory(moduleOptions || {});
    const api = {
      create: module.cwrap("ym2612_create", "number", []),
      destroy: module.cwrap("ym2612_destroy", null, ["number"]),
      reset: module.cwrap("ym2612_reset", null, ["number"]),
      write: module.cwrap("ym2612_write", null, ["number", "number", "number"]),
      sampleRate: module.cwrap("ym2612_sample_rate", "number", ["number", "number"]),
      generate: module.cwrap("ym2612_generate", null, ["number", "number", "number", "number"]),
      generateWithInternalEnvelope: module.cwrap(
        "ym2612_generate_with_internal_envelope",
        null,
        ["number", "number", "number", "number", "number", "number", "number", "number", "number"]
      ),
    };

    const handle = api.create();
    return new Ym2612(module, handle, api);
  }

  dispose() {
    if (this.leftPtr) {
      this.module._free(this.leftPtr);
      this.leftPtr = 0;
    }
    if (this.rightPtr) {
      this.module._free(this.rightPtr);
      this.rightPtr = 0;
    }
    this.envPtrs.forEach((ptr, index) => {
      if (ptr) {
        this.module._free(ptr);
        this.envPtrs[index] = 0;
      }
    });
    if (this.handle) {
      this.api.destroy(this.handle);
      this.handle = 0;
    }
  }

  reset() {
    this.api.reset(this.handle);
  }

  write(offset, data) {
    this.api.write(this.handle, offset, data);
  }

  writeRegister(register, value, port = 0) {
    const addressOffset = port === 0 ? 0 : 2;
    const dataOffset = addressOffset + 1;
    this.write(addressOffset, register);
    this.write(dataOffset, value);
  }

  sampleRate(clock = YM2612_CLOCK) {
    return this.api.sampleRate(this.handle, clock);
  }

  generateStereo(frames) {
    this.#ensureBuffers(frames);
    this.api.generate(this.handle, this.leftPtr, this.rightPtr, frames);

    const leftStart = this.leftPtr >> 2;
    const rightStart = this.rightPtr >> 2;
    const left = new Float32Array(frames);
    const right = new Float32Array(frames);
    left.set(this.module.HEAPF32.subarray(leftStart, leftStart + frames));
    right.set(this.module.HEAPF32.subarray(rightStart, rightStart + frames));
    return { left, right };
  }

  generateStereoWithInternalEnvelope(frames, channel = 0) {
    this.#ensureBuffers(frames);
    this.api.generateWithInternalEnvelope(
      this.handle,
      this.leftPtr,
      this.rightPtr,
      this.envPtrs[0],
      this.envPtrs[1],
      this.envPtrs[2],
      this.envPtrs[3],
      frames,
      channel
    );

    const leftStart = this.leftPtr >> 2;
    const rightStart = this.rightPtr >> 2;
    const left = new Float32Array(frames);
    const right = new Float32Array(frames);
    left.set(this.module.HEAPF32.subarray(leftStart, leftStart + frames));
    right.set(this.module.HEAPF32.subarray(rightStart, rightStart + frames));

    const envelopes = this.envPtrs.map((ptr) => {
      const start = ptr >> 2;
      const values = new Float32Array(frames);
      values.set(this.module.HEAPF32.subarray(start, start + frames));
      return values;
    });

    return { left, right, envelopes };
  }

  #ensureBuffers(frames) {
    if (frames <= this.bufferFrames) {
      return;
    }

    if (this.leftPtr) {
      this.module._free(this.leftPtr);
    }
    if (this.rightPtr) {
      this.module._free(this.rightPtr);
    }
    this.envPtrs.forEach((ptr) => {
      if (ptr) {
        this.module._free(ptr);
      }
    });

    const byteLength = frames * Float32Array.BYTES_PER_ELEMENT;
    this.leftPtr = this.module._malloc(byteLength);
    this.rightPtr = this.module._malloc(byteLength);
    this.envPtrs = this.envPtrs.map(() => this.module._malloc(byteLength));
    this.bufferFrames = frames;
  }
}

export async function createYm2612(moduleFactory, moduleOptions) {
  return Ym2612.create({ moduleFactory, moduleOptions });
}

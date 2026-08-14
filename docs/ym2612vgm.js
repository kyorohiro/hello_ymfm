/**
 * @typedef {Object} Ym2612VgmHeader
 * @property {string} ident
 * @property {number} version
 * @property {number} ym2612Clock
 * @property {number} totalSamples
 * @property {number} loopOffset
 * @property {number} loopSamples
 * @property {number} dataOffset
 */

/**
 * @typedef {Object} Ym2612WriteEvent
 * @property {"ym2612-write"} type
 * @property {0|1} port
 * @property {number} register
 * @property {number} value
 */

/**
 * @typedef {Object} SegaPsgWriteEvent
 * @property {"psg-write"} type
 * @property {number} value
 */

/**
 * @typedef {Object} Ym2612WaitEvent
 * @property {"wait"} type
 * @property {number} samples
 */

/**
 * @typedef {Object} Ym2612EndEvent
 * @property {"end"} type
 */

/**
 * @typedef {Ym2612WriteEvent | SegaPsgWriteEvent | Ym2612WaitEvent | Ym2612EndEvent} Ym2612VgmEvent
 */

/**
 * @param {DataView} view
 * @param {number} offset
 * @returns {number}
 */
function readUint32LE(view, offset) {
  return view.getUint32(offset, true);
}

/**
 * @param {DataView} view
 * @param {number} offset
 * @returns {number}
 */
function readUint16LE(view, offset) {
  return view.getUint16(offset, true);
}

/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} length
 * @returns {string}
 */
function decodeAscii(bytes, start, length) {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += String.fromCharCode(bytes[start + index]);
  }
  return result;
}

export class Ym2612VGM {
  /**
   * @param {ArrayBuffer | ArrayBufferView} source
   * @param {{ logger?: Pick<Console, "warn"> | null }} [options]
   */
  constructor(source, options = {}) {
    if (source instanceof ArrayBuffer) {
      /** @type {Uint8Array} */
      this.bytes = new Uint8Array(source);
    } else if (ArrayBuffer.isView(source)) {
      /** @type {Uint8Array} */
      this.bytes = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    } else {
      throw new Error("Ym2612VGM expects an ArrayBuffer or typed array");
    }

    /** @type {DataView} */
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    /** @type {Ym2612VgmHeader} */
    this.header = this.parseHeader();
    /** @type {number} */
    this.position = this.header.dataOffset;
    /** @type {boolean} */
    this.ended = false;
    /** @type {Pick<Console, "warn"> | null} */
    this.logger = options.logger === undefined ? console : options.logger;
  }

  /**
   * @returns {Ym2612VgmHeader}
   */
  parseHeader() {
    const ident = decodeAscii(this.bytes, 0x00, 4);
    if (ident !== "Vgm ") {
      throw new Error(`Invalid VGM identifier: ${JSON.stringify(ident)}`);
    }

    const version = readUint32LE(this.view, 0x08);
    const ym2612Clock = readUint32LE(this.view, 0x2c);
    const totalSamples = readUint32LE(this.view, 0x18);
    const loopOffsetRaw = readUint32LE(this.view, 0x1c);
    const loopSamples = readUint32LE(this.view, 0x20);
    const dataOffsetRaw = readUint32LE(this.view, 0x34);

    const dataOffset = version >= 0x00000150
      ? (dataOffsetRaw === 0 ? 0x40 : 0x34 + dataOffsetRaw)
      : 0x40;

    const loopOffset = loopOffsetRaw === 0 ? 0 : 0x1c + loopOffsetRaw;

    return {
      ident,
      version,
      ym2612Clock,
      totalSamples,
      loopOffset,
      loopSamples,
      dataOffset,
    };
  }

  /**
   * @returns {void}
   */
  reset() {
    this.position = this.header.dataOffset;
    this.ended = false;
  }

  /**
   * @returns {boolean}
   */
  hasLoop() {
    return this.header.loopOffset !== 0;
  }

  /**
   * @returns {Ym2612VgmEvent}
   */
  step() {
    if (this.ended) {
      return { type: "end" };
    }
    if (this.position >= this.bytes.length) {
      throw new Error("Unexpected end of VGM data");
    }

    const command = this.bytes[this.position];
    switch (command) {
      case 0x50: {
        this.#ensureAvailable(2);
        const value = this.bytes[this.position + 1];
        this.position += 2;
        return { type: "psg-write", value };
      }
      case 0x52: {
        this.#ensureAvailable(3);
        const register = this.bytes[this.position + 1];
        const value = this.bytes[this.position + 2];
        this.position += 3;
        return { type: "ym2612-write", port: 0, register, value };
      }
      case 0x53: {
        this.#ensureAvailable(3);
        const register = this.bytes[this.position + 1];
        const value = this.bytes[this.position + 2];
        this.position += 3;
        return { type: "ym2612-write", port: 1, register, value };
      }
      case 0x67: {
        this.#ensureAvailable(7);
        const dataType = this.bytes[this.position + 2];
        const size = readUint32LE(this.view, this.position + 3);
        this.#ensureAvailable(7 + size);
        this.#warn(
          `Skipping VGM data block command 0x67 (type=0x${dataType.toString(16).padStart(2, "0")}, size=${size})`,
        );
        this.position += 7 + size;
        return this.step();
      }
      case 0x61: {
        this.#ensureAvailable(3);
        const samples = readUint16LE(this.view, this.position + 1);
        this.position += 3;
        return { type: "wait", samples };
      }
      case 0x62:
        this.position += 1;
        return { type: "wait", samples: 735 };
      case 0x63:
        this.position += 1;
        return { type: "wait", samples: 882 };
      case 0x66:
        this.position += 1;
        this.ended = true;
        return { type: "end" };
      default:
        break;
    }

    if (command === 0x68) {
      this.#ensureAvailable(12);
      this.#warn("Skipping unsupported VGM PCM RAM write command 0x68");
      this.position += 12;
      return this.step();
    }

    if (command >= 0x70 && command <= 0x7f) {
      this.position += 1;
      return { type: "wait", samples: (command & 0x0f) + 1 };
    }

    if (command >= 0x80 && command <= 0x8f) {
      this.position += 1;
      this.#warn(
        `Skipping YM2612 DAC write in command 0x${command.toString(16).padStart(2, "0")} and preserving wait timing only`,
      );
      return { type: "wait", samples: command & 0x0f };
    }

    if (command >= 0x90 && command <= 0x95) {
      const lengths = {
        0x90: 5,
        0x91: 5,
        0x92: 6,
        0x93: 11,
        0x94: 2,
        0x95: 5,
      };
      const length = lengths[command];
      this.#ensureAvailable(length);
      this.#warn(`Skipping unsupported DAC stream command 0x${command.toString(16).padStart(2, "0")}`);
      this.position += length;
      return this.step();
    }

    if (command === 0xe0) {
      this.#ensureAvailable(5);
      this.#warn("Skipping unsupported PCM data bank seek command 0xE0");
      this.position += 5;
      return this.step();
    }

    throw new Error(`Unsupported VGM command 0x${command.toString(16).padStart(2, "0")}`);
  }

  /**
   * @param {{
   *   ym2612?: { writeRegister(register: number, value: number, port?: number): void },
   *   psg?: { write(data: number): void },
   *   writeRegister?: (register: number, value: number, port?: number) => void
   * }} targets
   * @returns {Ym2612VgmEvent}
   */
  playStep(targets) {
    const event = this.step();
    if (event.type === "ym2612-write") {
      const ym2612 = targets.ym2612 || targets;
      if (ym2612 && typeof ym2612.writeRegister === "function") {
        ym2612.writeRegister(event.register, event.value, event.port);
      }
    }
    if (event.type === "psg-write") {
      const psg = targets.psg;
      if (psg && typeof psg.write === "function") {
        psg.write(event.value);
      }
    }
    return event;
  }

  /**
   * @param {number} length
   * @returns {void}
   */
  #ensureAvailable(length) {
    if (this.position + length > this.bytes.length) {
      throw new Error("Unexpected end of VGM command stream");
    }
  }

  /**
   * @param {string} message
   * @returns {void}
   */
  #warn(message) {
    if (this.logger && typeof this.logger.warn === "function") {
      this.logger.warn(message);
    }
  }
}

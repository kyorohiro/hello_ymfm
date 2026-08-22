/**
 * Lightweight musical-event looper for MegaSynth / YM2612 browser usage.
 *
 * This first version intentionally records performance-level note events:
 *
 * - noteOn(channel, block, fnum)
 * - noteOff(channel)
 *
 * It does not try to record raw YM2612 register writes yet.
 * The main idea is to keep loop data editable and small.
 */

const ALL_FM_CHANNELS = [0, 1, 2, 3, 4, 5];
const MIN_LOOP_LENGTH_SECONDS = 0.001;

/**
 * @typedef {{
 *   time: number,
 *   type: "noteOn" | "noteOff",
 *   channel: number,
 *   block?: number,
 *   fnum?: number,
 * }} MegaSynthLooperEvent
 */

/**
 * @typedef {{
 *   id: string,
 *   muted: boolean,
 *   events: MegaSynthLooperEvent[],
 * }} MegaSynthLooperUnit
 */

export class MegaSynthLooper {
  /**
   * @param {{
   *   synth: {
   *     start?: () => Promise<unknown>,
   *     fm?: {
   *       noteOn: (channel: number, block: number, fnum: number) => void,
   *       noteOff: (channel: number) => void,
   *     },
   *     noteOn?: (channel: number, block: number, fnum: number) => void,
   *     noteOff?: (channel: number) => void,
   *   },
   *   now?: () => number,
   *   setTimer?: (fn: () => void, delayMs: number) => unknown,
   *   clearTimer?: (timerId: unknown) => void,
   * }} options
   */
  constructor(options = {}) {
    if (!options.synth) {
      throw new Error("MegaSynthLooper requires a synth option");
    }

    this.synth = options.synth;
    this.now =
      options.now ??
      (() => performance.now() / 1000);
    this.setTimer =
      options.setTimer ??
      ((fn, delayMs) => window.setTimeout(fn, delayMs));
    this.clearTimer =
      options.clearTimer ??
      ((timerId) => window.clearTimeout(timerId));

    this.running = false;
    this.recording = false;
    this.loopLength = null;
    this.startedAt = null;
    this.loopStartedAt = null;
    this.currentUnit = null;
    this.units = [];

    this._nextUnitId = 1;
    this._scheduledTimers = [];
    this._activeChannels = new Set();
  }

  async start() {
    if (this.running) {
      return this;
    }

    if (typeof this.synth.start === "function") {
      await this.synth.start();
    }

    this.running = true;
    this.startedAt = this.now();

    if (this.loopLength !== null && this.units.length > 0) {
      this.loopStartedAt = this.startedAt;
      this._scheduleLoopCycle(this.loopStartedAt);
    }

    return this;
  }

  stop() {
    if (!this.running && !this.recording) {
      return;
    }

    if (this.recording) {
      this.finishRecording();
    }

    this.running = false;
    this.recording = false;
    this.startedAt = null;
    this.loopStartedAt = null;
    this.currentUnit = null;

    this._clearScheduledTimers();
    this._allNotesOff();
  }

  clear() {
    this.stop();
    this.loopLength = null;
    this.units = [];
    this._nextUnitId = 1;
  }

  toggleRecord() {
    if (!this.running) {
      throw new Error("MegaSynthLooper must be started before recording");
    }

    if (this.recording) {
      return this.finishRecording();
    }

    return this.startRecording();
  }

  startRecording() {
    if (!this.running) {
      throw new Error("MegaSynthLooper must be started before recording");
    }

    if (this.recording) {
      return this.currentUnit;
    }

    const startedAt = this.now();
    const startedLoopTime =
      this.loopLength === null
        ? 0
        : this._getLoopPosition(startedAt);

    this.currentUnit = {
      id: `unit-${this._nextUnitId}`,
      startedAt,
      startedLoopTime,
      events: [],
    };

    this._nextUnitId += 1;
    this.recording = true;

    return this.currentUnit;
  }

  finishRecording() {
    if (!this.recording || !this.currentUnit) {
      return null;
    }

    const finishedAt = this.now();
    const currentUnit = this.currentUnit;
    const recordedUnit = {
      id: currentUnit.id,
      muted: false,
      events: currentUnit.events.slice(),
    };

    if (this.loopLength === null) {
      this.loopLength = Math.max(
        MIN_LOOP_LENGTH_SECONDS,
        finishedAt - currentUnit.startedAt
      );
      this.loopStartedAt = finishedAt;
      this._clearScheduledTimers();
      if (this.running) {
        this._scheduleLoopCycle(this.loopStartedAt);
      }
    }

    this.units.push(recordedUnit);
    this.currentUnit = null;
    this.recording = false;

    return recordedUnit;
  }

  noteOn(channel, block, fnum) {
    this._dispatchPerformanceEvent(
      {
        type: "noteOn",
        channel,
        block,
        fnum,
      },
      true
    );
  }

  noteOff(channel) {
    this._dispatchPerformanceEvent(
      {
        type: "noteOff",
        channel,
      },
      true
    );
  }

  getState() {
    return {
      running: this.running,
      recording: this.recording,
      loopLength: this.loopLength,
      startedAt: this.startedAt,
      loopStartedAt: this.loopStartedAt,
      currentUnitId: this.currentUnit?.id ?? null,
      unitCount: this.units.length,
      units: this.units.map((unit) => ({
        id: unit.id,
        muted: unit.muted,
        eventCount: unit.events.length,
      })),
    };
  }

  getUnits() {
    return this.units.map((unit) => ({
      id: unit.id,
      muted: unit.muted,
      events: unit.events.map((event) => ({ ...event })),
    }));
  }

  _dispatchPerformanceEvent(event, shouldRecord) {
    const target = this._getPerformanceTarget();

    if (event.type === "noteOn") {
      target.noteOn(event.channel, event.block, event.fnum);
      this._activeChannels.add(event.channel);
    } else if (event.type === "noteOff") {
      target.noteOff(event.channel);
      this._activeChannels.delete(event.channel);
    } else {
      throw new Error(`Unsupported looper event type: ${event.type}`);
    }

    if (shouldRecord) {
      this._recordEvent(event);
    }
  }

  _recordEvent(event) {
    if (!this.recording || !this.currentUnit) {
      return;
    }

    const eventTime = this._getCurrentRecordTime();
    this.currentUnit.events.push({
      ...event,
      time: eventTime,
    });
  }

  _getCurrentRecordTime() {
    const currentTime = this.now();
    const elapsed = currentTime - this.currentUnit.startedAt;

    if (this.loopLength === null) {
      return elapsed;
    }

    return this._wrapLoopTime(
      this.currentUnit.startedLoopTime + elapsed
    );
  }

  _scheduleLoopCycle(cycleStartTime) {
    if (!this.running || this.loopLength === null) {
      return;
    }

    const now = this.now();

    for (const unit of this.units) {
      if (unit.muted) {
        continue;
      }

      for (const event of unit.events) {
        const delayMs =
          Math.max(0, (cycleStartTime + event.time - now) * 1000);
        const timerId = this.setTimer(() => {
          if (!this.running) {
            return;
          }
          this._dispatchPerformanceEvent(event, false);
        }, delayMs);
        this._scheduledTimers.push(timerId);
      }
    }

    const nextCycleStartTime =
      cycleStartTime + this.loopLength;
    const cycleDelayMs =
      Math.max(0, (nextCycleStartTime - now) * 1000);

    const cycleTimerId = this.setTimer(() => {
      this._pruneScheduledTimers();
      this._scheduleLoopCycle(nextCycleStartTime);
    }, cycleDelayMs);

    this._scheduledTimers.push(cycleTimerId);
  }

  _clearScheduledTimers() {
    for (const timerId of this._scheduledTimers) {
      this.clearTimer(timerId);
    }
    this._scheduledTimers = [];
  }

  _pruneScheduledTimers() {
    this._scheduledTimers = [];
  }

  _allNotesOff() {
    const target = this._getPerformanceTarget();

    for (const channel of ALL_FM_CHANNELS) {
      target.noteOff(channel);
    }

    this._activeChannels.clear();
  }

  _getLoopPosition(currentTime = this.now()) {
    if (this.loopLength === null || this.loopStartedAt === null) {
      return 0;
    }

    return this._wrapLoopTime(
      currentTime - this.loopStartedAt
    );
  }

  _wrapLoopTime(time) {
    if (this.loopLength === null) {
      return time;
    }

    const wrapped =
      time % this.loopLength;

    return wrapped < 0
      ? wrapped + this.loopLength
      : wrapped;
  }

  _getPerformanceTarget() {
    if (
      this.synth &&
      typeof this.synth.noteOn === "function" &&
      typeof this.synth.noteOff === "function"
    ) {
      return this.synth;
    }

    if (
      this.synth &&
      this.synth.fm &&
      typeof this.synth.fm.noteOn === "function" &&
      typeof this.synth.fm.noteOff === "function"
    ) {
      return this.synth.fm;
    }

    throw new Error(
      "MegaSynthLooper requires a synth with noteOn/noteOff or fm.noteOn/fm.noteOff"
    );
  }
}

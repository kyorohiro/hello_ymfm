import { MegaSynthLooper } from "../web/megasynth_looper.js";

function createFakeClock() {
  let currentTime = 0;
  let nextTimerId = 1;
  const timers = new Map();

  return {
    now() {
      return currentTime;
    },
    setTimer(fn, delayMs) {
      const id = nextTimerId;
      nextTimerId += 1;
      timers.set(id, {
        at: currentTime + delayMs / 1000,
        fn,
      });
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    advance(seconds) {
      currentTime += seconds;
      let ran = true;
      while (ran) {
        ran = false;
        const ready = [...timers.entries()]
          .filter(([, timer]) => timer.at <= currentTime)
          .sort((a, b) => a[1].at - b[1].at);
        for (const [id, timer] of ready) {
          timers.delete(id);
          timer.fn();
          ran = true;
        }
      }
    },
  };
}

function createFakeSynth(callLog) {
  return {
    async start() {
      callLog.push(["start"]);
    },
    fm: {
      noteOn(channel, block, fnum) {
        callLog.push(["noteOn", channel, block, fnum]);
      },
      noteOff(channel) {
        callLog.push(["noteOff", channel]);
      },
    },
  };
}

const callLog = [];
const fakeClock = createFakeClock();
const synth = createFakeSynth(callLog);

const looper = new MegaSynthLooper({
  synth,
  now: () => fakeClock.now(),
  setTimer: (fn, delayMs) => fakeClock.setTimer(fn, delayMs),
  clearTimer: (id) => fakeClock.clearTimer(id),
});

await looper.start();
looper.startRecording();
looper.noteOn(0, 4, 553);
fakeClock.advance(0.25);
looper.noteOff(0);
fakeClock.advance(0.75);
const unit1 = looper.finishRecording();

if (!unit1 || unit1.events.length !== 2) {
  throw new Error("Expected first unit with two events");
}

if (Math.abs(looper.loopLength - 1.0) > 0.0001) {
  throw new Error(`Expected loop length near 1.0, got ${looper.loopLength}`);
}

const initialCalls = callLog.length;
fakeClock.advance(1.0);

if (callLog.length <= initialCalls) {
  throw new Error("Expected loop playback to replay events");
}

console.log("ok: MegaSynthLooper basic record/playback flow");

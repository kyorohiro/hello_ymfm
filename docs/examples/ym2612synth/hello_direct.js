import ym2612ModuleFactory from "../../generated/ym2612_wasm.js";
import { createYm2612 } from "../../ym2612.js";
import {
  YM2612DirectTransport,
  YM2612Synth,
} from "../../ym2612synth.js";

const ym2612 = await createYm2612(ym2612ModuleFactory);

const transport = new YM2612DirectTransport(ym2612);
const synth = new YM2612Synth({ transport });

synth.setOperator(0, 1, { tl: 0x7f });
synth.setOperator(0, 2, { tl: 0x7f });
synth.setOperator(0, 3, { tl: 0x7f });

synth.setOperator(0, 4, {
  dt: 0,
  multi: 1,
  tl: 8,
  ar: 22,
  d1r: 6,
  d2r: 3,
  sl: 3,
  rr: 8,
});

synth.setAlgo(0, 7, 0);
synth.setPan(0, true, true);

synth.noteOn(0, 4, 553);

// Later:
synth.noteOff(0);

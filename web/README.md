# YM2612 WASM Interface

Build the WASM files:

```sh
sh scripts/build_ym2612_wasm.sh
```

This generates:

- `docs/generated/ym2612_wasm.js`
- `docs/generated/ym2612_wasm.wasm`

Minimal browser-side usage:

```js
import ym2612ModuleFactory from "./generated/ym2612_wasm.js";
import { createYm2612, YM2612_CLOCK } from "../web/ym2612.js";

const ym2612 = await createYm2612(ym2612ModuleFactory);
const sampleRate = ym2612.sampleRate(YM2612_CLOCK);

ym2612.reset();
ym2612.writeRegister(0x30, 0x01);
ym2612.writeRegister(0x34, 0x01);
ym2612.writeRegister(0x38, 0x01);
ym2612.writeRegister(0x3c, 0x01);

const { left, right } = ym2612.generateStereo(128);
console.log(sampleRate, left, right);
```

The JS wrapper provides:

- `reset()`
- `write(offset, data)`
- `writeRegister(register, value, port = 0)`
- `sampleRate(clock = YM2612_CLOCK)`
- `generateStereo(frames)`
- `dispose()`

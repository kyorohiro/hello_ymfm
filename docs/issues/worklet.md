YM2612 WASM を AudioWorklet で鳴らすまでにやったこと
=====================================================

■ もともとの構成

最初は Main Thread 上ですべて動かしていた。

Main Thread
  |
  | UI / keyboard
  |
  | YM2612Synth
  |   noteOn()
  |   noteOff()
  |   setOperator()
  |   ...
  |
  | YM2612DirectTransport
  |   write()
  |
  | Ym2612
  |   writeRegister()
  |   generateStereo()
  |
  | ym2612 WASM
  |
  | ScriptProcessorNode
  |   onaudioprocess
  |      ↓
  |   ym2612.generateStereo()
  |
  +----> AudioContext.destination


ScriptProcessorNode が

    processor.onaudioprocess = ...

を一定間隔で呼び、

    ym2612.generateStereo(frames)

で PCM を生成していた。

YM2612Synth 自体は PCM を生成していない。

YM2612Synth がやっているのは、

    noteOn()
    noteOff()
    setOperator()
    setAlgo()
    setPan()

などを YM2612 のレジスタ書き込みへ変換すること。

実際の PCM 生成は

    Ym2612.generateStereo()

→ WASM
→ ymfm

が行っている。


-----------------------------------------------------
■ AudioWorklet 化した理由
-----------------------------------------------------

ScriptProcessorNode は deprecated。

従来:

Main Thread
    |
    +-- YM2612 WASM
    |
    +-- generateStereo()
    |
    +-- ScriptProcessorNode

AudioWorklet版:

Main Thread
    |
    | postMessage(register write)
    ↓
AudioWorklet
    |
    +-- YM2612 WASM
    |
    +-- generateStereo()
    |
    +-- Audio output


つまり、

「YM2612を操作する側」

と

「実際にPCMを生成する側」

を分離した。


-----------------------------------------------------
■ YM2612Synth はそのまま使える
-----------------------------------------------------

YM2612Synth は最初から transport を抽象化していた。

    YM2612Synth
          |
          ↓
       transport
          |
     +----+----+
     |         |
   Direct    Worklet


Direct の場合:

    YM2612DirectTransport.write()

        ↓

    ym2612.writeRegister()


Worklet の場合:

    YM2612WorkletTransport.write()

        ↓

    node.port.postMessage({
        type: "write",
        port,
        register,
        value
    })


そのため YM2612Synth 自体は、

    synth.noteOn(...)
    synth.noteOff(...)
    synth.setOperator(...)

という同じAPIを維持できた。

YM2612Synth は、

「相手が直接YM2612なのか」
「AudioWorkletなのか」

を知らなくてよい。


-----------------------------------------------------
■ AudioWorklet側
-----------------------------------------------------

AudioWorklet側に

    YM2612Processor

を作った。

Main Thread から

    postMessage({
        type: "write",
        ...
    })

を受け取ったら、

    ym2612.writeRegister(...)

を呼ぶ。


AudioWorklet の process() はブラウザから繰り返し呼ばれる。

    process(inputs, outputs) {
        ...
    }

その中で

    ym2612.generateStereo(leftOut.length)

を呼び、

    leftOut.set(left)
    rightOut.set(right)

している。


つまり以前の

    ScriptProcessorNode.onaudioprocess

の役割が、

    AudioWorkletProcessor.process()

へ移った。


-----------------------------------------------------
■ 最初の問題: WASM が AudioWorklet で起動しなかった
-----------------------------------------------------

最初に出たエラー:

    shell environment detected but not enabled at build time

AudioWorkletGlobalScope は普通の Window ではない。

Emscripten が実行環境を判定した結果、
AudioWorklet を shell 系の環境として判定していた。

元のビルド:

    -sENVIRONMENT=web,worker

これを

    -sENVIRONMENT=web,worker,shell

へ変更した。


-----------------------------------------------------
■ 次の問題: read is not defined
-----------------------------------------------------

shell を許可すると次に、

    ReferenceError: read is not defined

になった。

理由:

Emscripten は shell 環境だと判断したので、

    ym2612_wasm.wasm

を自分でロードするために

    read()

を使おうとした。

しかし AudioWorkletGlobalScope に read() は存在しない。


つまり、

    AudioWorklet
        ↓
    Emscripten
        ↓
    shell と判断
        ↓
    read("ym2612_wasm.wasm")
        ↓
    read が存在しない
        ↓
    ERROR


-----------------------------------------------------
■ WASM のロードを Main Thread に移した
-----------------------------------------------------

AudioWorklet 内から WASM ファイルを探させるのをやめた。

Main Thread で、

    fetch("./generated/ym2612_wasm.wasm")

して、

    ArrayBuffer

として取得する。


その ArrayBuffer を、

    processor.port.postMessage(
        {
            type: "initialize",
            wasmBinary
        },
        [wasmBinary]
    )

で AudioWorklet に送る。


[wasmBinary]

を transfer list に入れているので、
ArrayBuffer をコピーするのではなく ownership を Worklet 側へ移す。


構成:

Main Thread

    fetch()
       ↓
ym2612_wasm.wasm
       ↓
ArrayBuffer
       ↓
postMessage + transfer
       ↓

AudioWorklet

    wasmBinary
       ↓
ym2612ModuleFactory({
    wasmBinary
})
       ↓
YM2612 WASM 起動


これによって Emscripten が

    read()
    fetch()

などを使って自分で WASM を探す必要がなくなった。


-----------------------------------------------------
■ Ym2612 は元々 moduleOptions に対応していた
-----------------------------------------------------

既存コード:

    export async function createYm2612(
        moduleFactory,
        moduleOptions
    ) {
        return Ym2612.create({
            moduleFactory,
            moduleOptions
        });
    }


内部:

    const module =
        await moduleFactory(moduleOptions || {});


そのため AudioWorklet から、

    createYm2612(
        ym2612ModuleFactory,
        {
            wasmBinary:
                new Uint8Array(wasmBinary)
        }
    )

と渡すだけでよかった。


-----------------------------------------------------
■ 次の問題: INCOMING_MODULE_JS_API
-----------------------------------------------------

次に出たエラー:

    Module.wasmBinary was supplied but
    wasmBinary not included in
    INCOMING_MODULE_JS_API


これは Emscripten が、

    moduleFactory({
        wasmBinary: ...
    })

という外部からのオプションを受け付ける設定になっていなかったため。


ビルドオプションに、

    -sINCOMING_MODULE_JS_API='["wasmBinary"]'

を追加した。


最終的に重要なビルド設定は、

    -sMODULARIZE=1
    -sEXPORT_ES6=1
    -sENVIRONMENT=web,worker,shell
    -sINCOMING_MODULE_JS_API='["wasmBinary"]'


となった。


-----------------------------------------------------
■ 最終的な AudioWorklet の流れ
-----------------------------------------------------

初期化:

Main Thread

    AudioContext
        ↓
    audioWorklet.addModule(
        "./ym2612-worklet.js"
    )
        ↓
    new AudioWorkletNode(...)
        ↓
    fetch("ym2612_wasm.wasm")
        ↓
    ArrayBuffer
        ↓
    postMessage({
        type: "initialize",
        wasmBinary
    })


AudioWorklet

    initialize message
        ↓
    createYm2612(
        ym2612ModuleFactory,
        { wasmBinary }
    )
        ↓
    YM2612 WASM 起動
        ↓
    ready


-----------------------------------------------------
■ 音を鳴らすとき
-----------------------------------------------------

Main Thread:

    synth.noteOn(channel, block, fnum)

        ↓

YM2612Synth:

    YM2612レジスタ値へ変換

        ↓

YM2612WorkletTransport:

    postMessage({
        type: "write",
        port,
        register,
        value
    })

        ↓

AudioWorklet:

    ym2612.writeRegister(...)

        ↓

YM2612 WASM / ymfm の内部状態が変化


そしてブラウザが AudioWorklet の

    process()

を繰り返し呼ぶ。

    process()
        ↓
    ym2612.generateStereo(128)
        ↓
    PCM生成
        ↓
    outputs[0][0] = Left
    outputs[0][1] = Right
        ↓
    AudioContext.destination


-----------------------------------------------------
■ 重要な理解
-----------------------------------------------------

YM2612Synth は「音声を生成するクラス」ではない。

役割は、

    音楽的な操作
        ↓
    YM2612レジスタ操作

への変換。


Ym2612 / ymfm WASM が、

    YM2612レジスタ状態
        ↓
    PCM

を生成する。


AudioWorklet は、

    「PCMをいつ生成すればよいか」

をブラウザのAudio Thread側から要求される場所。


最終構成は、

UI / Keyboard
      |
      ↓
YM2612Synth
      |
      ↓
YM2612WorkletTransport
      |
   postMessage
      |
-----------------------------
 Main Thread / Audio Thread
-----------------------------
      |
      ↓
YM2612Processor
      |
      ↓
Ym2612
      |
      ↓
ymfm WASM
      |
      ↓
generateStereo()
      |
      ↓
PCM
      |
      ↓
Web Audio Output


-----------------------------------------------------
■ Direct版との違い
-----------------------------------------------------

Direct:

YM2612Synth
    ↓
YM2612DirectTransport
    ↓
Ym2612
    ↓
WASM

全部 Main Thread。


Worklet:

YM2612Synth
    ↓
YM2612WorkletTransport
    ↓
postMessage
    ↓
AudioWorklet
    ↓
Ym2612
    ↓
WASM


YM2612Synth のAPIは同じ。

transport を交換するだけで、

    Direct
    AudioWorklet

を切り替えられる。


-----------------------------------------------------
■ 今回ハマったポイント
-----------------------------------------------------

1. AudioWorklet は Window ではない

2. Emscripten が AudioWorkletGlobalScope を
   普通の web/worker と認識しなかった

3. shell を許可すると環境判定は通った

4. しかし shell 用の read() で WASM を
   読もうとして失敗した

5. WASM ファイルのロードを Main Thread に移した

6. ArrayBuffer を AudioWorklet に transfer した

7. Emscripten に wasmBinary を直接渡した

8. wasmBinary を受け付けるため

   -sINCOMING_MODULE_JS_API='["wasmBinary"]'

   が必要だった

9. 最終的に AudioWorklet 内で
   ymfm WASM が動き、音が鳴った
   
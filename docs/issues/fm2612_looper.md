Tetorica FM2612 Looper

Overview

Tetorica FM2612 に、BOSS系Looperを参考にしたシンプルなLooper機能を追加する。

目的は、YM2612をPC Keyboardなどで演奏し、その演奏イベントをそのままLoop化できるようにすること。

Audio波形を録音するのではなく、基本的には

YM2612へ送った演奏イベントを記録する

方式を想定する。

これにより、録音後も音色変更や再編集が可能になる。

⸻

Basic Concept

操作はできるだけ単純にする。

Looper Start
Space
  ↓
Record Unit 1
Space
  ↓
Stop Recording Unit 1
Loop Length確定
Loop Playback開始
Space
  ↓
Record Unit 2
Unit 1は再生継続
Space
  ↓
Stop Recording Unit 2
Space
  ↓
Record Unit 3
...
Looper Stop

Space keyは、

Record ON / Record OFF

のトグルとして扱う。

Looper自体のStart / Stopは別操作にする。

⸻

Unit

1回の録音を Unit と呼ぶ。

録音するたびに、新しいUnitを追加する。

Looper
├─ Unit 1
├─ Unit 2
├─ Unit 3
└─ Unit 4

Unitは insert-only とする。

既存Unitへ直接上書きしない。

これにより、

* Undo
* Delete
* Mute
* Export
* Import

などを単純に実装できる。

⸻

First Unit

最初のUnitだけは特別扱いする。

Space
  ↓
Record Unit 1
  ↓
Space
  ↓
Unit 1 recording end
  ↓
Loop Length確定

例えば最初の録音時間が、

7.82 sec

だった場合、

Loop Length = 7.82 sec

となる。

以降のUnitはすべて、このLoop Length上に記録する。

⸻

Loop Timeline

Example:

Loop Length = 8 sec
0                                   8
|-----------------------------------|
Unit 1
| ♪──────♪────♪──────────────────── |
Unit 2
|          ♪──────♪────             |
Unit 3
|                       ♪──♪        |

Unit 2以降はLoop途中からRecordを開始してよい。

Record開始時点のLoop Positionを保持し、その位置からイベントを記録する。

⸻

Space Key Behavior

Looper実行中のSpaceは、可能な限り単純にする。

Not Recording
    ↓ Space
Recording New Unit
Recording
    ↓ Space
Finish Current Unit

つまり、

Space = Record ON / OFF

のみ。

Looper終了はSpaceに割り当てない。

⸻

Looper Start / Stop

概念API:

looper.start();

Stop:

looper.stop();

Looper停止時は、

* Playback停止
* Recording停止
* Pending events cleanup
* 必要ならYM2612 allNotesOff

を行う。

Loop data自体は clear() されるまで保持してもよい。

⸻

Basic State

候補:

{
  running: false,
  recording: false,
  loopLength: null,
  startedAt: null,
  loopStartedAt: null,
  currentUnit: null,
  units: [],
}

最初のUnit確定前は、

loopLength === null

となる。

⸻

Unit Data Structure

Concept:

{
  id: "unit-1",
  events: [
    {
      time: 0.0,
      type: "noteOn",
      channel: 0,
      note: "C3",
    },
    {
      time: 0.42,
      type: "noteOff",
      channel: 0,
      note: "C3",
    },
  ],
}

time は、

Loop先頭からの相対時間

として保存する。

Unit 2以降を途中から録音する場合も、Loop positionへ変換して保存する。

⸻

Event Recording

LooperはYM2612へのすべての低レベルRegister writeを必ず録音する必要はない。

初期版では、Tetorica FM2612の演奏APIで発生したイベントを対象にする。

候補:

noteOn
noteOff
velocity / level
channel
pitch

必要なら将来的に、

algorithm change
feedback change
operator parameter change
pitch bend
LFO
pan

なども録音対象にできる。

⸻

Event Capture Layer

可能なら、

Keyboard
Playground API
Game Input
      ↓
Performance Event
      ↓
Looper Recorder
      ↓
YM2612

のようにする。

Looper専用にKeyboardイベントを直接監視するのではなく、

YM2612演奏イベントの共通経路

を記録する方が再利用しやすい。

⸻

Playback

Playback時は、

currentLoopPosition
  =
(currentTime - loopStartTime) % loopLength

のようにLoop Positionを計算する。

各Unitのイベントを同じLoop Timeline上で再生する。

Unit 1 events
Unit 2 events
Unit 3 events
      ↓
merge by event time
      ↓
YM2612 scheduler

⸻

Scheduler

最初は単純なSchedulerでもよい。

ただしGame Loopへの影響を避けるため、将来的にはPlaygroundのMusic Clock / Schedulerと統合する。

理想:

Looper Events
     ↓
Music Scheduler
     ↓
AudioWorklet
     ↓
YM2612

Looper独自の大量の setTimeout() を作るより、既存Music Schedulerを利用する方がよい。

⸻

Loop Length

初期版では、最初のUnitのRecord開始からRecord終了までをそのままLoop Lengthにする。

recordStart
    ↓
performance
    ↓
recordEnd
loopLength = recordEnd - recordStart

将来的には、

Quantize to beat
Quantize to bar
Fixed bars

などを追加してもよい。

初期版ではFree Recordingを優先する。

⸻

Recording Unit 2+

Unit 2以降ではLoop Lengthを変更しない。

Loop Length = fixed

Record中にLoop終端へ到達した場合も録音を継続できる。

例えば、

Loop length = 8 sec
Record start = 6 sec
6────7────8/0────1────2
      recording continues

この場合、イベントtimeはModuloでLoop Timelineへ配置する。

⸻

Crossing Loop Boundary

Unit録音がLoop終端を跨いだ場合、

record absolute time
      ↓
convert to loop position
      ↓
time % loopLength

として保存する。

Example:

event at absolute +9.2 sec
loopLength = 8 sec
stored loop time = 1.2 sec

必要ならUnit内部では録音順序保持用にabsolute offsetも保持できる。

⸻

Insert-Only Model

既存UnitをRecordで直接変更しない。

Before
Unit 1
Unit 2
New Recording
    ↓
After
Unit 1
Unit 2
Unit 3

この方式を基本とする。

⸻

Undo

Insert-onlyなのでUndoは単純。

looper.undo();

基本的には最後に追加したUnitを取り除く。

Concept:

units.pop();

ただし実装上はredo対応を考えて、削除Unitを一時保持してもよい。

⸻

Redo

Optional:

looper.redo();

初期版では必須ではない。

⸻

Delete Unit

Unit単位で削除できるようにする。

looper.deleteUnit(unitId);

Example UI:

Unit 1   [Delete]
Unit 2   [Delete]
Unit 3   [Delete]

削除してもLoop Lengthは変更しない。

Unit 1を削除する場合も、既に確定したLoop Lengthは保持する。

⸻

Mute Unit

将来的には、

looper.muteUnit(unitId, true);

を追加してもよい。

初期版では必須ではない。

⸻

Clear

Looper全体を初期化する。

looper.clear();

Effects:

units = []
loopLength = null
recording = false

Looper Runtime自体を停止するかどうかはAPI設計で決める。

候補:

looper.clear();

はデータだけ削除、

looper.stop();

はPlayback停止。

⸻

Export

Looper dataをファイルへExportできるようにする。

初期版ではJSON形式でよい。

Concept:

const data = looper.export();

Example:

{
  "format": "tetorica-fm2612-looper",
  "version": 1,
  "loopLength": 7.82,
  "units": [
    {
      "id": "unit-1",
      "events": [
        {
          "time": 0,
          "type": "noteOn",
          "channel": 0,
          "note": "C3"
        },
        {
          "time": 0.42,
          "type": "noteOff",
          "channel": 0,
          "note": "C3"
        }
      ]
    }
  ]
}

⸻

Export Format Version

必ずversionを含める。

{
  "format": "tetorica-fm2612-looper",
  "version": 1
}

将来event formatやinstrument情報が増えてもmigrationしやすくする。

⸻

Export Metadata

Optional metadata:

{
  "name": "my-loop",
  "createdAt": "...",
  "bpm": 120
}

ただし初期版では最小構成を優先する。

⸻

Instrument Data in Export

重要な設計判断。

Loopを、

Performance only

として保存するか、

Performance + YM2612 instrument

として保存するか。

初期候補としては、

Performance eventsを中心に保存する

方が単純。

これならImport後に別音色で再生できる。

Example:

looper.import(data);
fm.setInstrument(newInstrument);
looper.play();

同じ演奏を別のFM音色で鳴らせる。

将来的には必要に応じてinstrument snapshotを含めてもよい。

⸻

Import

Export済みLooper dataを読み込めるようにする。

await looper.import(data);

Import時に、

format
version
loopLength
units
events

をvalidationする。

不正dataでRuntimeを壊さない。

⸻

Import Behavior

Importした場合、

Current Looper data

をどうするか決める必要がある。

初期版では、

Importは現在のLooper dataを置き換える

でよい。

Concept:

looper.stop();
looper.import(data);
looper.play();

将来的に、

looper.import(data, {
  mode: "append",
});

などを追加してもよい。

⸻

Import Validation

最低限チェックする。

format matches
version supported
loopLength > 0
units is array
event time is finite
channel is valid
event type is supported

異常値はrejectする。

⸻

Export / Import API Candidates

Concept:

const data = looper.export();

Import:

looper.import(data);

JSON string helper:

const json = looper.exportJSON();
looper.importJSON(json);

Browser UI側ではFile download / File uploadへ接続できる。

⸻

Playback After Import

Import後は自動再生しない方が安全。

Import
  ↓
Loaded / Stopped
  ↓
User presses Play

とする。

意図せず音が出ることを避ける。

⸻

Keyboard Controls

初期候補:

Space
Record Unit ON / OFF

Looper Start / StopはUI Buttonを基本にする。

必要なら、

Escape
Stop Looper

を追加できる。

ただしKeyboard演奏に使うkeyとの衝突を避ける。

⸻

Space Key Handling

Editorへfocusがある場合など、Spaceを文字入力やscrollとして使いたいケースがある。

そのため、

Looper performance mode

のような状態を持ってもよい。

Concept:

Looper Performance Mode ON
Space => Record toggle

Editor入力時はLooper shortcutを無効化するなど、focus handlingに注意する。

⸻

Minimal UI

初期版UIはこれくらいでよい。

[ Start Looper ]
Status: PLAYING
Loop: 7.82 sec
Units:
  Unit 1
  Unit 2
  Unit 3
[ Undo ]
[ Clear ]
[ Export ]
[ Import ]
[ Stop Looper ]

RecordはSpace操作を中心にする。

⸻

State Machine

Concept:

STOPPED
  │
  │ Start
  ▼
READY
  │
  │ Space
  ▼
RECORD_FIRST_UNIT
  │
  │ Space
  ▼
PLAYING
  │
  │ Space
  ▼
RECORD_NEW_UNIT
  │
  │ Space
  ▼
PLAYING
  │
  ├── Space -> RECORD_NEW_UNIT
  │
  └── Stop  -> STOPPED

⸻

First Recording State

最初のRecordだけは、

loopLength = unknown

なのでPlaybackできない。

READY
   ↓ Space
RECORD_FIRST_UNIT
   ↓ Space
loopLength determined
   ↓
PLAYING

となる。

⸻

Overdub Model

一般的なLooperではOverdubと呼ばれるが、Tetorica内部では

new Unit insert

として扱う。

つまり、

Overdub = append new Unit

と考える。

UI表現ではユーザーに分かりやすければ Overdub と表示してもよい。

内部モデルはUnit追加に統一する。

⸻

Why Event Recording Instead of Audio Recording?

PCM AudioをLoopする場合、

YM2612
  ↓
rendered audio
  ↓
record buffer
  ↓
loop playback

となる。

これは通常のLooperとしては自然だが、FM2612の特徴を失いやすい。

Event Recordingなら、

performance events
      ↓
Looper
      ↓
YM2612

なので、

* 後から音色変更できる
* Algorithm変更できる
* Feedback変更できる
* Channel変更できる
* Transposeできる
* Export dataが小さい
* Gameへ組み込みやすい

という利点がある。

Tetorica FM2612ではEvent Recordingを優先する。

⸻

Possible Future Features

初期版には含めなくてよい。

Mute Unit
Solo Unit
Redo
Unit reorder
Unit rename
Transpose Unit
Change channel
Quantize
Beat / Bar based loop length
Fixed length recording
Capture last N bars
MIDI input
Gamepad pedal
External MIDI foot switch
Wave export
VGM export

⸻

Relation to Playground liveLoop()

liveLoop() とLooperは別概念として扱う。

liveLoop()
= code creates loop
Looper
= performance creates loop

ただし将来的には同じMusic Clock / Schedulerを共有する。

               Music Clock
                    │
          ┌─────────┴─────────┐
          │                   │
      liveLoop()           Looper
          │                   │
          └─────────┬─────────┘
                    ↓
               Scheduler
                    ↓
                YM2612

これにより、コード生成Loopと演奏Loopを同期して鳴らせる。

⸻

Initial Scope

初期実装では以下に限定する。

Looper Start / Stop
Space:
  Record ON
  Record OFF
First Unit:
  determines Loop Length
Additional recordings:
  append new Unit
Loop Playback
Undo last Unit
Delete Unit
Clear
Export JSON
Import JSON

以下は後回し。

Quantize
BPM sync
Fixed bars
Mute / Solo
Redo
Wave recording
Audio buffer looping
Advanced editing

⸻

Core Idea

Tetorica FM2612 Looperは、

BOSS系Looperの簡単な操作感を、YM2612 Event Recordingとして実装する。

操作の中心はSpaceだけ。

Space
  ↓
record
Space
  ↓
finish
Space
  ↓
record another Unit
Space
  ↓
finish

最初のUnitでLoop Lengthを決定し、それ以降は同じLoop Timelineへ新しいUnitをinsertする。

Loop
├─ Unit 1
├─ Unit 2
├─ Unit 3
└─ Unit 4

Unitはinsert-only。

これによりUndo / Delete / Export / Importを単純に保つ。

Tetorica FM2612を単なるSynthではなく、

演奏して、その場でLoopを積み上げられるFM楽器

として使えるようにする。
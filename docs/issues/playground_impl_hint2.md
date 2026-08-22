beat() and Shared Music Clock

liveLoop() 同士を同期させるため、sleep() だけに依存しない。

sleep() は基本的に、

現在時刻から相対的に一定時間待つ

というAPIなので、各LiveLoopが独立したTimerとして動くと長時間でズレる可能性がある。

例えば、

liveLoop("kick", async () => {
  play("C2");
  await sleep(0.5);
});
liveLoop("bass", async () => {
  play("E2");
  await sleep(0.5);
});

を setTimeout() ベースで実装すると、理論上同じ周期でも、

kick: 0.000  0.503  1.006  1.510 ...
bass: 0.002  0.506  1.011  1.516 ...

のようにズレる可能性がある。

Playgroundの音楽的な時間管理では、各LiveLoopが独立したWall Clockを持つのではなく、

全LiveLoopで共有するMusic Clock

を持つ。

⸻

beat()

音楽時間を進める基本APIとして beat() を検討する。

await beat(1);

は、

実時間で一定秒数待つ

ではなく、

現在のLoopのMusic Cursorを1拍進める

という意味にする。

例えばBPM 120なら、

1 beat = 0.5 sec

だが、User codeは秒数ではなく拍数で記述できる。

setBpm(120);
liveLoop("kick", async () => {
  play("C2");
  await beat(1);
});
liveLoop("bass", async () => {
  play("E2");
  await beat(0.5);
});

Concept:

Global Music Clock
beat
0        1        2        3
|--------|--------|--------|
kick
●        ●        ●        ●
bass
●    ●   ●    ●   ●    ●   ●

両方のLiveLoopは同じMusic Clockを基準にする。

⸻

Per-Loop Music Cursor

各LiveLoopは独自のTimerではなく、共有Music Clock上のCursorを持つ。

Concept:

loop.cursor = currentMusicBeat;

beat() 呼び出し時:

loop.cursor += beats;

例えば、

liveLoop("arp", async () => {
  play("C4");
  await beat(0.25);
  play("E4");
  await beat(0.25);
  play("G4");
  await beat(0.5);
});

内部的には、

cursor 0.00 -> C4
cursor 0.25 -> E4
cursor 0.50 -> G4
cursor 1.00 -> next iteration

となる。

実際の音は、このMusic Cursorを AudioContext.currentTime 等へ変換してscheduleする。

⸻

Music Clock and Audio Clock

将来的には、

Music Beat
    ↓
BPM conversion
    ↓
AudioContext.currentTime
    ↓
YM2612 event scheduling

という構成にする。

例えば、

function beatToSeconds(beats, bpm) {
  return beats * 60 / bpm;
}

ただし、User code側では秒への変換を意識させない。

⸻

sleep() and beat() Have Different Purposes

sleep() と beat() は両方残してもよい。

await sleep(0.1);

は実時間ベース。

用途:

* SE
* UI連動
* 実験的な音
* BPMに依存しない時間指定

一方、

await beat(0.25);

は音楽時間ベース。

用途:

* Rhythm
* Melody
* Bass
* Arpeggio
* 複数LiveLoop間の同期

Playgroundの音楽コードでは beat() を基本APIとして使う方が良い。

⸻

BPM

共有Music ClockはBPMを持つ。

Example:

setBpm(120);

または将来的に、

tempo(120);

なども検討できる。

初期版ではどちらか一つに統一する。

Concept:

setBpm(120);
liveLoop("kick", async () => {
  play("C2");
  await beat(1);
});

BPMを変更しても、

1 beat

という音楽上の意味は維持される。

⸻

BPM Change

BPM変更時に既存Loopの同期を壊さないこと。

悪い実装:

beat(1)
  ↓
setTimeout(500ms)

としてTimerを大量に独立生成すると、途中のBPM変更を反映しにくい。

可能なら、

Music beat position

と、

Audio time

の変換をScheduler側で管理する。

将来的にtempo automationを入れる場合も、この設計の方が拡張しやすい。

⸻

nextBeat()

共有Music Clockがあるなら、Quantize用APIも検討できる。

await nextBeat();

意味:

Global Music Clock上の次の整数Beatまで待つ。

例えば現在位置が、

3.37 beat

なら、

4.00 beat

まで進む。

Example:

liveLoop("bass", async () => {
  await nextBeat();
  play("E2");
  await beat(1);
});

⸻

nextBar()

小節単位のQuantizeも便利。

await nextBar();

4/4の場合:

bar boundaries
0        4        8        12
|--------|--------|--------|

現在が 6.3 beat なら次は 8.0 beat。

Example:

liveLoop("pad", async () => {
  await nextBar();
  play(chord("Eb3", "minor"));
  await beat(4);
});

⸻

Time Signature

初期版では4/4固定でもよい。

4 beats = 1 bar

将来的には、

setTimeSignature(3, 4);

などを検討できる。

ただし、初期Playgroundでは複雑にしすぎない。

⸻

sync()

LiveLoop同士の明示的な同期APIも将来的に検討する。

Example:

liveLoop("kick", async () => {
  play("C2");
  await beat(1);
});
liveLoop("bass", async () => {
  await sync("kick");
  play("E2");
  await beat(0.5);
});

sync("kick") は、対象LiveLoopのLoop boundaryやcueへ同期する。

ただし、共有Music Clock + nextBeat() / nextBar() だけでも多くのケースを解決できる。

初期版では sync() を必須にしなくてもよい。

⸻

LiveLoop Start Quantization

新しいLiveLoopを途中から追加した場合も考える。

例えば音楽が、

current beat = 7.63

で動いているときに、

liveLoop("hihat", async () => {
  play("hat");
  await beat(0.25);
});

を追加した場合、

即座に 7.63 から開始すると他Loopと位相がずれる可能性がある。

将来的には、

startAt: nextBeat
startAt: nextBar
startAt: immediate

などを検討できる。

初期版では、

新しいLiveLoopは次のBeat、または次のLoop Scheduler boundaryから開始

を候補とする。

⸻

Hot Reload and Music Quantization

Editor変更時のcallback hot swapもMusic Clockと統合できる。

現在の基本仕様:

次のLoop iterationでcallbackを差し替える。

将来的には、

nextLoop
nextBeat
nextBar

から選択できる。

例えば:

liveLoop("bass", async () => {
  ...
}, {
  updateAt: "nextBar",
});

Concept:

Editor changed
      ↓
new callback ready
      ↓
wait for next bar boundary
      ↓
swap callback

複数Loopを同時に変更した場合、次のBarで一斉に新しいコードへ切り替えられる。

これはLive Coding体験として重要。

⸻

Scheduler Concept

最終的には、

LiveLoop
   ↓
per-loop Music Cursor
   ↓
Global Music Clock
   ↓
Look-Ahead Scheduler
   ↓
AudioContext Clock
   ↓
YM2612 AudioWorklet

という構成を目指す。

各LiveLoopが setTimeout() だけで独立して動く設計にはしない。

⸻

Suggested User API

初期候補:

setBpm(120);
liveLoop("kick", async () => {
  play("C2");
  await beat(1);
});
liveLoop("bass", async () => {
  play(
    choose(scale("E2", "minorPentatonic"))
  );
  await beat(0.5);
});

必要に応じて:

await sleep(0.1);
await beat(0.25);
await nextBeat();
await nextBar();

将来的に:

await sync("kick");

⸻

Important Design Principle

beat() は単なる、

sleep(60 / bpm * beats);

のaliasとして実装しない方がよい。

表面上の初期実装が似ていても、意味としては、

sleep()
= Wall Clock based waiting
beat()
= Music Clock based scheduling

と分離しておく。

これにより、

* LiveLoop間の同期
* BPM変更
* Quantize
* Hot Reload
* Look-Ahead Scheduling
* AudioWorklet scheduling
* Game Loopからの分離

を後から自然に実装できる。

⸻

Core Idea

Tetorica FM2612 Playgroundの時間モデルは、

各LiveLoopが自分のTimerで走る

ではなく、

全LiveLoopが同じMusic Clockの上を走る

ことを基本とする。

              Global Music Clock
0       1       2       3       4
|-------|-------|-------|-------|
kick    ●       ●       ●       ●
bass    ●   ●   ●   ●   ●   ●   ●
hat     ● ● ● ● ● ● ● ● ● ● ● ●

User codeはシンプルなまま保つ。

liveLoop("bleeps", async () => {
  play(
    choose(scale("Eb2", "majorPentatonic"))
  );
  await beat(0.2);
});

内部ではMusic Clock、Scheduler、AudioContextを利用して同期を維持する。
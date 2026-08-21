import { MegaDriveSynth } from "../js/megasynth.js";

export function createVoices(
  voiceCount
) {
  return Array.from(
    { length: voiceCount },
    (_, channel) => ({
      channel,
      held: false,
      key: null,
      startedAt: 0,
    })
  );
}

export function attachOutputEnvelopeTap({
  megaSynth,
  onEnvelope,
}) {
  if (!megaSynth?.node) {
    return;
  }

  megaSynth.node.port.addEventListener(
    "message",
    (event) => {
      const message = event.data;

      if (
        message?.type !==
        "output-envelope"
      ) {
        return;
      }

      if (
        message.rmsValues instanceof
        Float32Array
      ) {
        onEnvelope(message.rmsValues);
        return;
      }

      if (
        Array.isArray(
          message.rmsValues
        )
      ) {
        onEnvelope(message.rmsValues);
      }
    }
  );
}

export function chooseVoice(voices) {
  const freeVoice = voices.find(
    (voice) => !voice.held
  );

  if (freeVoice) {
    return freeVoice;
  }

  let oldest = voices[0];

  for (const voice of voices) {
    if (
      voice.startedAt <
      oldest.startedAt
    ) {
      oldest = voice;
    }
  }

  return oldest;
}

export function resetVoiceState({
  voices,
  activeKeys,
  updateKeyboardVisuals,
}) {
  for (const voice of voices) {
    voice.held = false;
    voice.key = null;
    voice.startedAt = 0;
  }

  activeKeys.clear();
  updateKeyboardVisuals();
}

export function clearInputState({
  heldKeys,
  activePointers,
  voices,
  activeKeys,
  updateKeyboardVisuals,
  onCleared,
}) {
  heldKeys.clear();
  activePointers.clear();
  resetVoiceState({
    voices,
    activeKeys,
    updateKeyboardVisuals,
  });
  onCleared?.();
}

export function stopAllNotes({
  synth,
  voices,
  heldKeys,
  activePointers,
  activeKeys,
  updateKeyboardVisuals,
  onCleared,
}) {
  if (!synth) {
    return;
  }

  for (const voice of voices) {
    synth.noteOff(voice.channel);
  }

  clearInputState({
    heldKeys,
    activePointers,
    voices,
    activeKeys,
    updateKeyboardVisuals,
    onCleared,
  });
}

export async function initializeDirectAudio({
  audioContext,
  workletUrl,
  ym2612WasmUrl,
  setStatus,
}) {
  setStatus(
    "Loading YM2612 MegaDriveSynth..."
  );

  const megaSynth =
    new MegaDriveSynth({
      audioContext,
      workletUrl,
      ym2612WasmUrl,
    });

  await megaSynth.start();

  return {
    megaSynth,
    synth: megaSynth.fm,
  };
}

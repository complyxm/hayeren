import { useEffect, useRef, useState } from "react";
import type { VocabEntry } from "../../data/schemas/vocab";

/**
 * 語彙の読み上げ音声（暫定・eSpeak NG 合成）の再生。useAlphabetAudio と同じ方針。
 *
 * 音声はテーマごとに 1 本の WAV スプライト（public/audio/vocab/<theme>.wav）＋
 * タイミング JSON（同 .sprite.json）。クリップのキーは見出し語が entry.id、
 * 用例文が entry.id + "__ex"。スプライト未生成なら canPlay=false を返し、UI で
 * ボタンを出さない（`npm run build:audio:vocab` で生成）。
 *
 * DOM/Web API に触れるのでこのフックは features 層に置く（CLAUDE.md §8）。
 */
interface Clip {
  start: number;
  duration: number;
}

interface Sprite {
  clips: Record<string, Clip>;
}

const base = import.meta.env.BASE_URL;
const spriteUrl = (theme: string) => `${base}audio/vocab/${theme}.sprite.json`;
const wavUrl = (theme: string) => `${base}audio/vocab/${theme}.wav`;

const spritePromises = new Map<string, Promise<Sprite | null>>();

function loadSprite(theme: string): Promise<Sprite | null> {
  const cached = spritePromises.get(theme);
  if (cached) return cached;
  const promise = (async () => {
    if (typeof fetch !== "function") return null;
    try {
      const res = await fetch(spriteUrl(theme));
      if (!res.ok) return null;
      return (await res.json()) as Sprite;
    } catch {
      return null;
    }
  })();
  spritePromises.set(theme, promise);
  return promise;
}

interface VocabAudio {
  canPlayWord: boolean;
  canPlayExample: boolean;
  playWord: () => void;
  playExample: () => void;
}

export function useVocabAudio(entry: VocabEntry | undefined): VocabAudio {
  const [sprite, setSprite] = useState<Sprite | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const theme = entry?.theme;

  useEffect(() => {
    if (!theme) return;
    let active = true;
    void loadSprite(theme).then((s) => {
      if (active) setSprite(s);
    });
    return () => {
      active = false;
    };
  }, [theme]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  function playClip(key: string): void {
    if (!entry || !sprite || typeof Audio !== "function") return;
    const clip = sprite.clips[key];
    if (!clip) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(wavUrl(entry.theme));
      audioRef.current = audio;
    }
    const stopAt = clip.start + clip.duration;
    const onTimeUpdate = (): void => {
      if (audio.currentTime >= stopAt) {
        audio.pause();
        audio.removeEventListener("timeupdate", onTimeUpdate);
      }
    };
    audio.pause();
    audio.currentTime = clip.start;
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.play().catch(() => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
    });
  }

  return {
    canPlayWord: entry !== undefined && sprite?.clips[entry.id] !== undefined,
    canPlayExample: entry !== undefined && sprite?.clips[`${entry.id}__ex`] !== undefined,
    playWord: () => entry && playClip(entry.id),
    playExample: () => entry && playClip(`${entry.id}__ex`),
  };
}

import { useEffect, useRef, useState } from "react";

/**
 * 字母名の読み上げ音声（暫定・eSpeak NG 合成）の再生。
 *
 * 音声は 1 本の WAV スプライト（public/audio/alphabet.wav）＋タイミング JSON
 * （public/audio/alphabet.sprite.json）。スプライト未生成の環境では canPlay=false を
 * 返し、UI 側でボタンを出さない（`npm run build:audio` で生成する）。
 *
 * DOM/Web API に触れるのでこのフックは features 層に置く（CLAUDE.md §8：domain は
 * DOM 非依存）。
 */
interface Clip {
  start: number;
  duration: number;
}

interface Sprite {
  clips: Record<string, Clip>;
}

const SPRITE_URL = `${import.meta.env.BASE_URL}audio/alphabet.sprite.json`;
const WAV_URL = `${import.meta.env.BASE_URL}audio/alphabet.wav`;

let spritePromise: Promise<Sprite | null> | null = null;

function loadSprite(): Promise<Sprite | null> {
  if (spritePromise) return spritePromise;
  spritePromise = (async () => {
    if (typeof fetch !== "function") return null;
    try {
      const res = await fetch(SPRITE_URL);
      if (!res.ok) return null;
      return (await res.json()) as Sprite;
    } catch {
      return null;
    }
  })();
  return spritePromise;
}

export function useAlphabetAudio(letterId: string): { canPlay: boolean; play: () => void } {
  const [clip, setClip] = useState<Clip | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    void loadSprite().then((sprite) => {
      if (active) setClip(sprite?.clips[letterId] ?? null);
    });
    return () => {
      active = false;
    };
  }, [letterId]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  function play(): void {
    if (!clip || typeof Audio !== "function") return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(WAV_URL);
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

  return { canPlay: clip !== null, play };
}

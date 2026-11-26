import React, {useMemo} from 'react';
import {Video} from '@remotion/media';
import {presenterKey} from './presenter-key';

export type ChromaKey = {
  color?: string;
  similarity?: number;
  softness?: number;
  spillSuppression?: number;
};

type PresenterProps = {
  src: string;
  trimBefore: number;
  durationInFrames: number;
  fit?: 'cover' | 'contain';
  focus?: {xPct: number; yPct: number};
  chromaKey: ChromaKey;
};

export function KeyedPresenter({src, trimBefore, durationInFrames, fit = 'cover', focus, chromaKey}: PresenterProps) {
  const {color = '#00ff00', similarity = 0.18, softness = 0.08, spillSuppression = 0.25} = chromaKey;
  const effects = useMemo(() => [
    presenterKey({keyColor: color, similarity, smoothness: softness, spillSuppression}),
  ], [color, similarity, softness, spillSuppression]);

  return (
    <Video src={src} trimBefore={trimBefore} durationInFrames={durationInFrames} muted effects={effects}
      disallowFallbackToOffthreadVideo objectFit={fit}
      style={{width: '100%', height: '100%', objectPosition: `${focus?.xPct ?? 50}% ${focus?.yPct ?? 50}%`}}/>
  );
}

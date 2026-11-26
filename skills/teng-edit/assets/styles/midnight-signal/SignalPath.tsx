import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {MidnightSignalProps} from './Scene';

export function SignalPath({headline, detail = '', durationInFrames}: MidnightSignalProps) {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const labels = detail.split('\n').slice(0, 3);
  const unit = Math.min(width, height * 1.65);
  const node = unit * .085;
  const progress = interpolate(frame / Math.max(1, durationInFrames - 1), [.1, .88], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{
    justifyContent: 'center', alignItems: 'center', color: '#e9f2fa', overflow: 'hidden',
    fontFamily: 'Arial, Helvetica, sans-serif',
    backgroundColor: '#0b1829',
    backgroundImage: 'linear-gradient(#76aac210 1px, transparent 1px), linear-gradient(90deg, #76aac210 1px, transparent 1px), radial-gradient(ellipse at center, #1b354a, #081322 80%)',
    backgroundSize: `${unit * .057}px ${unit * .057}px, ${unit * .057}px ${unit * .057}px, 100% 100%`,
  }}>
    <div style={{width: '88%', textAlign: 'center', fontSize: Math.min(unit * .082, width * 1.48 / Math.max(8, headline.length)),
      fontWeight: 700, lineHeight: 1.05, letterSpacing: '-.03em', textWrap: 'balance'}}>{headline}</div>
    <div style={{position: 'relative', width: '68%', height: node * 2.3, marginTop: unit * .065}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: node / 2, height: Math.max(1, unit * .004),
        background: `linear-gradient(90deg, #e7b466 ${progress * 100}%, #54768a ${progress * 100}%)`}}/>
      {[0, .5, 1].map((position, index) => {
        const color = position <= progress ? '#f3c779' : '#83b6cc';
        return <div key={position} style={{position: 'absolute', left: `${position * 100}%`, width: '46%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: node * .22}}>
          <div style={{width: node, height: node, boxSizing: 'border-box', borderRadius: '50%', display: 'grid', placeItems: 'center',
            background: '#152d42', border: `${unit * .004}px solid ${color}`}}>
            <div style={{width: node * .24, height: node * .24, backgroundColor: color}}/>
          </div>
          <div style={{fontSize: unit * .04, color: '#d4e3ed', textAlign: 'center', textWrap: 'balance'}}>{labels[index]}</div>
        </div>;
      })}
      <div style={{position: 'absolute', left: `${progress * 100}%`, top: node / 2, width: node * .21, height: node * .21,
        borderRadius: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff1c6',
        boxShadow: `0 0 ${node * .16}px ${node * .08}px #ffb844, 0 0 ${node * .45}px #ffbc5b`}}/>
    </div>
  </AbsoluteFill>;
}

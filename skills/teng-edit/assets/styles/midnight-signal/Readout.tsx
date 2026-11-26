import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {MidnightSignalProps} from './Scene';

export function Readout({headline, detail, durationInFrames}: MidnightSignalProps) {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const widePanel = width >= height;
  const travel = frame / Math.max(1, durationInFrames - 1);
  const reveal = interpolate(frame, [0, Math.max(1, Math.min(durationInFrames - 1, fps * .35))], [0, 1], {
    easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const fontSize = Math.min(width * .145, height * .32, width * 1.65 / Math.max(8, headline.length));
  const trackY = widePanel ? 74 : 34;
  const lightSize = Math.min(width, height) * .021;
  return <AbsoluteFill style={{
    overflow: 'hidden', color: '#a1e1ff', fontFamily: 'Arial, Helvetica, sans-serif',
    background: 'radial-gradient(ellipse at 55% 24%, #253b51 0%, #152437 29%, #0b1628 67%, #060d1a 100%)',
  }}>
    <div style={{
      position: 'absolute', inset: '-3%',
      background: 'linear-gradient(109deg, transparent 13.6%, #7999ae15 13.8%, transparent 14.1%, transparent 84%, #02061088 84.2%, transparent 84.8%)',
      transform: `translateX(${travel * width * .018}px)`,
    }}/>
    <div style={{position: 'absolute', left: '7%', right: '7%', top: `${widePanel ? 42 : 19}%`,
      textAlign: 'center', transform: `translateY(calc(-50% + ${(1 - reveal) * fontSize * .12}px))`}}>
      {detail && <div style={{fontSize: Math.min(width * .034, height * .07), marginBottom: fontSize * .13,
        fontWeight: 600, color: '#cfdeea', opacity: .9}}>{detail}</div>}
      <div style={{fontSize, fontWeight: 800, lineHeight: 1.03, letterSpacing: '-.035em',
        overflowWrap: 'anywhere', textWrap: 'balance',
        textShadow: `0 0 ${fontSize * (.14 + reveal * .09)}px #5eb9ff88`}}>{headline}</div>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: `${trackY}%`, height: 1,
      background: 'linear-gradient(90deg, transparent, #8ec6e755, transparent)'}}/>
    <div style={{position: 'absolute', top: `${trackY}%`, left: `${11 + travel * 75}%`,
      width: lightSize, height: lightSize, transform: 'translate(-50%, -50%)', borderRadius: '50%',
      background: '#fff3ca', boxShadow: `0 0 ${lightSize * .35}px #fff, 0 0 ${lightSize}px ${lightSize * .35}px #ffb637, 0 0 ${lightSize * 3.2}px ${lightSize}px #ef9d3155`}}/>
  </AbsoluteFill>;
}

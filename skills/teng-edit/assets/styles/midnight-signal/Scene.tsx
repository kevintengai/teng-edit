import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame, useRemotionEnvironment, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {buildPhoneSet} from './phone';
import {Readout} from './Readout';
import {SignalPath} from './SignalPath';

export const scenes = {readout: Readout, signal: SignalPath};

export type MidnightSignalProps = {
  headline: string;
  detail?: string;
  durationInFrames: number;
};

function Director({headline, detail, progress}: {headline: string; detail: string; progress: number}) {
  const {scene, camera, gl, invalidate} = useThree();
  const set = useRef<ReturnType<typeof buildPhoneSet> | null>(null);

  useLayoutEffect(() => {
    const shot = buildPhoneSet(scene, gl, headline, detail);
    set.current = shot;
    return () => { shot.dispose(); set.current = null; };
  }, [scene, gl, headline, detail]);

  useLayoutEffect(() => {
    set.current?.pose(progress, camera as THREE.PerspectiveCamera);
    invalidate();
  }, [progress, camera, invalidate, headline, detail, scene, gl]);

  return null;
}

const lens = {fov: 42, near: 0.04, far: 80, position: [0, 1.6, 3.7] as [number, number, number]};
const context = {alpha: false, antialias: true, powerPreference: 'high-performance' as const};

export default function Scene({headline, detail = '', durationInFrames}: MidnightSignalProps) {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {isRendering} = useRemotionEnvironment();
  const progress = THREE.MathUtils.clamp(frame / Math.max(1, durationInFrames - 1), 0, 1);
  return (
    <AbsoluteFill style={{backgroundColor: '#081020'}}>
      <ThreeCanvas width={width} height={height} camera={lens} gl={context}
        dpr={isRendering ? 1 : 0.75} frameloop="demand">
        <Director headline={headline} detail={detail} progress={progress}/>
      </ThreeCanvas>
    </AbsoluteFill>
  );
}

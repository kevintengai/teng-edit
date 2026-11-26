import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame, useRemotionEnvironment, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {buildPressSet} from './pressSet';
import type {MidnightSignalProps} from './Scene';

function PressDirector({progress, wide}: {progress: number; wide: boolean}) {
  const {scene, camera, invalidate, size} = useThree();
  const press = useRef<ReturnType<typeof buildPressSet> | null>(null);
  useLayoutEffect(() => {
    const subject = buildPressSet(scene);
    press.current = subject;
    return () => { subject.dispose(); press.current = null; };
  }, [scene]);
  useLayoutEffect(() => {
    const lens = camera as THREE.OrthographicCamera;
    const viewWidth = Math.max(6.28 / (wide ? .55 : .89), 4.08 * size.width / (size.height * (wide ? .83 : .39)));
    const viewHeight = viewWidth * size.height / size.width;
    const centerX = wide ? -.20 * viewWidth : 0;
    const centerY = wide ? 0 : .012 * viewHeight;
    lens.left = -viewWidth / 2;
    lens.right = viewWidth / 2;
    lens.top = viewHeight / 2;
    lens.bottom = -viewHeight / 2;
    lens.position.set(centerX, centerY, 12);
    lens.lookAt(centerX, centerY, 0);
    lens.updateProjectionMatrix();
    press.current?.pose(progress);
    invalidate();
  }, [scene, camera, invalidate, size.width, size.height, wide, progress]);
  return null;
}

const lens = {near: .1, far: 35, position: [0, 0, 12] as [number, number, number]};
const context = {alpha: true, antialias: true, powerPreference: 'high-performance' as const};

export function PressProof({headline, detail = '', durationInFrames}: MidnightSignalProps) {
  const {width, height} = useVideoConfig();
  const frame = useCurrentFrame();
  const {isRendering} = useRemotionEnvironment();
  const wide = width / height >= 1.05;
  const copyWidth = width * (wide ? .34 : .83);
  const longestWord = Math.max(1, ...headline.split(/\s+/).map(word => word.length));
  const titleSize = Math.min(copyWidth * .167, height * (wide ? .175 : .073),
    copyWidth * 1.60 / longestWord, copyWidth * 3.10 / Math.max(1, headline.length));
  const progress = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  return <AbsoluteFill style={{overflow: 'hidden', fontFamily: "var(--teng-display-font, Impact, 'Arial Narrow', sans-serif)",
    backgroundColor: '#0a1426', backgroundImage: 'radial-gradient(ellipse at 63% 43%, #203852 0%, #14253b 38%, #091426 76%, #060e1b 100%)'}}>
    <ThreeCanvas width={width} height={height} camera={lens} orthographic gl={context}
      frameloop="demand" dpr={isRendering ? 1 : .85}>
      <PressDirector progress={progress} wide={wide}/>
    </ThreeCanvas>
    <div style={{position: 'absolute', left: wide ? '5.5%' : '8.5%', width: copyWidth,
      top: wide ? '50%' : '11.5%', transform: wide ? 'translateY(-50%)' : undefined}}>
      <div style={{fontSize: titleSize, lineHeight: 1.10, textTransform: 'uppercase', color: '#ffc247',
        textShadow: '0 0 .13em #ffae2929', textWrap: 'balance', overflowWrap: 'anywhere'}}>{headline}</div>
      {detail && <div style={{fontSize: Math.min(copyWidth * .061, height * .066, copyWidth * 2.5 / Math.max(1, detail.length)),
        marginTop: titleSize * .16, color: '#edf5ff', lineHeight: 1.19, whiteSpace: 'pre-line', textWrap: 'pretty',
        overflowWrap: 'anywhere'}}>{detail}</div>}
    </div>
  </AbsoluteFill>;
}

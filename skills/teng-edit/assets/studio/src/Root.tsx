import React from 'react';
import {AbsoluteFill, Composition, Html5Audio, OffthreadVideo, Sequence, staticFile, useVideoConfig} from 'remotion';
import * as look from './look/Scene';
import raw from './timeline.json';
import {readTimeline, type Insert, type SceneProps} from './timeline';

// Keep optional insert variants with the reusable look so a saved bundle carries its own scene keys.
const variants = 'scenes' in look ? look.scenes as Record<string, React.ComponentType<SceneProps>> : {};
const scenes: Record<string, React.ComponentType<SceneProps>> = {...variants, look: look.default};
const edit = readTimeline(raw, Object.keys(scenes));
const defaultBox = {leftPct: 55, topPct: 10, widthPct: 38};

function InsertPicture({item}: {item: Insert}) {
  const {width, height} = useVideoConfig();
  const Scene = scenes[item.scene];
  const props = {headline: item.headline, detail: item.detail, durationInFrames: item.durationInFrames};
  if (item.mode === 'full') {
    return <AbsoluteFill style={{backgroundColor: '#080b10'}}><Scene {...props}/></AbsoluteFill>;
  }
  const box = item.box ?? defaultBox;
  return <div style={{
    position: 'absolute', left: width * box.leftPct / 100, top: height * box.topPct / 100,
    pointerEvents: 'none', width, height, transformOrigin: 'top left', transform: `scale(${box.widthPct / 100})`,
    overflow: 'hidden',
  }}><Scene {...props}/></div>;
}

const Edit: React.FC = () => {
  const {width, height} = useVideoConfig();
  const captionSize = Math.round(Math.min(width * .0473, height * .084));
  return <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#080b10'}}>
    {edit.cuts.map(cut => (
      <Sequence key={cut.from} from={cut.from} durationInFrames={cut.durationInFrames} name={`${cut.media.id} [${cut.inFrame}, ${cut.outFrame})`}>
        {cut.view === 'voiceover'
          ? <Html5Audio src={staticFile(cut.media.file)} trimBefore={cut.inFrame} durationInFrames={cut.durationInFrames}/>
          : <OffthreadVideo src={staticFile(cut.media.file)} trimBefore={cut.inFrame} durationInFrames={cut.durationInFrames}
              style={{width: '100%', height: '100%', objectFit: cut.fit ?? 'cover',
                objectPosition: `${cut.focus?.xPct ?? 50}% ${cut.focus?.yPct ?? 50}%`}}/>}
      </Sequence>
    ))}
    {(['full', 'overlay'] as const).map(mode => edit.inserts.filter(item => item.mode === mode).map(item => (
      <Sequence key={`${mode}-${item.from}`} from={item.from} durationInFrames={item.durationInFrames} name={item.headline}>
        <InsertPicture item={item}/>
      </Sequence>
    )))}
    {edit.captions.map(caption => (
      <Sequence key={caption.from} from={caption.from} durationInFrames={caption.durationInFrames} name={caption.text}>
        <div style={{position: 'absolute', left: '8%', right: '8%', top: '69.8%', textAlign: 'center',
          color: 'white', fontFamily: 'Impact, "Arial Narrow", "Helvetica Neue Condensed", sans-serif',
          fontWeight: 700, fontSize: captionSize, lineHeight: 1.1, whiteSpace: 'pre-line', textWrap: 'balance',
          WebkitTextStroke: `${captionSize * .053}px #0b0c12`, paintOrder: 'stroke fill',
          textShadow: '0 3px 8px #000, 0 0 16px #080d18'}}>
          {caption.text}
        </div>
      </Sequence>
    ))}
  </AbsoluteFill>;
};

export const Root: React.FC = () => (
  <Composition id="TengEdit" component={Edit} width={edit.width} height={edit.height}
    fps={edit.fps} durationInFrames={edit.durationInFrames}/>
);

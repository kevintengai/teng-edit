import React from 'react';
import {AbsoluteFill, Composition, Html5Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {KeyedPresenter} from './KeyedPresenter';
import {displayFont, useDisplayFont} from './display-font';
import * as look from './look/Scene';
import raw from './timeline.json';
import {captionRuns, readTimeline, type Insert, type SceneProps} from './timeline';

// Keep optional insert variants with the reusable look so a saved bundle carries its own scene keys.
const variants = 'scenes' in look ? look.scenes as Record<string, React.ComponentType<SceneProps>> : {};
const scenes: Record<string, React.ComponentType<SceneProps>> = {...variants, look: look.default};
const edit = readTimeline(raw, Object.keys(scenes));
const defaultBox = {leftPct: 55, topPct: 10, widthPct: 38};
const presenterLayouts = edit.inserts.filter(item => item.mode === 'split' || item.mode === 'behind');
const layer = {behind: 0, full: 2, split: 2, overlay: 3};

function splitHeight(item: Insert, height: number) {
  return Math.max(1, Math.min(height - 1, Math.round(height * (item.topPct ?? 35) / 100)));
}

function usePresenterLayout(sequenceFrom: number) {
  const frame = sequenceFrom + useCurrentFrame();
  return presenterLayouts.find(item => frame >= item.from && frame < item.from + item.durationInFrames);
}

function InsertPicture({item}: {item: Insert}) {
  const {width, height} = useVideoConfig();
  const Scene = scenes[item.scene];
  const props = {headline: item.headline, detail: item.detail, durationInFrames: item.durationInFrames};
  if (item.mode === 'split') {
    const topHeight = splitHeight(item, height);
    return <>
      <Sequence width={width} height={topHeight} showInTimeline={false} style={{overflow: 'hidden', backgroundColor: '#080b10'}}>
        <Scene {...props}/>
      </Sequence>
      {item.seamTitle && <div style={{
        position: 'absolute', left: '8%', right: '8%', top: topHeight, transform: 'translateY(-50%)',
        textAlign: 'center', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 600,
        color: '#111318', fontSize: Math.min(width * .064, height * .072), lineHeight: 1.15, textWrap: 'balance',
      }}>
        <span style={{backgroundColor: '#fff', borderRadius: '.18em', padding: '.04em .28em',
          boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone'}}>{item.seamTitle}</span>
      </div>}
    </>;
  }
  if (item.mode !== 'overlay') {
    return <AbsoluteFill style={{backgroundColor: '#080b10'}}><Scene {...props}/></AbsoluteFill>;
  }
  const box = item.box ?? defaultBox;
  return <div style={{
    position: 'absolute', left: width * box.leftPct / 100, top: height * box.topPct / 100,
    pointerEvents: 'none', width, height, transformOrigin: 'top left', transform: `scale(${box.widthPct / 100})`,
    overflow: 'hidden',
  }}><Scene {...props}/></div>;
}

function CameraPicture({cut}: {cut: (typeof edit.cuts)[number]}) {
  const {height} = useVideoConfig();
  const layout = usePresenterLayout(cut.from);
  const panelTop = layout?.mode === 'split' ? splitHeight(layout, height)
    : height - Math.max(1, Math.round(height * (layout?.presenterHeightPct ?? 100) / 100));
  const src = staticFile(cut.media.file);
  const key = cut.media.chromaKey;
  return <div style={{position: 'absolute', top: panelTop, left: 0, right: 0, bottom: 0, overflow: 'hidden'}}>
    <OffthreadVideo src={src} trimBefore={cut.inFrame} durationInFrames={cut.durationInFrames}
      transparent={cut.media.transparent} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: key ? 0 : 1,
        objectFit: cut.fit ?? 'cover', objectPosition: `${cut.focus?.xPct ?? 50}% ${cut.focus?.yPct ?? 50}%`}}/>
    {key && <div style={{position: 'absolute', inset: 0}}>
      <KeyedPresenter src={src} trimBefore={cut.inFrame} durationInFrames={cut.durationInFrames}
        fit={cut.fit} focus={cut.focus} chromaKey={key}/>
    </div>}
  </div>;
}

function Caption({caption}: {caption: (typeof edit.captions)[number]}) {
  const {width, height} = useVideoConfig();
  const layout = usePresenterLayout(caption.from);
  const panelTop = layout?.mode === 'split' ? splitHeight(layout, height) : 0;
  const captionTop = panelTop ? panelTop + (height - panelTop) * .60 : height * .71;
  const captionSize = Math.max(1, Math.round(Math.min(width * .0525, height * .084)));
  const runs = React.useMemo(() => captionRuns(caption.text, caption.emphasis), [caption]);
  return <div style={{position: 'absolute', left: '7%', right: '7%', top: caption.topPct === undefined ? captionTop : `${caption.topPct}%`, textAlign: 'center',
    color: '#f7f8fa', fontFamily: displayFont, fontWeight: 400, fontSize: captionSize, lineHeight: 1.16,
    whiteSpace: 'pre-wrap', textWrap: 'balance', overflowWrap: 'anywhere',
    WebkitTextStroke: '.115em #080a11', paintOrder: 'stroke fill',
    textShadow: '0 .06em .08em #03050a, 0 .02em .14em #03050a'}}>
    {runs.map((run, index) =>
      <span key={index} style={{color: run.highlighted ? '#ffba21' : undefined}}>{run.text}</span>
    )}
  </div>;
}

const Edit: React.FC = () => {
  const fontReady = useDisplayFont();
  if (!fontReady) return null;
  const style: React.CSSProperties & {'--teng-display-font': string} = {
    overflow: 'hidden', backgroundColor: '#080b10', '--teng-display-font': displayFont,
  };
  return <AbsoluteFill style={style}>
    {edit.cuts.map(cut => (
      <Sequence key={cut.from} from={cut.from} durationInFrames={cut.durationInFrames}
        name={`${cut.media.id} [${cut.inFrame}, ${cut.outFrame})`} style={{zIndex: 1}}>
        {cut.view === 'voiceover'
          ? <Html5Audio src={staticFile(cut.media.file)} trimBefore={cut.inFrame} durationInFrames={cut.durationInFrames}/>
          : <CameraPicture cut={cut}/>}
      </Sequence>
    ))}
    {edit.inserts.map(item => (
      <Sequence key={`${item.mode}-${item.from}`} from={item.from} durationInFrames={item.durationInFrames}
        name={item.headline} style={{zIndex: layer[item.mode]}}>
        <InsertPicture item={item}/>
      </Sequence>
    ))}
    {edit.captions.map(caption => (
      <Sequence key={caption.from} from={caption.from} durationInFrames={caption.durationInFrames} name={caption.text} style={{zIndex: 4}}>
        <Caption caption={caption}/>
      </Sequence>
    ))}
  </AbsoluteFill>;
};

export const Root: React.FC = () => (
  <Composition id="TengEdit" component={Edit} width={edit.width} height={edit.height}
    fps={edit.fps} durationInFrames={edit.durationInFrames}/>
);

import {z} from 'zod';

const frame = z.int().nonnegative();
const length = z.int().positive();
const text = z.string().trim().min(1);
const pct = z.number().min(0).max(100);
const file = z.string().min(1).refine(value =>
  !/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(value) && !/[\\?#]/.test(value)
  && value.split('/').every(part => part !== '' && part !== '.' && part !== '..'),
  'Use a path relative to public, with forward slashes.'
);

const source = z.strictObject({
  id: text,
  file,
  kind: z.enum(['video', 'audio']),
  durationInFrames: length,
});

const cut = z.strictObject({
  source: text,
  inFrame: frame,
  outFrame: length,
  view: z.enum(['camera', 'voiceover']),
  fit: z.enum(['cover', 'contain']).optional(),
  focus: z.strictObject({xPct: pct, yPct: pct}).optional(),
});

const insert = z.strictObject({
  from: frame,
  durationInFrames: length,
  mode: z.enum(['full', 'overlay']),
  headline: text,
  detail: z.string().optional(),
  scene: text.default('look'),
  box: z.strictObject({leftPct: pct, topPct: pct, widthPct: pct.positive()}).optional(),
});

const caption = z.strictObject({
  from: frame,
  durationInFrames: length,
  text,
});

const schema = z.strictObject({
  width: length,
  height: length,
  fps: z.number().positive(),
  durationInFrames: length.optional(),
  sources: z.array(source),
  cuts: z.array(cut),
  inserts: z.array(insert),
  captions: z.array(caption),
});

type Span = {from: number; durationInFrames: number};
export type Insert = z.infer<typeof insert>;
export type SceneProps = {headline: string; detail?: string; durationInFrames: number};

function validateLane(name: string, spans: Span[], duration: number) {
  let previousEnd = 0;
  for (const item of [...spans].sort((a, b) => a.from - b.from)) {
    const end = item.from + item.durationInFrames;
    if (end > duration) throw new Error(`${name} at frame ${item.from} ends at ${end}, past the output end ${duration}.`);
    if (item.from < previousEnd) throw new Error(`${name} at frame ${item.from} overlaps the preceding item, which ends at ${previousEnd}.`);
    previousEnd = end;
  }
}

export function readTimeline(raw: unknown, sceneNames: readonly string[] = ['look']) {
  const data = schema.parse(raw);
  const sources = new Map(data.sources.map(item => [item.id, item]));
  if (sources.size !== data.sources.length) throw new Error('Each source needs a unique id.');

  let sourceCutDuration = 0;
  const cuts = data.cuts.map((item, index) => {
    const media = sources.get(item.source);
    if (!media) throw new Error(`Cut ${index + 1} refers to unknown source "${item.source}".`);
    if (item.outFrame <= item.inFrame || item.outFrame > media.durationInFrames) {
      throw new Error(`Cut ${index + 1} has an invalid source interval [${item.inFrame}, ${item.outFrame}) in "${item.source}" (${media.durationInFrames} frames).`);
    }
    if (item.view === 'camera' && media.kind !== 'video') throw new Error(`Cut ${index + 1} requires a video source for camera view.`);
    if (item.view === 'voiceover' && (item.fit || item.focus)) throw new Error(`Cut ${index + 1} uses picture framing on an audio-only view.`);
    const from = sourceCutDuration;
    const durationInFrames = item.outFrame - item.inFrame;
    sourceCutDuration += durationInFrames;
    return {...item, media, from, durationInFrames};
  });

  const durationInFrames = sourceCutDuration || data.durationInFrames;
  if (!durationInFrames) throw new Error('Set durationInFrames for an animation-only timeline.');
  if (data.durationInFrames !== undefined && data.durationInFrames !== durationInFrames) {
    throw new Error(`The declared duration ${data.durationInFrames} differs from the ${sourceCutDuration} source-cut frames. Omit it to derive the duration.`);
  }
  for (const item of data.inserts) {
    if (!sceneNames.includes(item.scene)) throw new Error(`Unknown animation "${item.scene}" at output frame ${item.from}.`);
    if (item.box && item.mode !== 'overlay') throw new Error('Set box only on an overlay insert.');
    if (item.box && (item.box.leftPct + item.box.widthPct > 100 || item.box.topPct + item.box.widthPct > 100)) {
      throw new Error(`Overlay at frame ${item.from} extends past the output canvas.`);
    }
  }
  validateLane('Full-screen insert', data.inserts.filter(item => item.mode === 'full'), durationInFrames);
  validateLane('Overlay insert', data.inserts.filter(item => item.mode === 'overlay'), durationInFrames);
  validateLane('Caption', data.captions, durationInFrames);
  return {...data, cuts, durationInFrames};
}

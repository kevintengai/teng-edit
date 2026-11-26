import {useEffect, useState} from 'react';
import {staticFile, useDelayRender} from 'remotion';

export const displayFont = 'Anton, Impact, "Arial Narrow", sans-serif';
let pending: Promise<void> | undefined;

function loadDisplayFont() {
  if (!pending) {
    const url = staticFile('fonts/Anton-Regular.ttf');
    const face = new FontFace('Anton', `url("${url}") format("truetype")`, {weight: '400'});
    pending = face.load().then(loaded => { document.fonts.add(loaded); });
  }
  return pending;
}

export function useDisplayFont() {
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handle = delayRender('Load the bundled Anton typeface');
    let active = true;
    loadDisplayFont().then(() => {
      if (active) {
        setReady(true);
        continueRender(handle);
      }
    }, error => { if (active) cancelRender(error); });
    return () => {
      active = false;
      continueRender(handle);
    };
  }, [delayRender, continueRender, cancelRender]);
  return ready;
}

function noAutoplayAudioEvaluate(
  node: HTMLMediaElement,
  options: any
): boolean | undefined {
  const hasControls = node.hasAttribute('controls');

  /**
   * if the media loops then we only need to know if it has controls, regardless
   * of the duration
   */
  if (node.hasAttribute('loop')) {
    return hasControls;
  }

  /**
   * if duration cannot be read, this means `preloadMedia` has failed
   */
  if (!node.duration) {
    console.warn(`axe.utils.preloadMedia did not load metadata`);
    return undefined;
  }

  /**
   * Compute playable duration and verify if it within allowed duration
   */
  const { allowedDuration = 3 } = options;
  const playableDuration = getPlayableDuration(node);
  if (playableDuration <= allowedDuration) {
    return true;
  }

  /**
   * if media element does not provide controls mechanism
   * -> fail
   */
  if (!hasControls) {
    return false;
  }

  return true;

  /**
   * Compute playback duration
   */
  function getPlayableDuration(elm: HTMLMediaElement): number {
    if (!elm.currentSrc) {
      return 0;
    }

    const playbackRange = getPlaybackRange(elm.currentSrc);
    if (!playbackRange) {
      return Math.abs(elm.duration - (elm.currentTime || 0));
    }

    if (playbackRange.length === 1) {
      return Math.abs(elm.duration - playbackRange[0]!);
    }

    return Math.abs(playbackRange[1]! - playbackRange[0]!);
  }

  function getPlaybackRange(src: string): number[] | undefined {
    const match = src.match(/#t=(.*)/);
    if (!match) {
      return;
    }
    const [, value] = match;
    const ranges = value!.split(',');

    return ranges.map(range => {
      // range is denoted in HH:MM:SS -> convert to seconds
      if (/:/.test(range)) {
        return convertHourMinSecToSeconds(range);
      }
      return parseFloat(range);
    });
  }

  function convertHourMinSecToSeconds(hhMmSs: string): number {
    const parts = hhMmSs.split(':');
    let secs = 0;
    let mins = 1;

    while (parts.length > 0) {
      secs += mins * parseInt(parts.pop()!, 10);
      mins *= 60;
    }

    return parseFloat(String(secs));
  }
}

export default noAutoplayAudioEvaluate;

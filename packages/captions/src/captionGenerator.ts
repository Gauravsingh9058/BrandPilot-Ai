import type {
  ReelProductionPlan,
  CaptionCue,
  CaptionStyle,
  CaptionStyleConfig
} from '@vidsnapai/types';

export class CaptionGenerator {
  /**
   * Generates timed CaptionCue segments aligned to narration and scene boundaries.
   */
  static generateCues(
    reelPlan: ReelProductionPlan,
    styleConfig?: CaptionStyleConfig
  ): CaptionCue[] {
    const cues: CaptionCue[] = [];
    const scenes = reelPlan.scenes || [];
    const scriptSegments = reelPlan.script || [];
    const maxWords = styleConfig?.maxWordsPerLine || 4;

    let currentTimelineOffset = 0;

    if (scenes.length > 0) {
      for (const scene of scenes) {
        const sceneDuration = scene.durationSeconds || 4;
        const narration = scene.narration || scene.onScreenText || '';
        const sceneStart = currentTimelineOffset;
        const sceneEnd = currentTimelineOffset + sceneDuration;

        if (narration.trim()) {
          const words = narration.trim().split(/\s+/);
          const totalWords = words.length;

          // Split words into small kinetic bursts
          const bursts: string[] = [];
          for (let i = 0; i < totalWords; i += maxWords) {
            bursts.push(words.slice(i, i + maxWords).join(' '));
          }

          const burstDuration = sceneDuration / Math.max(1, bursts.length);

          bursts.forEach((burstText, bIdx) => {
            const cueStart = Number((sceneStart + bIdx * burstDuration).toFixed(2));
            const cueEnd = Number(Math.min(sceneEnd, cueStart + burstDuration).toFixed(2));

            let style: CaptionStyle = 'STANDARD';
            if (scene.visualType === 'CTA') {
              style = 'CTA';
            } else if (bIdx === 0 && scene.sceneNumber === 1) {
              style = 'WORD_HIGHLIGHT'; // Hook burst highlight
            } else if (scene.emphasis && burstText.toLowerCase().includes(scene.emphasis.toLowerCase())) {
              style = 'EMPHASIS';
            }

            cues.push({
              id: `cue-${scene.sceneNumber}-${bIdx + 1}`,
              startTime: cueStart,
              endTime: Math.max(cueStart + 0.3, cueEnd),
              text: burstText,
              style,
              emphasis: scene.emphasis || null,
              sceneNumber: scene.sceneNumber
            });
          });
        } else if (scene.onScreenText) {
          // Fallback cue using on-screen text
          cues.push({
            id: `cue-${scene.sceneNumber}-1`,
            startTime: Number(sceneStart.toFixed(2)),
            endTime: Number(sceneEnd.toFixed(2)),
            text: scene.onScreenText,
            style: scene.visualType === 'CTA' ? 'CTA' : 'WORD_HIGHLIGHT',
            emphasis: scene.emphasis || null,
            sceneNumber: scene.sceneNumber
          });
        }

        currentTimelineOffset += sceneDuration;
      }
    } else if (scriptSegments.length > 0) {
      // Fallback using script segments if scenes not populated
      for (let sIdx = 0; sIdx < scriptSegments.length; sIdx++) {
        const seg = scriptSegments[sIdx];
        const segDuration = seg.estimatedDuration || 4;
        const segStart = currentTimelineOffset;
        const segEnd = currentTimelineOffset + segDuration;

        cues.push({
          id: `cue-seg-${sIdx + 1}`,
          startTime: Number(segStart.toFixed(2)),
          endTime: Number(segEnd.toFixed(2)),
          text: seg.text,
          style: seg.purpose.toLowerCase().includes('cta') ? 'CTA' : 'STANDARD',
          emphasis: null,
          sceneNumber: sIdx + 1
        });

        currentTimelineOffset += segDuration;
      }
    }

    // Validate and sanitize timing
    return this.validateAndSanitizeCues(cues, reelPlan.durationSeconds || 30);
  }

  /**
   * Enforces strict chronological bounds and timing safety on caption cues.
   */
  static validateAndSanitizeCues(
    cues: CaptionCue[],
    totalDurationSeconds: number
  ): CaptionCue[] {
    const sanitized: CaptionCue[] = [];

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      let startTime = Math.max(0, cue.startTime);
      let endTime = Math.min(totalDurationSeconds + 2, Math.max(startTime + 0.2, cue.endTime));

      // Ensure no backward time progression
      if (sanitized.length > 0) {
        const prev = sanitized[sanitized.length - 1];
        if (startTime < prev.startTime) {
          startTime = prev.endTime;
        }
        if (endTime <= startTime) {
          endTime = startTime + 0.5;
        }
      }

      sanitized.push({
        ...cue,
        startTime: Number(startTime.toFixed(2)),
        endTime: Number(endTime.toFixed(2))
      });
    }

    return sanitized;
  }
}

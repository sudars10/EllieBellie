import { buildAiSummaryBlocks } from '../lib/aiSummary';

describe('ai summary blocks', () => {
  it('returns all summary tiers', () => {
    const blocks = buildAiSummaryBlocks({
      headline: 'Markets rally after inflation cools in latest report',
      coverageCount: 3,
      sourceNames: ['Reuters', 'Bloomberg', 'WSJ'],
      latestPublishedAt: '2026-03-01T12:15:00Z',
    });

    expect(blocks.map((block) => block.id)).toEqual(['10-sec', '1-min', 'deep-dive']);
    expect(blocks[0].text).toContain('3 sources');
    expect(blocks[1].text).toContain('Markets rally after inflation cools in latest report');
  });
});

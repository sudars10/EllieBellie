export interface SummaryStoryContext {
  headline: string;
  coverageCount: number;
  sourceNames: string[];
  latestPublishedAt?: string;
}

export interface AiSummaryBlock {
  id: '10-sec' | '1-min' | 'deep-dive';
  label: string;
  text: string;
}

const cleanHeadline = (headline: string) =>
  headline
    .replace(/\s[-|\u2013\u2014]\s[^-|\u2013\u2014]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const formatTime = (iso?: string) => {
  if (!iso) return 'recently';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const buildAiSummaryBlocks = (context: SummaryStoryContext): AiSummaryBlock[] => {
  const headline = cleanHeadline(context.headline || 'this story');
  const sourceLine = context.sourceNames.slice(0, 3).join(', ') || 'multiple outlets';
  const coverageLine = `${context.coverageCount || 1} source${context.coverageCount === 1 ? '' : 's'}`;
  const recency = formatTime(context.latestPublishedAt);

  return [
    {
      id: '10-sec',
      label: '10-sec',
      text: `${coverageLine} are tracking ${headline}. Latest update: ${recency}.`,
    },
    {
      id: '1-min',
      label: '1-min',
      text: `Across ${coverageLine}, coverage is converging around ${headline}. Primary reporting currently comes from ${sourceLine}.`,
    },
    {
      id: 'deep-dive',
      label: 'deep dive',
      text: `This story now has sustained multi-source attention. Compare angles from ${sourceLine} to spot where framing aligns and where details diverge.`,
    },
  ];
};

export function createMetricsEngine({ history, now = () => Date.now() } = {}) {
  return {
    summarize(post) {
      if (!post?.shortcode) return emptySummary();
      const engagementRate = calculateEngagementRate({
        views: post.views,
        likes: post.likes,
        comments: post.comments,
        reposts: post.reposts
      });
      const growth24h = calculateGrowth24h({
        views: post.views,
        snapshots: history?.getSnapshots?.(post.shortcode) || [],
        now: now()
      });
      const accountMultiple = calculateAccountMultiple({
        shortcode: post.shortcode,
        username: post.username,
        views: post.views,
        posts: history?.getAccountPosts?.(post.username) || []
      });
      return { engagementRate, growth24h, accountMultiple };
    }
  };
}

export function calculateEngagementRate({ views, likes, comments, reposts, requireComplete = true } = {}) {
  const viewCount = positiveNumber(views);
  if (viewCount == null) return undefined;

  const raw = [likes, comments, reposts];
  const values = raw.map(nonNegativeNumber);
  if (requireComplete && values.some((value) => value == null)) return undefined;

  const known = values.filter((value) => value != null);
  if (!known.length) return undefined;
  const total = known.reduce((sum, value) => sum + value, 0);
  if (!requireComplete && total <= 0) return undefined;
  return total / viewCount * 100;
}

export function calculateGrowth24h({ views, snapshots, now = Date.now(), minAgeMs = 18 * 60 * 60 * 1000, maxAgeMs = 32 * 60 * 60 * 1000 } = {}) {
  const current = positiveNumber(views);
  if (current == null || !Array.isArray(snapshots)) return undefined;

  let best = null;
  let bestDelta = Infinity;
  const targetAge = 24 * 60 * 60 * 1000;
  for (const snapshot of snapshots) {
    const timestamp = positiveNumber(snapshot?.t);
    const previous = positiveNumber(snapshot?.v);
    if (timestamp == null || previous == null) continue;
    const age = Number(now) - timestamp;
    if (!Number.isFinite(age) || age < minAgeMs || age > maxAgeMs) continue;
    const delta = Math.abs(age - targetAge);
    if (delta >= bestDelta) continue;
    best = previous;
    bestDelta = delta;
  }

  if (best == null || current < best) return undefined;
  return (current - best) / best * 100;
}

export function calculateAccountMultiple({ shortcode, username, views, posts, maxRecent = 20, minSamples = 5 } = {}) {
  const current = positiveNumber(views);
  const owner = String(username || '').toLowerCase();
  if (current == null || !owner || !Array.isArray(posts)) return undefined;

  const samples = posts
    .filter((entry) => entry && String(entry.code || '') !== String(shortcode || ''))
    .filter((entry) => String(entry.owner || '').toLowerCase() === owner)
    .map((entry) => ({ views: positiveNumber(entry.views), t: Number(entry.t) }))
    .filter((entry) => entry.views != null && Number.isFinite(entry.t))
    .sort((a, b) => b.t - a.t)
    .slice(0, Math.max(1, Number(maxRecent) || 20));

  if (samples.length < Math.max(1, Number(minSamples) || 5)) return undefined;
  const values = samples.map((entry) => entry.views).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  return median > 0 ? current / median : undefined;
}

function emptySummary() {
  return { engagementRate: undefined, growth24h: undefined, accountMultiple: undefined };
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function nonNegativeNumber(value) {
  if (value == null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

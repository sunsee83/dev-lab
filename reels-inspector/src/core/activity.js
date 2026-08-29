const VALID_STATES = new Set(['running', 'success', 'error']);

export function createActivityStore({ now = () => Date.now(), maxItems = 24 } = {}) {
  const listeners = new Set();
  const items = new Map();

  function apply(event) {
    const id = String(event?.id || '').trim();
    if (!id) return getState();

    if (event?.remove) {
      const previous = items.get(id) || null;
      if (!items.delete(id)) return getState();
      publish({ type: 'removed', id, previous, event: { id, remove: true } });
      return getState();
    }

    if (!VALID_STATES.has(event?.state)) return getState();
    const previous = items.get(id) || null;
    const next = normalizeActivity(event, previous, now());
    if (sameActivity(previous, next)) return getState();

    items.set(id, next);
    prune(maxItems);
    publish({ type: previous ? 'updated' : 'added', activity: next, previous, event: next });
    return getState();
  }

  function dismiss(id) {
    return apply({ id, remove: true });
  }

  function getState() {
    const activities = [...items.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    return Object.freeze({
      activities: Object.freeze(activities),
      visible: selectVisible(activities)
    });
  }

  function getVisible() {
    return getState().visible;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function publish(change) {
    const state = getState();
    for (const listener of [...listeners]) {
      try {
        listener({ ...change, state });
      } catch (error) {
        console.warn('[RI] activity listener failed', error);
      }
    }
  }

  function prune(limit) {
    const cap = Math.max(4, Number(limit) || 24);
    if (items.size <= cap) return;
    const settled = [...items.values()]
      .filter((item) => item.state !== 'running')
      .sort((a, b) => a.updatedAt - b.updatedAt);
    for (const item of settled) {
      if (items.size <= cap) break;
      items.delete(item.id);
    }
  }

  return { apply, dismiss, getState, getVisible, subscribe };
}

function normalizeActivity(event, previous, timestamp) {
  const state = event.state;
  const progress = normalizeProgress(event.progress ?? previous?.progress);
  const updatedAt = Number.isFinite(timestamp) ? Number(timestamp) : Date.now();
  const startedAt = Number.isFinite(previous?.startedAt)
    ? previous.startedAt
    : Number.isFinite(event.startedAt) ? Number(event.startedAt) : updatedAt;

  return Object.freeze({
    id: String(event.id),
    kind: String(event.kind || previous?.kind || 'activity'),
    state,
    label: String(event.label ?? previous?.label ?? ''),
    progress,
    message: String(event.message ?? previous?.message ?? ''),
    code: event.code == null ? (previous?.code ?? null) : String(event.code),
    persistent: Boolean(event.persistent),
    silent: Boolean(event.silent),
    action: event.action == null ? null : String(event.action),
    actionLabel: event.actionLabel == null ? null : String(event.actionLabel),
    startedAt,
    updatedAt
  });
}

function normalizeProgress(progress) {
  const current = Number(progress?.current);
  const total = Number(progress?.total);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
  return Object.freeze({
    current: Math.max(0, Math.min(total, Math.trunc(current))),
    total: Math.max(1, Math.trunc(total))
  });
}

function selectVisible(activities) {
  return activities.find((item) => item.state === 'error' && item.persistent)
    || activities.find((item) => item.state === 'running')
    || null;
}

function sameActivity(previous, next) {
  if (!previous) return false;
  return previous.id === next.id
    && previous.kind === next.kind
    && previous.state === next.state
    && previous.label === next.label
    && previous.message === next.message
    && previous.code === next.code
    && previous.persistent === next.persistent
    && previous.silent === next.silent
    && previous.action === next.action
    && previous.actionLabel === next.actionLabel
    && sameProgress(previous.progress, next.progress);
}

function sameProgress(a, b) {
  if (!a || !b) return a === b;
  return a.current === b.current && a.total === b.total;
}

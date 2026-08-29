const VALID_DETENTS = new Set(['closed', 'compact', 'expanded']);
const VALID_MODES = new Set(['content', 'global']);

export function createWorkspaceState({ initialTab = 'summary' } = {}) {
  let state = freezeState({
    open: false,
    detent: 'closed',
    mode: 'global',
    activeTab: initialTab,
    contextKey: '',
    contextEpoch: 0
  });
  const listeners = new Set();

  function commit(patch, reason) {
    const next = normalizeState({ ...state, ...patch });
    if (sameState(state, next)) return state;
    const previous = state;
    state = freezeState(next);
    for (const listener of [...listeners]) listener({ previous, current: state, reason });
    return state;
  }

  return {
    getState() {
      return state;
    },

    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    open() {
      return commit({ open: true, detent: 'compact' }, 'open');
    },

    close() {
      return commit({ open: false, detent: 'closed' }, 'close');
    },

    toggle() {
      return state.open ? this.close() : this.open();
    },

    expand() {
      if (!state.open) return commit({ open: true, detent: 'expanded' }, 'expand');
      return commit({ detent: 'expanded' }, 'expand');
    },

    collapse() {
      if (!state.open) return commit({ open: true, detent: 'compact' }, 'collapse');
      return commit({ detent: 'compact' }, 'collapse');
    },

    setActiveTab(activeTab) {
      if (!activeTab) return state;
      return commit({ activeTab: String(activeTab) }, 'tab');
    },

    rebindContext(identity) {
      const contextKey = identityKey(identity);
      const mode = contextKey ? 'content' : 'global';
      if (contextKey === state.contextKey && mode === state.mode) return state;
      return commit({
        mode,
        contextKey,
        contextEpoch: state.contextEpoch + 1
      }, 'context');
    }
  };
}

function normalizeState(input) {
  const detent = VALID_DETENTS.has(input.detent) ? input.detent : 'closed';
  const open = detent !== 'closed' && !!input.open;
  return {
    open,
    detent: open ? detent : 'closed',
    mode: VALID_MODES.has(input.mode) ? input.mode : 'global',
    activeTab: String(input.activeTab || 'summary'),
    contextKey: String(input.contextKey || ''),
    contextEpoch: Number.isFinite(Number(input.contextEpoch)) ? Number(input.contextEpoch) : 0
  };
}

function identityKey(identity) {
  if (!identity?.shortcode) return '';
  return [
    identity.shortcode,
    identity.mediaId || '',
    identity.childMediaId || '',
    identity.slideIndex ?? ''
  ].join('|');
}

function sameState(a, b) {
  return a.open === b.open
    && a.detent === b.detent
    && a.mode === b.mode
    && a.activeTab === b.activeTab
    && a.contextKey === b.contextKey
    && a.contextEpoch === b.contextEpoch;
}

function freezeState(value) {
  return Object.freeze({ ...value });
}

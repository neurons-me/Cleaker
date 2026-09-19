// live/liveChannel.ts — the ONE live-transport mechanism for a bound
// kernel's remote reads, so cleaker (not GUI) is the layer that knows how
// to stay current with the real namespace tree. Ported from this.gui's
// runtime/createWsMeRuntime.ts, which reimplemented this exact WS lifecycle
// a second time at the GUI layer -- a caller had to opt into that adapter
// AND cleaker's own RemoteSlot (pointer/remotePointer.ts) already existed,
// fetch-once, as a separate remote-access path. Two independently-computed
// "what does this namespace currently look like" answers is precisely the
// class of bug this session already found and fixed once (a local identity
// vault keyed by a guessed namespace vs. the server's confirmed one) --
// this closes the same shape of gap one layer down, in the transport
// itself: one remote mechanism (RemoteSlot + this channel), not two.
//
// Deliberately narrow: this module only owns the WebSocket connection and
// message framing (mirrors this.gui's own MsgSubscribe/MsgData shapes,
// server-defined in modules/monad's http/nrpHandler.ts -- kept as a local
// copy here for the same reason nrpHandler.ts keeps its own copy of THIS
// shape: this package doesn't depend on this.gui, and monad.ai doesn't
// depend on either). It has no opinion about kernel storage, memory
// hydration, or events -- binder.ts's own getOrCreateRemoteSlot wires an
// onUpdate() callback into remoteOverlay/hydrateMemory/emit('value:changed'),
// same as it already does for a one-shot resolve().
//
// canonical/ast are sent as best-effort hints only (matching
// nrpHandler.ts's own fallback: `msg.canonical || msg.expression`,
// `extractNamespaceHint(msg.ast) || canonical`) -- a bare namespace string
// is enough to open a channel; this module never needs this.gui's own NRP
// expression parser to do that.

export interface LiveChannelOptions {
  /** HTTP(S) origin the WS URL derives from, e.g. "https://local.cleaker". */
  transportOrigin: string;
  /** The semantic namespace this channel opens against, e.g. "user.local.cleaker". */
  namespace: string;
}

export interface LiveChannel {
  /** Idempotent -- subscribing to an already-active path is a no-op. */
  subscribe(path: string): void;
  /** Idempotent -- unsubscribing from an inactive path is a no-op. */
  unsubscribe(path: string): void;
  /** Fires for every live update pushed for ANY subscribed path. Returns an unsubscribe function. */
  onUpdate(handler: (path: string, value: unknown) => void): () => void;
  /** Closes the underlying WebSocket. Safe to call more than once. */
  disconnect(): void;
}

function deriveWsUrl(transportOrigin: string): string {
  try {
    const url = new URL(transportOrigin);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const basePath = url.pathname.replace(/\/+$/, '');
    return `${wsProtocol}//${url.host}${basePath}/nrp`;
  } catch {
    return '';
  }
}

export function createLiveChannel(options: LiveChannelOptions): LiveChannel {
  const { namespace } = options;
  const wsUrl = deriveWsUrl(options.transportOrigin);

  let ws: WebSocket | null = null;
  let connecting = false;
  // True only from the moment this connection's 'resolved' reply has been
  // processed until it closes. Confirmed server-side (modules/monad's
  // nrpHandler.ts handleSubscribe): a subscribe for a path already
  // registered on this connection skips re-registering the live listener
  // but still sends back an immediate 'data' reply -- so sending subscribe
  // for the same path twice, even once resolved, double-fires an initial
  // value push (though never a duplicate future 'stream' push, since that
  // listener itself is deduplicated). Gating every send on `resolved`
  // (rather than only on `ws.readyState === OPEN`, which turns true
  // BEFORE 'resolved' arrives) means the only place subscribe messages
  // are ever actually sent is the loop in the 'resolved' handler below --
  // exactly once per path in activePaths, however many times subscribe()
  // itself was called before that point.
  let resolved = false;
  let channelId: string | null = null;
  const queuedOutbound: string[] = [];
  const activePaths = new Set<string>();
  const updateHandlers = new Set<(path: string, value: unknown) => void>();

  function sendOrQueue(msg: Record<string, unknown>): void {
    const raw = JSON.stringify(msg);
    if (ws && ws.readyState === WebSocket.OPEN && resolved) {
      ws.send(raw);
    } else {
      queuedOutbound.push(raw);
      ensureConnected();
    }
  }

  function ensureConnected(): void {
    if (ws || connecting || !wsUrl || typeof WebSocket === 'undefined') return;
    connecting = true;
    const socket = new WebSocket(wsUrl);
    ws = socket;

    socket.addEventListener('open', () => {
      connecting = false;
      socket.send(JSON.stringify({
        type: 'nrp.open',
        expression: namespace,
        canonical: namespace,
        ast: null,
        client: { gui: 'cleaker/liveChannel' },
        timestamp: Date.now(),
      }));
    });

    socket.addEventListener('message', (event) => {
      let msg: any;
      try {
        msg = JSON.parse(String((event as MessageEvent).data));
      } catch {
        return;
      }
      if (msg.type === 'resolved') {
        channelId = typeof msg.channelId === 'string' ? msg.channelId : null;
        resolved = true;
        // Discard whatever queued up before this resolved -- every message
        // ever queued here is a subscribe/unsubscribe for a path in (or
        // removed from) activePaths, so activePaths is already the full,
        // current, deduplicated truth of what this channel should be
        // subscribed to. The loop below is the ONE place that ever sends a
        // subscribe for this fresh connection; sending the queued messages
        // too (as this used to) meant every path subscribed before
        // 'resolved' arrived got subscribed twice -- two 'data' replies
        // per path, the duplicate value:changed this was found from.
        queuedOutbound.length = 0;
        // Re-subscribe every currently-active path on this fresh channel --
        // covers the initial connect and any reconnect after a drop.
        for (const path of activePaths) {
          sendOrQueue({ type: 'subscribe', channelId, namespace, path, timestamp: Date.now() });
        }
      } else if (msg.type === 'data' || msg.type === 'stream') {
        const payload = msg.payload;
        if (payload && typeof payload === 'object' && typeof payload.path === 'string') {
          updateHandlers.forEach((handler) => {
            try {
              handler(payload.path, payload.value);
            } catch {
              // Never let one observer's own error break the channel.
            }
          });
        }
      }
    });

    socket.addEventListener('close', () => {
      ws = null;
      channelId = null;
      resolved = false;
      connecting = false;
    });
    socket.addEventListener('error', () => {
      // 'close' always follows; nothing else to do here.
    });
  }

  return {
    subscribe(path: string) {
      if (activePaths.has(path)) return;
      activePaths.add(path);
      ensureConnected();
      sendOrQueue({ type: 'subscribe', channelId, namespace, path, timestamp: Date.now() });
    },
    unsubscribe(path: string) {
      if (!activePaths.has(path)) return;
      activePaths.delete(path);
      sendOrQueue({ type: 'unsubscribe', channelId, namespace, path, timestamp: Date.now() });
    },
    onUpdate(handler: (path: string, value: unknown) => void) {
      updateHandlers.add(handler);
      return () => updateHandlers.delete(handler);
    },
    disconnect() {
      ws?.close();
      ws = null;
    },
  };
}

import { useEffect, useRef, useState, useCallback } from 'react';

// Cloudflare Turnstile. The site key is public and ships in the bundle; the
// secret key lives only in the verified-insert Edge Function's environment.
//
// When REACT_APP_TURNSTILE_SITE_KEY is unset the widget renders nothing and
// reports itself as disabled, so local development works without Cloudflare
// keys — matching how supabase.js degrades without Supabase keys.

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;
const looksReal = (v) => !!v && !v.includes('YOUR_') && !v.includes('_HERE');

export const hasTurnstile = looksReal(SITE_KEY);

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Supabase configured but Turnstile not is a half-finished setup: writes go out
// without a token, and verified-insert rejects them the moment it is deployed.
// Fails closed either way, but say so rather than letting it look like a
// network fault.
if (process.env.REACT_APP_SUPABASE_URL && !hasTurnstile && typeof console !== 'undefined') {
  console.warn(
    '[fitseam] Supabase is configured but REACT_APP_TURNSTILE_SITE_KEY is not. ' +
    'Writes will be sent without a Turnstile token and will be rejected by ' +
    'verified-insert once it is deployed. Set the site key in .env.local.'
  );
}

let scriptPromise = null;

function loadTurnstileScript() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      if (window.turnstile) { resolve(); return; }
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      const onLoad = () => resolve();
      if (existing) { existing.addEventListener('load', onLoad); existing.addEventListener('error', reject); return; }
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.addEventListener('load', onLoad);
      s.addEventListener('error', () => reject(new Error('Turnstile script failed to load')));
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/**
 * Renders a Turnstile widget and hands back the token.
 *
 * Tokens are single-use and expire after ~5 minutes, so each submission needs
 * its own widget instance. `reset()` is exposed for retry after a failed
 * submit — reusing a spent token returns a verification failure.
 *
 * Returns { ref, token, ready, reset }. Spread `ref` onto a <div>.
 */
export function useTurnstile() {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (!hasTurnstile) return undefined;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (t) => setToken(t),
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
          appearance: 'interaction-only',
          theme: 'light',
        });
      })
      .catch((e) => console.warn('[fitseam] Turnstile unavailable:', e?.message ?? e));

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current !== null && window.turnstile) {
      try { window.turnstile.reset(widgetIdRef.current); } catch {}
    }
  }, []);

  // Without a site key there is nothing to solve, so report ready immediately
  // and let insertRow fall back to its local-only path.
  return { ref: containerRef, token, ready: hasTurnstile ? !!token : true, reset };
}

/** Mount point for the widget. Renders nothing when Turnstile is disabled. */
export function TurnstileWidget({ innerRef }) {
  if (!hasTurnstile) return null;
  return <div ref={innerRef} style={{ margin: '4px 0' }} />;
}

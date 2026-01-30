const ANALYTICS_BASE = 'https://go.startmyloveengine.com';

export function trackVisit({ vendor, page, tier }) {
  try {
    fetch(`${ANALYTICS_BASE}/visit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      keepalive: true,
      body: JSON.stringify({
        vendor,
        page,
        tier,
        url: window.location.href,
        referrer: document.referrer || ''
      })
    }).catch(() => {});
  } catch (err) {
    // Fail silently for analytics.
  }
}

export function trackClick({ vendor, target, tier }) {
  try {
    fetch(`${ANALYTICS_BASE}/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      keepalive: true,
      body: JSON.stringify({
        vendor,
        target,
        tier,
        url: window.location.href
      })
    }).catch(() => {});
  } catch (err) {
    // Fail silently for analytics.
  }
}

const ANALYTICS_BASE = 'https://go.startmyloveengine.com';
const ANALYTICS_CONFIG_URL = new URL('../config/analytics.json', import.meta.url);
const VISIT_TIER_ALIASES = {
  paid: 'basic',
  free: 'unpaid'
};
let analyticsConfigPromise;
let visitPages = new Set();
let visitTiers = new Set();
let vendorSlugRegex = null;

function loadAnalyticsConfig() {
  if (analyticsConfigPromise) {
    return analyticsConfigPromise;
  }

  analyticsConfigPromise = fetch(ANALYTICS_CONFIG_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load analytics config (${response.status})`);
      }
      return response.json();
    })
    .then(config => {
      const pages = Array.isArray(config.allowedPages) ? config.allowedPages : [];
      const tiers = Array.isArray(config.allowedTiers) ? config.allowedTiers : [];
      visitPages = new Set(
        pages.map(value => String(value).trim().toLowerCase()).filter(Boolean)
      );
      visitTiers = new Set(
        tiers.map(value => String(value).trim().toLowerCase()).filter(Boolean)
      );
      vendorSlugRegex = config.vendorSlugRegex
        ? new RegExp(config.vendorSlugRegex)
        : null;
      return config;
    })
    .catch(err => {
      console.warn('analytics: failed to load config', {
        url: ANALYTICS_CONFIG_URL.href,
        error: err?.message || err
      });
      visitPages = new Set();
      visitTiers = new Set();
      vendorSlugRegex = null;
      return null;
    });

  return analyticsConfigPromise;
}

function normalizeVendorSlug(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }
  return trimmed
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeVisitPage(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

function normalizeVisitTier(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim().toLowerCase();
  return VISIT_TIER_ALIASES[trimmed] || trimmed;
}

function getValidVisitPayload({ vendor, page, tier }) {
  const normalizedVendor = normalizeVendorSlug(vendor);
  const normalizedPage = normalizeVisitPage(page);
  const normalizedTier = normalizeVisitTier(tier);

  const isValid =
    normalizedVendor &&
    vendorSlugRegex &&
    vendorSlugRegex.test(normalizedVendor) &&
    visitPages.has(normalizedPage) &&
    visitTiers.has(normalizedTier);

  if (!isValid) {
    console.warn('analytics: invalid visit payload', {
      vendor,
      page,
      tier,
      normalizedVendor,
      normalizedPage,
      normalizedTier,
      url: typeof window !== 'undefined' ? window.location.href : ''
    });
    return null;
  }

  return {
    vendor: normalizedVendor,
    page: normalizedPage,
    tier: normalizedTier
  };
}

export function trackVisit({ vendor, page, tier }) {
  try {
    loadAnalyticsConfig()
      .then(() => {
        if (!vendorSlugRegex || visitPages.size === 0 || visitTiers.size === 0) {
          console.warn('analytics: visit skipped (config unavailable)', {
            url: window.location.href
          });
          return;
        }
        const payload = getValidVisitPayload({ vendor, page, tier });
        if (!payload) {
          return;
        }
        fetch(`${ANALYTICS_BASE}/visit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          keepalive: true,
          body: JSON.stringify({
            ...payload,
            url: window.location.href,
            referrer: document.referrer || ''
          })
        }).catch(() => {});
      })
      .catch(() => {});
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

export function primeAnalyticsConfig() {
  return loadAnalyticsConfig();
}

const ANALYTICS_BASE = 'https://go.startmyloveengine.com';
const ANALYTICS_CONFIG_URL = new URL('../config/analytics.json', import.meta.url);
const VISIT_TIER_ALIASES = {
  paid: 'basic',
  free: 'unpaid'
};
let analyticsConfigPromise;
let visitPages = new Set();
let allowedPlans = new Set();
let allowedPlacements = new Set();
let allowedClickTypes = new Set();
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
      const plans = Array.isArray(config.allowedPlans) ? config.allowedPlans : [];
      const placements = Array.isArray(config.allowedPlacements) ? config.allowedPlacements : [];
      const clickTypes = Array.isArray(config.allowedClickTypes) ? config.allowedClickTypes : [];
      visitPages = new Set(
        pages.map(value => String(value).trim().toLowerCase()).filter(Boolean)
      );
      allowedPlans = new Set(plans.map(v => String(v).trim().toLowerCase()).filter(Boolean));
      allowedPlacements = new Set(placements.map(v => String(v).trim().toLowerCase()).filter(Boolean));
      allowedClickTypes = new Set(clickTypes.map(v => String(v).trim().toLowerCase()).filter(Boolean));
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
      allowedPlans = new Set();
      allowedPlacements = new Set();
      allowedClickTypes = new Set();
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

function normalizePlacementArray(value) {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : String(value).split(',');
  return Array.from(
    new Set(
      arr
        .map(v => String(v).trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function normalizePlan(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeTier(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  return VISIT_TIER_ALIASES[trimmed] || trimmed;
}

function getValidVisitPayload({ vendor, page, plan, placements, tier }) {
  const normalizedVendor = normalizeVendorSlug(vendor);
  const normalizedPage = normalizeVisitPage(page);
  const normalizedPlan = normalizePlan(plan);
  const normalizedPlacements = normalizePlacementArray(placements);
  const normalizedTier = normalizedPlan ? '' : normalizeTier(tier); // tier only if no plan

  const isValid =
    normalizedVendor &&
    vendorSlugRegex &&
    vendorSlugRegex.test(normalizedVendor) &&
    visitPages.has(normalizedPage) &&
    (normalizedPlan ? allowedPlans.has(normalizedPlan) : true) &&
    normalizedPlacements.every(p => allowedPlacements.has(p)) &&
    (!normalizedPlan && normalizedTier ? allowedPlans.has(normalizedTier) : true);

  if (!isValid) {
    console.warn('analytics: invalid visit payload', {
      vendor,
      page,
      plan,
      placements: normalizedPlacements,
      tier,
      normalizedVendor,
      normalizedPage,
      normalizedPlan,
      normalizedPlacements,
      normalizedTier,
      url: typeof window !== 'undefined' ? window.location.href : ''
    });
    return null;
  }

  return {
    vendor: normalizedVendor,
    page: normalizedPage,
    ...(normalizedPlan ? { plan: normalizedPlan } : {}),
    ...(normalizedPlacements.length ? { placements: normalizedPlacements } : {}),
    ...(!normalizedPlan && normalizedTier ? { tier: normalizedTier } : {})
  };
}

export function trackVisit({ vendor, page, plan, placements, tier }) {
  try {
    loadAnalyticsConfig()
      .then(() => {
        if (!vendorSlugRegex || visitPages.size === 0) {
          console.warn('analytics: visit skipped (config unavailable)', {
            url: window.location.href
          });
          return;
        }
        const payload = getValidVisitPayload({ vendor, page, plan, placements, tier });
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
    loadAnalyticsConfig()
      .then(() => {
        const normalizedVendor = normalizeVendorSlug(vendor);
        const type = typeof target === 'string' ? target.trim().toLowerCase() : '';
        if (!normalizedVendor || !vendorSlugRegex || !vendorSlugRegex.test(normalizedVendor)) {
          console.warn('analytics: click skipped (invalid vendor)', { vendor });
          return;
        }
        if (!type || !allowedClickTypes.has(type)) {
          console.warn('analytics: click skipped (invalid type)', { type });
          return;
        }

        fetch(`${ANALYTICS_BASE}/click`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          keepalive: true,
          body: JSON.stringify({
            vendor: normalizedVendor,
            type,
            url: window.location.href
          })
        }).catch(() => {});
      })
      .catch(() => {});
  } catch (err) {
    // Fail silently for analytics.
  }
}

export function primeAnalyticsConfig() {
  return loadAnalyticsConfig();
}

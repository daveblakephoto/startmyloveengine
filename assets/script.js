import { primeAnalyticsConfig, trackClick, trackVisit } from '../lib/analytics.js';

function getVendorSlugFromPage() {
  // Primary source: data attribute; fallback: URL path (/directory/{slug}/).
  const fromDataset = document.body?.dataset.vendorSlug;
  if (fromDataset) {
    return fromDataset;
  }
  const match = window.location.pathname.match(/^\/directory\/([^/]+)\/?$/);
  return match ? match[1] : '';
}

function normalizePath(path) {
  if (!path) {
    return '/';
  }
  const clean = path.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

function setCurrentNavLink() {
  const currentPath = normalizePath(window.location.pathname);
  document.querySelectorAll('.nav-links a').forEach(link => {
    const linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
    if (linkPath === currentPath) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Preload analytics config so visit validation uses the shared JSON allowlists.
  primeAnalyticsConfig();
  const hasVendorProfile = Boolean(document.querySelector('.vendor-profile-hero'));
  const pageVendorSlug = getVendorSlugFromPage();
  const pageVendorTier = document.body?.dataset.vendorTier || '';
  const vendorMeta = (typeof window !== 'undefined' && window.__VENDOR_META__) || {};
  const pageVendorPlan = vendorMeta.plan || document.body?.dataset.vendorPlan || '';
  const pageVendorPlacements = vendorMeta.placements || document.body?.dataset.vendorPlacements;
  const searchInput = document.getElementById('search');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const cityFilter = document.getElementById('cityFilter');
  const countryFilter = document.getElementById('countryFilter');
  const vendorCards = document.querySelectorAll('.vendor-card');
  
  let currentCategory = 'all';
  let currentCity = 'all';
  let currentCountry = 'all';
  let searchTerm = '';

  const tierRank = {
    featured: 0,
    paid: 1,
    free: 2
  };

  function getVendorName(card) {
    const dataName = card.getAttribute('data-vendor-name');
    if (dataName) {
      return dataName.trim();
    }
    return card.querySelector('h3')?.textContent.trim() || '';
  }

  function sortVendorCards() {
    document.querySelectorAll('.directory-grid').forEach(grid => {
      const cards = Array.from(grid.querySelectorAll('.vendor-card'));
      cards.sort((a, b) => {
        const tierA = tierRank[a.getAttribute('data-tier')] ?? tierRank.free;
        const tierB = tierRank[b.getAttribute('data-tier')] ?? tierRank.free;
        if (tierA !== tierB) {
          return tierA - tierB;
        }
        const nameA = getVendorName(a);
        const nameB = getVendorName(b);
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      });
      cards.forEach(card => grid.appendChild(card));
    });
  }

  function populateVendorLetters() {
    document.querySelectorAll('.vendor-card-letter[data-letter]').forEach(letterEl => {
      const card = letterEl.closest('.vendor-card');
      if (!card) {
        return;
      }
      const name = getVendorName(card);
      const initial = name.trim().charAt(0).toUpperCase();
      letterEl.textContent = initial || '?';
    });
  }
  
  function filterVendors() {
    vendorCards.forEach(card => {
      const category = card.getAttribute('data-category') || '';
      const categories = category.split(',').map(item => item.trim()).filter(Boolean);
      const cities = card.getAttribute('data-cities')?.split(',').filter(c => c) || [];
      const country = card.getAttribute('data-country');
      const vendorName = card.querySelector('h3')?.textContent.toLowerCase() || '';
      const vendorTagline = card.querySelector('.vendor-tagline')?.textContent.toLowerCase() || '';
      
      const matchesCategory = currentCategory === 'all' || categories.includes(currentCategory);
      const matchesCity = currentCity === 'all' || cities.includes(currentCity);
      const matchesCountry = currentCountry === 'all' || country === currentCountry;
      const matchesSearch = !searchTerm || 
        vendorName.includes(searchTerm) || 
        vendorTagline.includes(searchTerm) ||
        category.toLowerCase().includes(searchTerm);
      
      if (matchesCategory && matchesCity && matchesCountry && matchesSearch) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  }
  
  if (filterButtons.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', function() {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        currentCategory = this.getAttribute('data-category');
        filterVendors();
      });
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      searchTerm = this.value.toLowerCase();
      filterVendors();
    });
  }
  
  if (cityFilter) {
    cityFilter.addEventListener('change', function() {
      currentCity = this.value;
      filterVendors();
    });
  }
  
  if (countryFilter) {
    countryFilter.addEventListener('change', function() {
      currentCountry = this.value;
      filterVendors();
    });
  }

  if (vendorCards.length > 0) {
    populateVendorLetters();
    sortVendorCards();
  }

  if (hasVendorProfile && pageVendorSlug) {
    trackVisit({
      vendor: pageVendorSlug,
      page: 'profile',
      plan: pageVendorPlan,
      placements: pageVendorPlacements,
      tier: pageVendorTier
    });
  } else if (hasVendorProfile) {
    // Skip visits that can't be validated; log for visibility.
    console.warn('analytics: visit skipped (missing vendor slug or tier)', {
      vendor: pageVendorSlug || null,
      tier: pageVendorTier || null,
      plan: pageVendorPlan || null,
      url: window.location.href
    });
  }

  document.querySelectorAll('[data-track-outbound]').forEach(link => {
    if (link.dataset.analyticsBound === 'true') {
      return;
    }
    link.dataset.analyticsBound = 'true';
    const vendorSlug = link.getAttribute('data-vendor') || pageVendorSlug;
    const linkType = link.getAttribute('data-type');
    const destinationUrl = link.getAttribute('data-url') || link.getAttribute('href');
    const tier = link.getAttribute('data-tier') || pageVendorTier;

    if (!destinationUrl) {
      return;
    }

    link.href = destinationUrl;
    if (!link.target) {
      link.target = '_blank';
    }
    if (!link.rel) {
      link.rel = 'noopener';
    }

    link.addEventListener('click', function(event) {
      const isPrimaryClick = event.button === 0;
      const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

      if (vendorSlug && linkType) {
        trackClick({
          vendor: vendorSlug,
          target: linkType,
          tier
        });
      }

      if (!isPrimaryClick || hasModifier) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (link.target === '_blank') {
        const newWindow = window.open(destinationUrl, '_blank', 'noopener');
        if (newWindow) {
          newWindow.opener = null;
        }
      } else {
        window.location.href = destinationUrl;
      }
    });
  });
  
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href !== '#') {
        e.preventDefault();
        try {
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } catch (err) {
          // Invalid selector, ignore
        }
      }
    });
  });
  
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');
  setCurrentNavLink();
  
  if (hamburger && navLinks) {
    function closeMenu() {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    }

    function openMenu() {
      hamburger.classList.add('active');
      navLinks.classList.add('active');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');
    }

    hamburger.addEventListener('click', function() {
      const isOpen = navLinks.classList.contains('active');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });
    
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        closeMenu();
        hamburger.focus();
      }
    });
    
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        closeMenu();
      });
    });
  }
});

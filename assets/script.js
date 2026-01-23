// Build click-tracked outbound URLs without exposing vendor destinations in hrefs.
function buildTrackedUrl(vendorSlug, linkType, destinationUrl) {
  const baseUrl = 'https://go.startmyloveengine.com/click';
  const encodedDestination = encodeURIComponent(destinationUrl);
  return `${baseUrl}?vendor=${vendorSlug}&type=${linkType}&to=${encodedDestination}`;
}

document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const cityFilter = document.getElementById('cityFilter');
  const countryFilter = document.getElementById('countryFilter');
  const vendorCards = document.querySelectorAll('.vendor-card');
  
  let currentCategory = 'all';
  let currentCity = 'all';
  let currentCountry = 'all';
  let searchTerm = '';
  
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

  document.querySelectorAll('[data-track-outbound]').forEach(link => {
    const vendorSlug = link.getAttribute('data-vendor');
    const linkType = link.getAttribute('data-type');
    const destinationUrl = link.getAttribute('data-url');

    if (vendorSlug && linkType && destinationUrl) {
      // Route outbound vendor clicks through the tracking worker.
      link.href = buildTrackedUrl(vendorSlug, linkType, destinationUrl);
      link.target = '_blank';
      link.rel = 'noopener';
    }
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
  
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function() {
      this.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
    
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      }
    });
    
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }
});

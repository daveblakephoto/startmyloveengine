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
      const category = card.getAttribute('data-category');
      const cities = card.getAttribute('data-cities')?.split(',').filter(c => c) || [];
      const country = card.getAttribute('data-country');
      const vendorName = card.querySelector('h3')?.textContent.toLowerCase() || '';
      const vendorTagline = card.querySelector('.vendor-tagline')?.textContent.toLowerCase() || '';
      
      const matchesCategory = currentCategory === 'all' || category === currentCategory;
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
  
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') {
        return;
      }
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});

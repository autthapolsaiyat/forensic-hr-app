window.API_BASE_URL = 'https://forensic-hr-app.wonderfulglacier-e7722499.southeastasia.azurecontainerapps.io';

// Helper function for API calls with credentials
window.apiFetch = function(endpoint, options = {}) {
  return fetch(API_BASE_URL + endpoint, {
    ...options,
    credentials: 'include'
  });
};

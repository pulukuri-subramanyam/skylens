/**
 * WeatherPro - Advanced Weather Application
 * Enterprise-level weather app with real-time data integration
 */

class WeatherApp {
  constructor() {
    this.API_KEY = '56220ed1b63d436789b111226251409'; // Free WeatherAPI key
    this.BASE_URL = 'https://api.weatherapi.com/v1';
    this.currentChart = null;
    this.currentLocation = null;
    this.lastSearchQuery = '';
    this.DEFAULT_CITY = 'London';
    
    this.initializeApp();
    this.bindEvents();
    this.loadThemePreference();
  }

  // Initialize the application
  initializeApp() {
    this.elements = {
      // Search elements
      cityInput: document.getElementById('cityInput'),
      searchBtn: document.getElementById('searchBtn'),
      locationBtn: document.getElementById('locationBtn'),
      
      // Theme toggle
      themeToggle: document.getElementById('themeToggle'),
      
      // Loading and error states
      loaderContainer: document.getElementById('loaderContainer'),
      errorContainer: document.getElementById('errorContainer'),
      errorMessage: document.getElementById('errorMessage'),
      retryBtn: document.getElementById('retryBtn'),
      
      // Weather content
      weatherContent: document.getElementById('weatherContent'),
      
      // Current weather elements
      locationName: document.getElementById('locationName'),
      lastUpdated: document.getElementById('lastUpdated'),
      currentWeatherIcon: document.getElementById('currentWeatherIcon'),
      currentTemp: document.getElementById('currentTemp'),
      currentCondition: document.getElementById('currentCondition'),
      feelsLike: document.getElementById('feelsLike'),
      weatherSummary: document.getElementById('weatherSummary'),
      visibility: document.getElementById('visibility'),
      humidity: document.getElementById('humidity'),
      windSpeed: document.getElementById('windSpeed'),
      pressure: document.getElementById('pressure'),
      windDirection: document.getElementById('windDirection'),
      uvIndex: document.getElementById('uvIndex'),
      
      // Chart and forecast
      temperatureChart: document.getElementById('temperatureChart'),
      forecastGrid: document.getElementById('forecastGrid'),
      
      // Background elements
      backgroundAnimation: document.getElementById('backgroundAnimation'),
      weatherParticles: document.getElementById('weatherParticles')
    };

    // Auto-detect location on app load
    this.autoDetectLocation();
  }

  // Bind all event listeners
  bindEvents() {
    // Search functionality
    this.elements.searchBtn.addEventListener('click', () => this.handleSearch());
    this.elements.cityInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });
    this.elements.locationBtn.addEventListener('click', () => this.getCurrentLocation());
    
    // Theme toggle
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // Retry button
    this.elements.retryBtn.addEventListener('click', () => this.retryLastAction());
    
    // Input focus effects
    this.elements.cityInput.addEventListener('focus', () => {
      this.elements.cityInput.parentElement.classList.add('focused');
    });
    
    this.elements.cityInput.addEventListener('blur', () => {
      this.elements.cityInput.parentElement.classList.remove('focused');
    });
  }

  // Start with a reliable default forecast. Location remains an explicit, optional action.
  async autoDetectLocation() {
    await this.fetchWeatherData(this.DEFAULT_CITY);
  }

  // Get current geolocation
  getCurrentLocation() {
    this.showLoading();
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        this.showError('Geolocation is not supported by this browser');
        reject('Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const locationQuery = `${latitude},${longitude}`;
            this.currentLocation = { lat: latitude, lon: longitude };
            await this.fetchWeatherData(locationQuery);
            resolve();
          } catch (error) {
            this.showError('Failed to fetch weather for current location');
            reject(error);
          }
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied by user.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'An unknown error occurred.';
          }
          this.showError(errorMessage);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Handle search button click
  async handleSearch() {
    const query = this.elements.cityInput.value.trim();
    if (!query) {
      this.elements.cityInput.focus();
      return;
    }
    
    this.lastSearchQuery = query;
    await this.fetchWeatherData(query);
  }

  // Retry last action
  async retryLastAction() {
    if (this.lastSearchQuery) {
      await this.fetchWeatherData(this.lastSearchQuery);
    } else if (this.currentLocation) {
      const locationQuery = `${this.currentLocation.lat},${this.currentLocation.lon}`;
      await this.fetchWeatherData(locationQuery);
    } else {
      await this.fetchWeatherData(this.DEFAULT_CITY);
    }
  }

  // Fetch weather data from API
  async fetchWeatherData(query) {
    this.showLoading();
    
    try {
      // Fetch current weather and forecast data
      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(`${this.BASE_URL}/current.json?key=${this.API_KEY}&q=${encodeURIComponent(query)}&aqi=yes`),
        fetch(`${this.BASE_URL}/forecast.json?key=${this.API_KEY}&q=${encodeURIComponent(query)}&days=7&aqi=yes&alerts=yes`)
      ]);

      if (!currentResponse.ok || !forecastResponse.ok) {
        throw new Error(`HTTP error! status: ${currentResponse.status || forecastResponse.status}`);
      }

      const [currentData, forecastData] = await Promise.all([
        currentResponse.json(),
        forecastResponse.json()
      ]);

      if (currentData.error || forecastData.error) {
        throw new Error(currentData.error?.message || forecastData.error?.message || 'API returned an error');
      }

      // Update UI with weather data
      this.updateCurrentWeather(currentData);
      this.updateHourlyChart(forecastData);
      this.updateForecast(forecastData);
      this.updateBackground(currentData.current);
      
      this.showWeatherContent();
      
      // Clear search input
      this.elements.cityInput.value = '';
      
    } catch (error) {
      console.error('Error fetching weather data:', error);
      this.showError(this.getErrorMessage(error));
    }
  }

  // Get user-friendly error message
  getErrorMessage(error) {
    if (error.message.includes('No matching location')) {
      return 'City not found. Please check the spelling and try again.';
    } else if (error.message.includes('API key')) {
      return 'Weather service is temporarily unavailable. Please try again later.';
    } else if (error.message.includes('HTTP error')) {
      return 'Unable to connect to weather service. Please check your internet connection.';
    } else {
      return 'Unable to fetch weather data. Please try again.';
    }
  }

  // Update current weather display
  updateCurrentWeather(data) {
    const { location, current } = data;
    
    // Location and timestamp
    this.elements.locationName.textContent = `${location.name}, ${location.region || location.country}`;
    this.elements.lastUpdated.textContent = `Last updated: ${this.formatTime(current.last_updated)}`;
    
    // Weather icon
    this.elements.currentWeatherIcon.src = `https:${current.condition.icon}`;
    this.elements.currentWeatherIcon.alt = current.condition.text;
    
    // Temperature and condition
    this.elements.currentTemp.textContent = `${Math.round(current.temp_c)}°C`;
    this.elements.currentCondition.textContent = current.condition.text;
    this.elements.feelsLike.textContent = `${Math.round(current.feelslike_c)}°C`;
    this.elements.weatherSummary.textContent = this.getWeatherSummary(current);

    // Weather details
    this.elements.visibility.textContent = `${current.vis_km} km`;
    this.elements.humidity.textContent = `${current.humidity}%`;
    this.elements.windSpeed.textContent = `${current.wind_kph} km/h`;
    this.elements.pressure.textContent = `${current.pressure_mb} hPa`;
    this.elements.windDirection.textContent = current.wind_dir;
    this.elements.uvIndex.textContent = current.uv;
  }

  getWeatherSummary(current) {
    const condition = current.condition.text.toLowerCase();
    const wind = Math.round(current.wind_kph);
    const uv = Number(current.uv);
    const comfort = wind > 25 ? 'A breezy' : 'A calm';

    if (condition.includes('rain') || condition.includes('shower') || condition.includes('drizzle')) {
      return 'Rain is in the picture — keep an umbrella close. UV index ' + uv + '.';
    }
    if (condition.includes('sun') || condition.includes('clear')) {
      return comfort + ' ' + current.condition.text.toLowerCase() + ' day. UV index ' + uv + '; plan sun protection if needed.';
    }
    return comfort + ' ' + current.condition.text.toLowerCase() + ' day with ' + wind + ' km/h winds.';
  }

  // Update 24-hour temperature chart
  updateHourlyChart(data) {
    const ctx = this.elements.temperatureChart.getContext('2d');
    
    // Destroy existing chart
    if (this.currentChart) {
      this.currentChart.destroy();
    }
    
    // Prepare hourly data (next 24 hours)
    const now = new Date();
    const hourlyData = [];
    
    // Get today's remaining hours
    const todayHours = data.forecast.forecastday[0].hour.slice(now.getHours());
    hourlyData.push(...todayHours);
    
    // Get tomorrow's hours to complete 24 hours
    if (data.forecast.forecastday[1] && hourlyData.length < 24) {
      const tomorrowHours = data.forecast.forecastday[1].hour.slice(0, 24 - hourlyData.length);
      hourlyData.push(...tomorrowHours);
    }
    
    const labels = hourlyData.map(hour => {
      const time = new Date(hour.time);
      return time.getHours() === 0 ? '12 AM' : 
             time.getHours() === 12 ? '12 PM' :
             time.getHours() > 12 ? `${time.getHours() - 12} PM` :
             `${time.getHours()} AM`;
    });
    
    const temperatures = hourlyData.map(hour => Math.round(hour.temp_c));
    
    // Chart configuration
    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Temperature (°C)',
          data: temperatures,
          borderColor: 'rgba(79, 172, 254, 1)',
          backgroundColor: 'rgba(79, 172, 254, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(79, 172, 254, 1)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(79, 172, 254, 1)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                const time = new Date(hourlyData[index].time);
                return time.toLocaleString('en-US', { 
                  weekday: 'short', 
                  hour: 'numeric', 
                  hour12: true 
                });
              },
              label: function(context) {
                return `${context.parsed.y}°C`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              maxTicksLimit: 8
            },
            border: {
              display: false
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              borderDash: [2, 2]
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              callback: function(value) {
                return `${value}°C`;
              }
            },
            border: {
              display: false
            }
          }
        },
        elements: {
          point: {
            hoverBorderWidth: 3
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };
    
    this.currentChart = new Chart(ctx, config);
  }

  // Update 7-day forecast
  updateForecast(data) {
    const forecastDays = data.forecast.forecastday;
    this.elements.forecastGrid.innerHTML = '';
    
    forecastDays.forEach((day, index) => {
      const date = new Date(day.date);
      const isToday = index === 0;
      const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const forecastItem = document.createElement('div');
      forecastItem.className = `forecast-item${isToday ? ' is-today' : ''}`;
      
      forecastItem.innerHTML = `
        <div class="forecast-date">${dayName}<br><small>${monthDay}</small></div>
        <img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}" class="forecast-icon">
        <div class="forecast-temps">
          <span class="temp-max">${Math.round(day.day.maxtemp_c)}°</span>
          <span class="temp-min">${Math.round(day.day.mintemp_c)}°</span>
        </div>
        <div class="forecast-condition">${day.day.condition.text}</div>
      `;
      
      this.elements.forecastGrid.appendChild(forecastItem);
    });
  }

  // Update background based on weather condition and time
  updateBackground(currentWeather) {
    const condition = currentWeather.condition.text.toLowerCase();
    const isDay = currentWeather.is_day === 1;
    const backgroundEl = this.elements.backgroundAnimation;
    const particlesEl = this.elements.weatherParticles;
    
    // Remove existing classes
    backgroundEl.className = 'background-animation';
    particlesEl.className = 'weather-particles';
    
    // Determine background class based on condition and time
    let backgroundClass = '';
    let particleClass = '';
    
    if (condition.includes('clear') || condition.includes('sunny')) {
      backgroundClass = isDay ? 'clear-day' : 'clear-night';
    } else if (condition.includes('cloud') || condition.includes('overcast')) {
      backgroundClass = 'cloudy';
    } else if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      backgroundClass = 'rainy';
      particleClass = 'rain';
    } else if (condition.includes('snow') || condition.includes('blizzard')) {
      backgroundClass = 'snowy';
      particleClass = 'snow';
    } else {
      backgroundClass = isDay ? 'clear-day' : 'clear-night';
    }
    
    // Apply classes with animation
    setTimeout(() => {
      backgroundEl.classList.add(backgroundClass);
      if (particleClass) {
        particlesEl.classList.add(particleClass);
      }
    }, 100);
  }

  // Theme management
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Update theme toggle icon
    const icon = this.elements.themeToggle.querySelector('i');
    icon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    
    // Save preference to localStorage
    localStorage.setItem('weatherapp-theme', newTheme);
    
    // Add bounce animation to theme toggle
    this.elements.themeToggle.style.transform = 'scale(0.9)';
    setTimeout(() => {
      this.elements.themeToggle.style.transform = '';
    }, 150);
  }

  // Load theme preference from localStorage
  loadThemePreference() {
    const savedTheme = localStorage.getItem('weatherapp-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      const icon = this.elements.themeToggle.querySelector('i');
      icon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    } else {
      // Default to dark theme
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  // UI State Management
  showLoading() {
    this.elements.loaderContainer.classList.add('show');
    this.elements.errorContainer.classList.remove('show');
    this.elements.weatherContent.classList.remove('show');
    document.body.classList.add('loading');
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorContainer.classList.add('show');
    this.elements.loaderContainer.classList.remove('show');
    this.elements.weatherContent.classList.remove('show');
    document.body.classList.remove('loading');
  }

  showWeatherContent() {
    this.elements.weatherContent.classList.add('show');
    this.elements.loaderContainer.classList.remove('show');
    this.elements.errorContainer.classList.remove('show');
    document.body.classList.remove('loading');
  }

  // Utility Functions
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  }
}

// Performance optimizations
class PerformanceOptimizer {
  constructor() {
    this.debounceTimers = new Map();
  }

  // Debounce function to limit API calls
  debounce(func, delay, key = 'default') {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    
    const timer = setTimeout(() => {
      func();
      this.debounceTimers.delete(key);
    }, delay);
    
    this.debounceTimers.set(key, timer);
  }

  // Throttle function for scroll/resize events
  throttle(func, delay) {
    let inThrottle = false;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, delay);
      }
    };
  }
}

// Error handling and logging
class ErrorHandler {
  static log(error, context = '') {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] WeatherApp Error ${context}:`, error);
    
    // In production, you might want to send this to an error reporting service
    // Example: Sentry, LogRocket, etc.
  }

  static handleAPIError(error, context) {
    this.log(error, `API - ${context}`);
    
    // Return user-friendly error message
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'Network connection error. Please check your internet connection.';
    } else if (error.message.includes('404')) {
      return 'Location not found. Please check the city name and try again.';
    } else if (error.message.includes('401')) {
      return 'Weather service authentication error. Please try again later.';
    } else {
      return 'Unable to fetch weather data. Please try again.';
    }
  }
}

// Service Worker Registration for PWA capabilities (optional enhancement)
class PWAManager {
  static async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ServiceWorker registration successful:', registration);
      } catch (error) {
        console.log('ServiceWorker registration failed:', error);
      }
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize main weather app
  const weatherApp = new WeatherApp();
  
  // Initialize performance optimizer
  window.performanceOptimizer = new PerformanceOptimizer();
  
  // Optional: Register service worker for PWA features
  // PWAManager.registerServiceWorker();
  
  // Global error handler
  window.addEventListener('error', (event) => {
    ErrorHandler.log(event.error, 'Global');
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.log(event.reason, 'Unhandled Promise Rejection');
  });
});

// Export for module use (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WeatherApp, PerformanceOptimizer, ErrorHandler };
}
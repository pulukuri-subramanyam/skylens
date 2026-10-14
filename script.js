/**
 * WeatherPro - Advanced Weather Application
 * Enterprise-level weather app with real-time data integration
 */

class WeatherApp {
  constructor() {
    this.API_KEY = 'efee026d9bd3f6c38d85018aade0bc49'; // OpenWeather One Call API key
    this.OPENWEATHER_BASE_URL = 'https://api.openweathermap.org';
    this.OPENWEATHER_ICON_BASE_URL = 'https://openweathermap.org/img/wn';
    this.currentChart = null;
    this.currentLocation = null;
    this.lastSearchQuery = '';
    this.DEFAULT_CITY = 'London';
    this.savedCities = this.loadCityList('weatherapp-saved-cities');
    this.recentCities = this.loadCityList('weatherapp-recent-cities');
    this.currentCity = null;
    this.lastFetchedAt = null;
    this.lastRefreshError = null;
    this.isRefreshing = false;
    this.weatherRequestId = 0;
    this.suggestionTimer = null;
    this.suggestionRequestId = 0;
    this.citySuggestions = [];
    this.activeSuggestionIndex = -1;
    this.temperatureUnit = localStorage.getItem('weatherapp-temperature-unit') || 'C';
    this.currentWeatherData = null;
    this.forecastData = null;
    
    this.initializeApp();
    this.bindEvents();
    this.loadThemePreference();
    window.setInterval(() => this.updateFreshness(), 60000);
  }

  // Initialize the application
  initializeApp() {
    this.elements = {
      // Search elements
      cityInput: document.getElementById('cityInput'),
      searchBtn: document.getElementById('searchBtn'),
      citySuggestions: document.getElementById('citySuggestions'),
      locationBtn: document.getElementById('locationBtn'),
      cityShortcuts: document.getElementById('cityShortcuts'),
      savedCitySection: document.getElementById('savedCitySection'),
      savedCitiesList: document.getElementById('savedCitiesList'),
      recentCitySection: document.getElementById('recentCitySection'),
      recentCitiesList: document.getElementById('recentCitiesList'),
      cityShortcutStatus: document.getElementById('cityShortcutStatus'),
      saveCityBtn: document.getElementById('saveCityBtn'),
      refreshBtn: document.getElementById('refreshBtn'),
      dataFreshness: document.getElementById('dataFreshness'),
      celsiusBtn: document.getElementById('celsiusBtn'),
      fahrenheitBtn: document.getElementById('fahrenheitBtn'),
      
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

    this.updateUnitToggle();
    this.renderCityShortcuts();
    this.updateSaveCityButton();

    // Auto-detect location on app load
    this.autoDetectLocation();
  }

  // Bind all event listeners
  bindEvents() {
    // Search and city suggestions
    this.elements.searchBtn.addEventListener('click', () => this.handleSearch());
    this.elements.cityInput.addEventListener('input', () => this.handleCityInput());
    this.elements.cityInput.addEventListener('keydown', (event) => this.handleCitySuggestionKeydown(event));
    this.elements.citySuggestions.addEventListener('pointerdown', (event) => event.preventDefault());
    this.elements.citySuggestions.addEventListener('click', (event) => {
      const option = event.target.closest('.city-suggestion');
      if (option) this.selectCitySuggestion(Number(option.dataset.suggestionIndex));
    });
    this.elements.locationBtn.addEventListener('click', () => this.getCurrentLocation());
    this.elements.saveCityBtn.addEventListener('click', () => this.toggleSavedCurrentCity());
    this.elements.refreshBtn.addEventListener('click', () => this.refreshCurrentWeather());

    // Temperature unit toggle
    this.elements.celsiusBtn.addEventListener('click', () => this.setTemperatureUnit('C'));
    this.elements.fahrenheitBtn.addEventListener('click', () => this.setTemperatureUnit('F'));

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
      window.setTimeout(() => this.closeCitySuggestions(), 120);
    });
  }

  handleCityInput() {
    const query = this.elements.cityInput.value.trim();
    window.clearTimeout(this.suggestionTimer);
    this.closeCitySuggestions();

    if (query.length < 2 || /^-?\\d+(?:\\.\\d+)?\\s*,\\s*-?\\d+(?:\\.\\d+)?$/.test(query)) {
      return;
    }

    const requestId = this.suggestionRequestId;
    this.suggestionTimer = window.setTimeout(() => {
      this.fetchCitySuggestions(query, requestId);
    }, 280);
  }

  async fetchCitySuggestions(query, requestId) {
    const params = new URLSearchParams({
      q: query,
      limit: '5',
      appid: this.API_KEY
    });

    try {
      const results = await this.fetchOpenWeather(
        `${this.OPENWEATHER_BASE_URL}/geo/1.0/direct?${params.toString()}`
      );
      if (
        requestId !== this.suggestionRequestId ||
        this.elements.cityInput.value.trim() !== query
      ) {
        return;
      }

      const uniqueLocations = new Map();
      (Array.isArray(results) ? results : []).forEach((location) => {
        const key = `${Number(location.lat).toFixed(3)},${Number(location.lon).toFixed(3)}`;
        if (!uniqueLocations.has(key)) uniqueLocations.set(key, location);
      });
      this.citySuggestions = Array.from(uniqueLocations.values()).slice(0, 5);
      this.renderCitySuggestions();
    } catch (error) {
      if (requestId === this.suggestionRequestId) {
        this.citySuggestions = [];
        this.renderCitySuggestions();
      }
    }
  }

  formatCitySuggestionDetails(location) {
    return [location.state, location.country].filter(Boolean).join(', ');
  }

  renderCitySuggestions() {
    const list = this.elements.citySuggestions;
    list.replaceChildren();
    this.activeSuggestionIndex = -1;

    this.citySuggestions.forEach((location, index) => {
      const option = document.createElement('div');
      option.id = `city-suggestion-${index}`;
      option.className = 'city-suggestion';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.dataset.suggestionIndex = String(index);

      const name = document.createElement('span');
      name.className = 'city-suggestion-name';
      name.textContent = location.name;

      const details = document.createElement('span');
      details.className = 'city-suggestion-details';
      details.textContent = this.formatCitySuggestionDetails(location);

      option.append(name, details);
      list.appendChild(option);
    });

    const hasSuggestions = this.citySuggestions.length > 0;
    list.hidden = !hasSuggestions;
    this.elements.cityInput.setAttribute('aria-expanded', String(hasSuggestions));
    this.elements.cityInput.removeAttribute('aria-activedescendant');
  }

  setActiveCitySuggestion(index) {
    const options = Array.from(this.elements.citySuggestions.querySelectorAll('.city-suggestion'));
    if (!options.length) return;

    this.activeSuggestionIndex = index;
    options.forEach((option, optionIndex) => {
      const isActive = optionIndex === index;
      option.classList.toggle('is-active', isActive);
      option.setAttribute('aria-selected', String(isActive));
    });

    const activeOption = options[index];
    this.elements.cityInput.setAttribute('aria-activedescendant', activeOption.id);
    activeOption.scrollIntoView({ block: 'nearest' });
  }

  handleCitySuggestionKeydown(event) {
    const optionCount = this.citySuggestions.length;

    if (event.key === 'ArrowDown' && optionCount) {
      event.preventDefault();
      const nextIndex = (this.activeSuggestionIndex + 1) % optionCount;
      this.setActiveCitySuggestion(nextIndex);
      return;
    }

    if (event.key === 'ArrowUp' && optionCount) {
      event.preventDefault();
      const nextIndex = this.activeSuggestionIndex <= 0
        ? optionCount - 1
        : this.activeSuggestionIndex - 1;
      this.setActiveCitySuggestion(nextIndex);
      return;
    }

    if (event.key === 'Escape' && !this.elements.citySuggestions.hidden) {
      event.preventDefault();
      this.closeCitySuggestions();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.activeSuggestionIndex >= 0) {
        this.selectCitySuggestion(this.activeSuggestionIndex);
      } else {
        this.handleSearch();
      }
    }
  }

  async selectCitySuggestion(index) {
    const location = this.citySuggestions[index];
    if (!location) return;

    const query = `${location.lat},${location.lon}`;
    this.elements.cityInput.value = [
      location.name,
      location.state,
      location.country
    ].filter(Boolean).join(', ');
    this.lastSearchQuery = query;
    this.closeCitySuggestions();
    await this.fetchWeatherData(query, { location });
  }

  closeCitySuggestions() {
    this.suggestionRequestId += 1;
    this.citySuggestions = [];
    this.activeSuggestionIndex = -1;
    this.elements.citySuggestions.hidden = true;
    this.elements.cityInput.setAttribute('aria-expanded', 'false');
    this.elements.cityInput.removeAttribute('aria-activedescendant');
  }

  updateUnitToggle() {
    const isCelsius = this.temperatureUnit === 'C';
    this.elements.celsiusBtn.closest('.unit-toggle').dataset.unit = this.temperatureUnit;
    this.elements.celsiusBtn.classList.toggle('is-active', isCelsius);
    this.elements.fahrenheitBtn.classList.toggle('is-active', !isCelsius);
    this.elements.celsiusBtn.setAttribute('aria-pressed', String(isCelsius));
    this.elements.fahrenheitBtn.setAttribute('aria-pressed', String(!isCelsius));
  }

  loadCityList(storageKey) {
    try {
      const cities = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(cities)) return [];
      return cities.filter((city) =>
        city &&
        typeof city.id === 'string' &&
        typeof city.name === 'string' &&
        typeof city.label === 'string' &&
        typeof city.query === 'string'
      );
    } catch (error) {
      return [];
    }
  }

  persistCityList(storageKey, cities) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cities));
      return true;
    } catch (error) {
      return false;
    }
  }

  createCityShortcut(location) {
    if (!location || !location.name) return null;
    const name = String(location.name).trim();
    if (!name) return null;
    const region = String(location.region || location.country || '').trim();
    const label = region ? name + ', ' + region : name;
    const latitude = Number(location.lat);
    const longitude = Number(location.lon);
    const hasCoordinates = location.lat != null && location.lon != null &&
      Number.isFinite(latitude) && Number.isFinite(longitude);
    const query = label;
    const id = hasCoordinates ? latitude.toFixed(3) + ',' + longitude.toFixed(3) : label.toLowerCase();
    return { id, name, label, query };
  }

  createCityChip(city, kind) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'city-chip';
    button.textContent = city.label;
    button.setAttribute('aria-label', 'Show weather for ' + city.label);
    if (this.currentCity && this.currentCity.id === city.id) {
      button.classList.add('is-current');
      button.setAttribute('aria-current', 'true');
    }
    button.addEventListener('click', async () => {
      this.lastSearchQuery = city.query;
      this.elements.cityShortcutStatus.textContent = 'Loading weather for ' + city.label + '.';
      await this.fetchWeatherData(city.query);
    });
    return button;
  }

  renderCityShortcuts() {
    const savedCities = this.savedCities || [];
    const recentCities = this.recentCities || [];
    this.elements.savedCitiesList.replaceChildren();
    this.elements.recentCitiesList.replaceChildren();

    savedCities.forEach((city) => {
      this.elements.savedCitiesList.appendChild(this.createCityChip(city, 'saved'));
    });
    recentCities.forEach((city) => {
      this.elements.recentCitiesList.appendChild(this.createCityChip(city, 'recent'));
    });

    this.elements.savedCitySection.hidden = savedCities.length === 0;
    this.elements.recentCitySection.hidden = recentCities.length === 0;
    this.elements.cityShortcuts.hidden = savedCities.length === 0 && recentCities.length === 0;
  }

  rememberRecentCity(city) {
    if (!city) return;
    this.recentCities = [city, ...this.recentCities.filter((item) => item.id !== city.id)].slice(0, 5);
    this.persistCityList('weatherapp-recent-cities', this.recentCities);
    this.renderCityShortcuts();
  }

  toggleSavedCurrentCity() {
    if (!this.currentCity) return;
    const savedIndex = this.savedCities.findIndex((city) => city.id === this.currentCity.id);
    const wasSaved = savedIndex !== -1;
    this.savedCities = wasSaved
      ? this.savedCities.filter((city) => city.id !== this.currentCity.id)
      : [this.currentCity, ...this.savedCities];
    const persisted = this.persistCityList('weatherapp-saved-cities', this.savedCities);
    this.renderCityShortcuts();
    this.updateSaveCityButton();
    this.elements.cityShortcutStatus.textContent = persisted
      ? (wasSaved ? this.currentCity.label + ' removed from saved cities.' : this.currentCity.label + ' saved.')
      : 'Could not save this change on this device.';
  }

  updateSaveCityButton() {
    const isSaved = Boolean(this.currentCity && this.savedCities.some((city) => city.id === this.currentCity.id));
    const cityLabel = this.currentCity ? this.currentCity.label : 'current city';
    this.elements.saveCityBtn.disabled = !this.currentCity;
    this.elements.saveCityBtn.setAttribute('aria-pressed', String(isSaved));
    this.elements.saveCityBtn.setAttribute('aria-label', (isSaved ? 'Remove ' + cityLabel + ' from saved cities' : 'Save ' + cityLabel + ' to saved cities'));
    this.elements.saveCityBtn.classList.toggle('is-saved', isSaved);
    this.elements.saveCityBtn.querySelector('span').textContent = isSaved ? 'Saved' : 'Save';
    this.elements.refreshBtn.disabled = !this.currentCity || this.isRefreshing;
  }

  setRefreshingState(isRefreshing) {
    this.isRefreshing = isRefreshing;
    this.elements.refreshBtn.disabled = isRefreshing || !this.currentCity;
    this.elements.refreshBtn.classList.toggle('is-refreshing', isRefreshing);
    this.elements.refreshBtn.setAttribute('aria-label', isRefreshing ? 'Refreshing weather' : 'Refresh weather');
    this.elements.refreshBtn.querySelector('span').textContent = isRefreshing ? 'Refreshing…' : 'Refresh';
  }

  async refreshCurrentWeather() {
    if (!this.currentCity || this.isRefreshing) return;
    this.elements.cityShortcutStatus.textContent = 'Refreshing weather for ' + this.currentCity.label + '.';
    await this.fetchWeatherData(this.currentCity.query, { preserveCurrentData: true });
  }

  updateFreshness() {
    const freshness = this.elements && this.elements.dataFreshness;
    if (!freshness || !this.lastFetchedAt) return;
    const age = Math.max(0, Date.now() - this.lastFetchedAt);
    const relativeTime = this.formatTime(new Date(this.lastFetchedAt).toISOString());
    const isStale = age >= 15 * 60 * 1000;
    if (this.lastRefreshError) {
      freshness.textContent = 'Refresh failed — showing data checked ' + relativeTime;
      freshness.title = this.getErrorMessage(this.lastRefreshError);
    } else if (isStale) {
      freshness.textContent = 'May be outdated — checked ' + relativeTime;
      freshness.title = 'Refresh to check for newer weather data.';
    } else {
      freshness.textContent = 'Checked ' + relativeTime;
      freshness.title = 'Time of the last successful weather check.';
    }
    freshness.classList.toggle('is-stale', isStale || Boolean(this.lastRefreshError));
  }

  setTemperatureUnit(unit) {
    if (unit !== 'C' && unit !== 'F') return;
    if (unit === this.temperatureUnit) return;

    this.temperatureUnit = unit;
    localStorage.setItem('weatherapp-temperature-unit', unit);
    this.updateUnitToggle();

    if (!this.currentWeatherData || !this.forecastData) return;
    this.updateCurrentWeather(this.currentWeatherData);
    this.updateHourlyChart(this.forecastData);
    this.updateForecast(this.forecastData);
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
            this.lastSearchQuery = locationQuery;
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

    window.clearTimeout(this.suggestionTimer);
    this.closeCitySuggestions();
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

  // Resolve a city name or coordinate pair to a precise OpenWeather location.
  async resolveLocation(query) {
    const coordinateMatch = String(query).trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    let endpoint;

    if (coordinateMatch) {
      const [, lat, lon] = coordinateMatch;
      endpoint = `${this.OPENWEATHER_BASE_URL}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.API_KEY}`;
    } else {
      endpoint = `${this.OPENWEATHER_BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${this.API_KEY}`;
    }

    const response = await this.fetchOpenWeather(endpoint);
    const match = Array.isArray(response) ? response[0] : null;

    if (!match) {
      if (coordinateMatch) {
        const [, lat, lon] = coordinateMatch;
        return { name: 'Current location', state: '', country: '', lat: Number(lat), lon: Number(lon) };
      }
      throw new Error('No matching location found');
    }

    return {
      name: match.name,
      state: match.state || '',
      country: match.country || '',
      lat: Number(match.lat),
      lon: Number(match.lon)
    };
  }

  async fetchOpenWeather(url) {
    const response = await fetch(url);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || `HTTP error! status: ${response.status}`);
    }

    return payload;
  }

  getOpenWeatherIcon(weather) {
    const iconCode = weather?.icon || '01d';
    return `${this.OPENWEATHER_ICON_BASE_URL}/${iconCode}@2x.png`;
  }

  getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round((Number(degrees || 0) % 360) / 45) % 8];
  }

  normalizeOpenWeatherData(location, currentPayload, hourlyPayload, dailyPayload) {
    const currentPoint = currentPayload.data?.[0];
    if (!currentPoint) {
      throw new Error('Weather data was not available');
    }

    const toFahrenheit = value => (Number(value) * 9) / 5 + 32;
    const toKph = value => Number(value || 0) * 3.6;
    const toIso = timestamp => new Date(Number(timestamp) * 1000).toISOString();
    const readableText = weather => {
      const value = weather?.description || 'Unknown conditions';
      return value.charAt(0).toUpperCase() + value.slice(1);
    };
    const conditionFor = point => ({
      text: readableText(point.weather?.[0]),
      icon: this.getOpenWeatherIcon(point.weather?.[0])
    });
    const isDay = currentPoint.sunrise && currentPoint.sunset
      ? currentPoint.dt >= currentPoint.sunrise && currentPoint.dt <= currentPoint.sunset
      : true;

    const currentData = {
      location: {
        name: location.name,
        region: location.state || location.country,
        country: location.country,
        lat: location.lat,
        lon: location.lon
      },
      current: {
        last_updated: toIso(currentPoint.dt),
        condition: conditionFor(currentPoint),
        temp_c: Number(currentPoint.temp),
        temp_f: toFahrenheit(currentPoint.temp),
        feelslike_c: Number(currentPoint.feels_like),
        feelslike_f: toFahrenheit(currentPoint.feels_like),
        humidity: Number(currentPoint.humidity),
        wind_kph: Math.round(toKph(currentPoint.wind_speed)),
        wind_dir: this.getWindDirection(currentPoint.wind_deg),
        pressure_mb: Number(currentPoint.pressure),
        vis_km: Number(currentPoint.visibility || 0) / 1000,
        uv: Number(currentPoint.uvi || 0),
        is_day: isDay ? 1 : 0
      }
    };

    const hourly = (hourlyPayload.data || [])
      .filter(point => Number(point.dt) * 1000 >= Date.now())
      .slice(0, 24)
      .map(point => ({
        time: toIso(point.dt),
        temp_c: Number(point.temp),
        temp_f: toFahrenheit(point.temp)
      }));

    const forecastDays = (dailyPayload.data || []).slice(0, 7).map(point => ({
      date: toIso(point.dt),
      day: {
        condition: conditionFor(point),
        maxtemp_c: Number(point.temp?.max ?? point.temp?.day),
        maxtemp_f: toFahrenheit(point.temp?.max ?? point.temp?.day),
        mintemp_c: Number(point.temp?.min ?? point.temp?.night),
        mintemp_f: toFahrenheit(point.temp?.min ?? point.temp?.night)
      }
    }));

    if (!forecastDays.length) {
      throw new Error('Forecast data was not available');
    }

    // Keep a stable display shape so the rest of the interface needs no API-specific logic.
    return {
      currentData,
      forecastData: {
        forecast: {
          forecastday: [{
            ...forecastDays[0],
            hour: hourly
          }, ...forecastDays.slice(1)]
        }
      }
    };
  }

  // Fetch weather data from OpenWeather One Call 4.0.
  async fetchWeatherData(query, options = {}) {
    const requestId = ++this.weatherRequestId;
    const preserveCurrentData = Boolean(options.preserveCurrentData && this.currentWeatherData && this.forecastData);
    if (preserveCurrentData) {
      this.setRefreshingState(true);
    } else {
      this.setRefreshingState(false);
      this.showLoading();
    }

    try {
      const location = options.location || await this.resolveLocation(query);
      if (requestId !== this.weatherRequestId) return;

      const params = `lat=${location.lat}&lon=${location.lon}&units=metric&lang=en&appid=${this.API_KEY}`;
      const [currentPayload, hourlyPayload, dailyPayload] = await Promise.all([
        this.fetchOpenWeather(`${this.OPENWEATHER_BASE_URL}/data/4.0/onecall/current?${params}`),
        this.fetchOpenWeather(`${this.OPENWEATHER_BASE_URL}/data/4.0/onecall/timeline/1h?${params}`),
        this.fetchOpenWeather(`${this.OPENWEATHER_BASE_URL}/data/4.0/onecall/timeline/1day?${params}`)
      ]);

      if (requestId !== this.weatherRequestId) return;

      const { currentData, forecastData } = this.normalizeOpenWeatherData(
        location,
        currentPayload,
        hourlyPayload,
        dailyPayload
      );

      this.currentWeatherData = currentData;
      this.forecastData = forecastData;
      this.currentCity = this.createCityShortcut(currentData.location);
      if (this.currentCity) {
        this.rememberRecentCity(this.currentCity);
        this.updateSaveCityButton();
      }
      this.lastFetchedAt = Date.now();
      this.lastRefreshError = null;
      this.updateFreshness();

      this.updateCurrentWeather(currentData);
      this.updateHourlyChart(forecastData);
      this.updateForecast(forecastData);
      this.updateBackground(currentData.current);
      this.showWeatherContent();
      this.elements.cityShortcutStatus.textContent = 'Weather loaded for ' + (this.currentCity ? this.currentCity.label : 'the selected city') + '.';
      this.elements.cityInput.value = '';
    } catch (error) {
      if (requestId !== this.weatherRequestId) return;
      console.error('Error fetching weather data:', error);
      if (preserveCurrentData) {
        this.lastRefreshError = error;
        this.updateFreshness();
        this.elements.cityShortcutStatus.textContent = 'Refresh failed. Showing the last successful weather data.';
      } else {
        this.showError(this.getErrorMessage(error));
      }
    } finally {
      if (requestId === this.weatherRequestId && preserveCurrentData) {
        this.setRefreshingState(false);
      }
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
    const unitKey = this.temperatureUnit.toLowerCase();
    
    // Location and timestamp
    this.elements.locationName.textContent = `${location.name}, ${location.region || location.country}`;
    this.elements.lastUpdated.textContent = `Last updated: ${this.formatTime(current.last_updated)}`;
    
    // Weather icon
    this.elements.currentWeatherIcon.src = current.condition.icon;
    this.elements.currentWeatherIcon.alt = current.condition.text;
    
    // Temperature and condition
    this.elements.currentTemp.textContent = `${Math.round(current[`temp_${unitKey}`])}°${this.temperatureUnit}`;
    this.elements.currentCondition.textContent = current.condition.text;
    this.elements.feelsLike.textContent = `${Math.round(current[`feelslike_${unitKey}`])}°${this.temperatureUnit}`;
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

  getChartPalette() {
    const styles = getComputedStyle(document.documentElement);
    const read = (property) => styles.getPropertyValue(property).trim();

    return {
      line: read('--chart-line-color'),
      fill: read('--chart-fill-color'),
      grid: read('--chart-grid-color'),
      text: read('--chart-text-color'),
      pointBorder: read('--chart-point-border')
    };
  }

  // Update 24-hour temperature chart
  updateHourlyChart(data) {
    const ctx = this.elements.temperatureChart.getContext('2d');
    const chartPalette = this.getChartPalette();
    const unitKey = this.temperatureUnit.toLowerCase();
    const temperatureUnit = this.temperatureUnit;
    
    // Destroy existing chart
    if (this.currentChart) {
      this.currentChart.destroy();
    }
    
    // One Call's hourly timeline starts at the current hour.
    const hourlyData = data.forecast.forecastday
      .flatMap(day => day.hour || [])
      .slice(0, 24);
    
    const labels = hourlyData.map(hour => {
      const time = new Date(hour.time);
      return time.getHours() === 0 ? '12 AM' : 
             time.getHours() === 12 ? '12 PM' :
             time.getHours() > 12 ? `${time.getHours() - 12} PM` :
             `${time.getHours()} AM`;
    });
    
    const temperatures = hourlyData.map(hour => Math.round(hour[`temp_${unitKey}`]));
    
    // Chart configuration
    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `Temperature (°${temperatureUnit})`,
          data: temperatures,
          borderColor: chartPalette.line,
          backgroundColor: chartPalette.fill,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: chartPalette.line,
          pointBorderColor: chartPalette.pointBorder,
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
            borderColor: chartPalette.line,
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
                return `${context.parsed.y}°${temperatureUnit}`;
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
              color: chartPalette.text,
              maxTicksLimit: 8
            },
            border: {
              display: false
            }
          },
          y: {
            grid: {
              color: chartPalette.grid,
              borderDash: [2, 2]
            },
            ticks: {
              color: chartPalette.text,
              callback: function(value) {
                return `${value}°${temperatureUnit}`;
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
    const unitKey = this.temperatureUnit.toLowerCase();
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
        <img src="${day.day.condition.icon}" alt="${day.day.condition.text}" class="forecast-icon">
        <div class="forecast-temps">
          <span class="temp-max">${Math.round(day.day[`maxtemp_${unitKey}`])}°</span>
          <span class="temp-min">${Math.round(day.day[`mintemp_${unitKey}`])}°</span>
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
    this.refreshChartTheme();
    
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

  refreshChartTheme() {
    if (!this.currentChart) return;

    const chartPalette = this.getChartPalette();
    const dataset = this.currentChart.data.datasets[0];
    dataset.borderColor = chartPalette.line;
    dataset.backgroundColor = chartPalette.fill;
    dataset.pointBackgroundColor = chartPalette.line;
    dataset.pointBorderColor = chartPalette.pointBorder;
    this.currentChart.options.plugins.tooltip.borderColor = chartPalette.line;
    this.currentChart.options.scales.x.ticks.color = chartPalette.text;
    this.currentChart.options.scales.y.grid.color = chartPalette.grid;
    this.currentChart.options.scales.y.ticks.color = chartPalette.text;
    this.currentChart.update();
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
    document.body.classList.add('has-weather-data');
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
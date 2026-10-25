/**
 * Skylens - Weather Dashboard
 */

class WeatherApp {
  constructor() {
    this.PHOTON_BASE_URL = 'https://photon.komoot.io';
    this.OPENWEATHER_ICON_BASE_URL = 'https://openweathermap.org/img/wn';
    this.currentChart = null;
    this.currentLocation = null;
    this.lastSearchQuery = '';
    this.lastActionType = 'default';
    this.DEFAULT_CITY = 'London';
    this.savedCities = this.loadCityList('weatherapp-saved-cities');
    this.recentCities = this.loadCityList('weatherapp-recent-cities');
    this.currentCity = null;
    this.lastFetchedAt = null;
    this.lastRefreshError = null;
    this.isRefreshing = false;
    this.weatherRequestId = 0;
    this.locationRequestId = 0;
    this.suggestionTimer = null;
    this.suggestionController = null;
    this.suggestionRequestId = 0;
    this.citySuggestions = [];
    this.lastSuggestionQuery = '';
    this.isSearchingCities = false;
    this.activeSuggestionIndex = -1;
    this.temperatureUnit = localStorage.getItem('weatherapp-temperature-unit') || 'C';
    this.currentWeatherData = null;
    this.forecastData = null;
    this.lastAirQuality = null;
    
    this.initializeApp();
    this.bindEvents();
    this.loadThemePreference();
    window.setInterval(() => {
      this.updateFreshness();
      this.updateLocationLocalTime();
    }, 60000);
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
      shareWeatherBtn: document.getElementById('shareWeatherBtn'),
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
      cityLocalTime: document.getElementById('cityLocalTime'),
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
      sunriseTime: document.getElementById('sunriseTime'),
      sunsetTime: document.getElementById('sunsetTime'),
      airQuality: document.getElementById('airQuality'),
      sunProgress: document.getElementById('sunProgress'),
      sunProgressLabel: document.getElementById('sunProgressLabel'),
      sunProgressFill: document.getElementById('sunProgressFill'),
      sunProgressMarker: document.getElementById('sunProgressMarker'),
      
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
    this.restoreCachedWeather();
    this.registerServiceWorker();

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
    this.elements.locationBtn.addEventListener('click', () => {
      this.getCurrentLocation().catch(() => {});
    });
    this.elements.saveCityBtn.addEventListener('click', () => this.toggleSavedCurrentCity());
    this.elements.shareWeatherBtn.addEventListener('click', () => this.shareCurrentWeather());
    this.elements.refreshBtn.addEventListener('click', () => this.refreshCurrentWeather());

    // Temperature unit toggle
    this.elements.celsiusBtn.addEventListener('click', () => this.setTemperatureUnit('C'));
    this.elements.fahrenheitBtn.addEventListener('click', () => this.setTemperatureUnit('F'));

    // Theme toggle
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Retry button
    this.elements.retryBtn.addEventListener('click', () => {
      this.retryLastAction().catch(() => {});
    });

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
    const previousSuggestions = this.citySuggestions;
    const previousQuery = this.normalizeLocationText(this.lastSuggestionQuery);
    const normalizedQuery = this.normalizeLocationText(query);

    window.clearTimeout(this.suggestionTimer);
    this.closeCitySuggestions();

    if (normalizedQuery.replace(/\s/g, '').length < 2 || /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(query)) {
      return;
    }

    const canReusePrevious =
      previousQuery.length >= 2 &&
      normalizedQuery.startsWith(previousQuery);
    const cachedSuggestions = canReusePrevious
      ? this.filterCitySuggestions(previousSuggestions, query)
      : [];

    this.citySuggestions = cachedSuggestions.length
      ? cachedSuggestions
      : this.getLocalCitySuggestions(query);
    this.lastSuggestionQuery = query;
    this.isSearchingCities = true;
    this.renderCitySuggestions();

    const requestId = this.suggestionRequestId;
    this.suggestionTimer = window.setTimeout(() => {
      this.fetchCitySuggestions(query, requestId);
    }, 120);
  }

  async fetchCitySuggestions(query, requestId) {
    const controller = new AbortController();
    this.suggestionController = controller;
    const { signal } = controller;

    const candidates = {
      weather: [],
      photon: [],
      india: []
    };

    const renderCurrentResults = () => {
      if (
        signal.aborted ||
        requestId !== this.suggestionRequestId ||
        this.elements.cityInput.value.trim() !== query
      ) {
        return;
      }

      this.citySuggestions = this.combineCitySuggestions(
        candidates.weather,
        query,
        candidates.photon,
        candidates.india
      );
      this.lastSuggestionQuery = query;
      this.renderCitySuggestions();
    };

    const loadProvider = async (key, request) => {
      try {
        const results = await request;
        candidates[key] = Array.isArray(results) ? results : [];
      } catch (error) {
        if (error.name !== 'AbortError') candidates[key] = [];
      }
      renderCurrentResults();
    };

    const weatherRequest = this.fetchJson(
      this.getWeatherApiUrl('geocode', { q: query }),
      { signal }
    );
    const photonRequest = this.fetchPhotonCitySuggestions(query, '', signal);
    const indiaPhotonRequest = this.fetchPhotonCitySuggestions(query, 'IN', signal);

    await Promise.all([
      loadProvider('weather', weatherRequest),
      loadProvider('photon', photonRequest),
      loadProvider('india', indiaPhotonRequest)
    ]);

    if (requestId === this.suggestionRequestId && !signal.aborted) {
      this.isSearchingCities = false;
      this.renderCitySuggestions();
    }

    if (this.suggestionController === controller) {
      this.suggestionController = null;
    }
  }

  async fetchPhotonCitySuggestions(query, countryCode = '', signal) {
    const params = new URLSearchParams({ q: query, limit: '15', lang: 'en' });
    if (countryCode) params.set('countrycode', countryCode);
    params.append('layer', 'city');
    params.append('layer', 'locality');

    const payload = await this.fetchJson(
      this.PHOTON_BASE_URL + '/api/?' + params.toString(),
      { signal }
    );
    const features = Array.isArray(payload.features) ? payload.features : [];

    return features.map((feature) => {
      const properties = feature && feature.properties ? feature.properties : {};
      const featureType = String(properties.type || '').toLowerCase();
      const osmKey = String(properties.osm_key || '').toLowerCase();
      if (featureType === 'locality' && osmKey !== 'place') return null;

      const coordinates =
        feature && feature.geometry && Array.isArray(feature.geometry.coordinates)
          ? feature.geometry.coordinates
          : [];
      const name = properties.name || properties.city;
      const lon = Number(coordinates[0]);
      const lat = Number(coordinates[1]);

      if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      const parentCity = properties.city &&
        this.normalizeLocationText(properties.city) !== this.normalizeLocationText(name)
        ? properties.city
        : '';

      return {
        name,
        state: properties.state || '',
        district: properties.county || properties.district || '',
        parentCity,
        country: properties.country || '',
        countryCode: properties.countrycode || properties.country_code || '',
        lat,
        lon,
        osmSource: true
      };
    }).filter(Boolean);
  }

  normalizeLocationText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[.,]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getCountryDisplayName(countryCode) {
    const code = String(countryCode || '').trim();
    const displayCode = /^[a-z]{2}$/i.test(code) ? code.toUpperCase() : code;
    if (!code) return '';

    try {
      if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(displayCode) || displayCode;
      }
    } catch (error) {
      return displayCode;
    }
    return displayCode;
  }

  rankCityLocations(locations, query) {
    const normalizedQuery = this.normalizeLocationText(query);
    const rawParts = String(query || '').split(',');
    const nameQuery = this.normalizeLocationText(rawParts[0]);
    const qualifierTokens = rawParts
      .slice(1)
      .map((part) => this.normalizeLocationText(part))
      .join(' ')
      .split(' ')
      .filter(Boolean);
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);

    return (Array.isArray(locations) ? locations : [])
      .map((location, originalIndex) => {
        if (
          !location ||
          !Number.isFinite(Number(location.lat)) ||
          !Number.isFinite(Number(location.lon))
        ) {
          return null;
        }

        const name = this.normalizeLocationText(location.name);
        const state = this.normalizeLocationText(location.state);
        const district = this.normalizeLocationText(location.district);
        const parentCity = this.normalizeLocationText(location.parentCity);
        const rawCountry = location.countryCode || location.country;
        const countryName = this.normalizeLocationText(this.getCountryDisplayName(rawCountry));
        const countryCode = this.normalizeLocationText(
          location.countryCode || (/^[a-z]{2}$/i.test(String(location.country || '')) ? location.country : '')
        );
        const searchableText = [name, district, parentCity, state, countryName, countryCode]
          .filter(Boolean)
          .join(' ');
        const qualifierMatches =
          qualifierTokens.length === 0 ||
          qualifierTokens.every((token) => searchableText.includes(token));
        let score = 5;

        if (name && name === nameQuery) {
          score = qualifierMatches ? 0 : 4;
        } else if (name && nameQuery && name.startsWith(nameQuery)) {
          score = qualifierMatches ? 1 : 4;
        } else if (name && nameQuery && name.includes(nameQuery)) {
          score = qualifierMatches ? 2 : 4;
        } else if (queryTokens.length && queryTokens.every((token) => searchableText.includes(token))) {
          score = 3;
        }

        return { location, originalIndex, score };
      })
      .filter(Boolean)
      .sort((left, right) => left.score - right.score || left.originalIndex - right.originalIndex)
      .map((entry) => entry.location);
  }

  filterCitySuggestions(locations, query) {
    const queryTokens = this.normalizeLocationText(query).split(' ').filter(Boolean);
    if (!queryTokens.length) return [];

    return this.rankCityLocations(locations, query)
      .filter((location) => {
        const searchableText = this.normalizeLocationText([
          location.name,
          location.district,
          location.parentCity,
          location.state,
          location.countryCode,
          this.getCountryDisplayName(location.countryCode || location.country)
        ].filter(Boolean).join(' '));
        return queryTokens.every((token) => searchableText.includes(token));
      })
      .slice(0, 12);
  }

  getLocalCitySuggestions(query) {
    const normalizedQuery = this.normalizeLocationText(query);
    if (normalizedQuery.replace(/\s/g, '').length < 2) return [];

    const entries = [
      ...(this.recentCities || []).map((city) => ({ city, source: 'Recent' })),
      ...(this.savedCities || []).map((city) => ({ city, source: 'Saved' }))
    ];
    const seenIds = new Set();
    const suggestions = [];

    entries.forEach(({ city, source }) => {
      if (!city || !city.name || !city.label || seenIds.has(city.id)) return;
      const searchableText = this.normalizeLocationText(city.name + ' ' + city.label);
      if (!searchableText.includes(normalizedQuery)) return;

      let lat = city.lat != null ? Number(city.lat) : NaN;
      let lon = city.lon != null ? Number(city.lon) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        const coordinateMatch = String(city.id).match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
        if (!coordinateMatch) return;
        lat = Number(coordinateMatch[1]);
        lon = Number(coordinateMatch[2]);
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      seenIds.add(city.id);
      const savedRegion = city.label.includes(',')
        ? city.label.slice(city.label.indexOf(',') + 1).trim()
        : '';

      suggestions.push({
        name: city.name,
        state: city.state || '',
        country: city.country || '',
        countryCode: city.countryCode || city.country || '',
        lat,
        lon,
        suggestionDetails: city.state || city.country ? '' : savedRegion,
        source
      });
    });

    return suggestions.slice(0, 5);
  }

  isSameCitySuggestion(left, right) {
    const leftCountryCode = /^[a-z]{2}$/i.test(String(left.countryCode || ''))
      ? left.countryCode
      : (/^[a-z]{2}$/i.test(String(left.country || '')) ? left.country : '');
    const rightCountryCode = /^[a-z]{2}$/i.test(String(right.countryCode || ''))
      ? right.countryCode
      : (/^[a-z]{2}$/i.test(String(right.country || '')) ? right.country : '');
    const leftCountry = this.normalizeLocationText(
      leftCountryCode ? this.getCountryDisplayName(leftCountryCode) : left.country
    );
    const rightCountry = this.normalizeLocationText(
      rightCountryCode ? this.getCountryDisplayName(rightCountryCode) : right.country
    );

    if (leftCountry && rightCountry && leftCountry !== rightCountry) return false;

    const leftName = this.normalizeLocationText(left.name);
    const rightName = this.normalizeLocationText(right.name);
    const namesMatch = leftName === rightName;
    const leftState = this.normalizeLocationText(left.state);
    const rightState = this.normalizeLocationText(right.state);
    const sameState = Boolean(leftState && rightState && leftState === rightState);

    const latitudeDelta = (Number(left.lat) - Number(right.lat)) * 111;
    const meanLatitude = (Number(left.lat) + Number(right.lat)) * Math.PI / 360;
    const longitudeDelta =
      (Number(left.lon) - Number(right.lon)) * 111 * Math.cos(meanLatitude);
    const distanceKm = Math.hypot(latitudeDelta, longitudeDelta);

    // Providers can return different spellings for the same place at the same point.
    if (distanceKm < 1.5 && (namesMatch || sameState)) return true;
    if (!namesMatch) return false;

    // Small coordinate shifts between providers are normal; don't let differing
    // district/state metadata create duplicate rows for the same town.
    if (distanceKm < 5) return true;
    if (leftState && rightState && leftState !== rightState) return false;

    const leftArea = this.normalizeLocationText(left.district || left.parentCity);
    const rightArea = this.normalizeLocationText(right.district || right.parentCity);
    if (leftArea && rightArea && leftArea !== rightArea) return false;

    const leftDetails = this.normalizeLocationText(this.formatCitySuggestionDetails(left));
    const rightDetails = this.normalizeLocationText(this.formatCitySuggestionDetails(right));
    if (leftDetails === rightDetails) return true;

    return distanceKm < 15;
  }

  combineCitySuggestions(results, query, supplementalResults = [], indiaResults = []) {
    const openWeatherResults = this.rankCityLocations(results, query).slice(0, 5);
    const mapResults = this.rankCityLocations(supplementalResults, query).slice(0, 15);
    const indiaMapResults = this.rankCityLocations(indiaResults, query).slice(0, 15);
    const suggestions = [];

    [...openWeatherResults, ...mapResults, ...indiaMapResults].forEach((location) => {
      const normalizedLocation = {
        ...location,
        lat: Number(location.lat),
        lon: Number(location.lon)
      };
      const duplicate = suggestions.find((item) =>
        this.isSameCitySuggestion(item, normalizedLocation)
      );

      if (duplicate) {
        if (normalizedLocation.osmSource) duplicate.osmSource = true;
        if (!duplicate.source) duplicate.source = normalizedLocation.source;
      } else {
        suggestions.push(normalizedLocation);
      }
    });

    this.getLocalCitySuggestions(query).forEach((location) => {
      const duplicate = suggestions.find((item) => this.isSameCitySuggestion(item, location));
      if (duplicate) {
        if (!duplicate.source) duplicate.source = location.source;
      } else {
        suggestions.push(location);
      }
    });

    return this.rankCityLocations(suggestions, query).slice(0, 12);
  }

  formatCitySuggestionDetails(location) {
    if (location.suggestionDetails) return location.suggestionDetails;
    const details = [
      location.district,
      location.parentCity,
      location.state,
      this.getCountryDisplayName(location.countryCode || location.country)
    ].filter(Boolean);
    const uniqueDetails = details.filter((detail, index) =>
      details.findIndex((candidate) =>
        this.normalizeLocationText(candidate) === this.normalizeLocationText(detail)
      ) === index
    );
    return uniqueDetails.join(', ');
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

      const meta = document.createElement('span');
      meta.className = 'city-suggestion-meta';

      const details = document.createElement('span');
      details.className = 'city-suggestion-details';
      details.textContent = this.formatCitySuggestionDetails(location);

      meta.appendChild(details);
      if (location.source) {
        const source = document.createElement('span');
        source.className = 'city-suggestion-source';
        source.textContent = location.source;
        meta.appendChild(source);
      }

      option.append(name, meta);
      list.appendChild(option);
    });

    if (this.isSearchingCities) {
      const status = document.createElement('div');
      status.className = 'city-suggestion-status';
      status.setAttribute('role', 'option');
      status.setAttribute('aria-disabled', 'true');
      status.textContent = this.citySuggestions.length
        ? 'Finding more places…'
        : 'Searching places…';
      list.appendChild(status);
    }

    const hasSuggestions = this.citySuggestions.length > 0;
    list.hidden = !hasSuggestions && !this.isSearchingCities;
    this.elements.cityInput.setAttribute('aria-expanded', String(!list.hidden));
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

    this.invalidatePendingLocationLookup();
    const query = `${location.lat},${location.lon}`;
    const details = this.formatCitySuggestionDetails(location);
    this.elements.cityInput.value = [location.name, details].filter(Boolean).join(', ');
    this.lastSearchQuery = query;
    this.lastActionType = 'search';
    this.closeCitySuggestions();
    await this.fetchWeatherData(query, { location });
  }

  closeCitySuggestions() {
    this.suggestionRequestId += 1;
    if (this.suggestionController) {
      this.suggestionController.abort();
      this.suggestionController = null;
    }
    this.citySuggestions = [];
    this.lastSuggestionQuery = '';
    this.isSearchingCities = false;
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
    return {
      id,
      name,
      label,
      query,
      lat: hasCoordinates ? latitude : null,
      lon: hasCoordinates ? longitude : null,
      state: String(location.state || '').trim(),
      country: String(location.country || '').trim(),
      countryCode: String(location.countryCode || location.country || '').trim()
    };
  }

  createCityChip(city, kind, index = 0) {
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
      this.invalidatePendingLocationLookup();
      this.lastSearchQuery = city.query;
      this.lastActionType = 'search';
      this.elements.cityShortcutStatus.textContent = 'Loading weather for ' + city.label + '.';
      await this.fetchWeatherData(city.query);
    });

    if (kind !== 'saved') return button;

    const wrapper = document.createElement('div');
    wrapper.className = 'saved-city-chip';
    wrapper.appendChild(button);

    const controls = document.createElement('span');
    controls.className = 'saved-city-controls';
    const makeControl = (icon, label, handler, disabled) => {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = 'saved-city-control';
      control.title = label;
      control.setAttribute('aria-label', label);
      control.disabled = disabled;
      control.innerHTML = '<i class="fas ' + icon + '" aria-hidden="true"></i>';
      control.addEventListener('click', handler);
      return control;
    };
    controls.append(
      makeControl('fa-arrow-left', 'Move ' + city.label + ' earlier', () => this.moveSavedCity(index, -1), index === 0),
      makeControl('fa-arrow-right', 'Move ' + city.label + ' later', () => this.moveSavedCity(index, 1), index === this.savedCities.length - 1),
      makeControl('fa-xmark', 'Remove ' + city.label + ' from saved cities', () => this.removeSavedCity(city.id), false)
    );
    wrapper.appendChild(controls);
    return wrapper;
  }

  renderCityShortcuts() {
    const savedCities = this.savedCities || [];
    const recentCities = this.recentCities || [];
    this.elements.savedCitiesList.replaceChildren();
    this.elements.recentCitiesList.replaceChildren();

    savedCities.forEach((city, index) => {
      this.elements.savedCitiesList.appendChild(this.createCityChip(city, 'saved', index));
    });
    recentCities.forEach((city) => {
      this.elements.recentCitiesList.appendChild(this.createCityChip(city, 'recent'));
    });

    this.elements.savedCitySection.hidden = savedCities.length === 0;
    this.elements.recentCitySection.hidden = recentCities.length === 0;
    this.elements.cityShortcuts.hidden = savedCities.length === 0 && recentCities.length === 0;
  }

  moveSavedCity(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.savedCities.length) return;
    [this.savedCities[index], this.savedCities[targetIndex]] = [this.savedCities[targetIndex], this.savedCities[index]];
    this.persistCityList('weatherapp-saved-cities', this.savedCities);
    this.renderCityShortcuts();
    this.elements.cityShortcutStatus.textContent = 'Saved city order updated.';
  }

  removeSavedCity(cityId) {
    const removed = this.savedCities.find((city) => city.id === cityId);
    this.savedCities = this.savedCities.filter((city) => city.id !== cityId);
    const persisted = this.persistCityList('weatherapp-saved-cities', this.savedCities);
    this.renderCityShortcuts();
    this.updateSaveCityButton();
    this.elements.cityShortcutStatus.textContent = persisted
      ? (removed ? removed.label + ' removed from saved cities.' : 'Saved city removed.')
      : 'Could not save this change on this device.';
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
    this.elements.shareWeatherBtn.disabled = !this.currentCity;
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

  updateLocationLocalTime() {
    const timeElement = this.elements?.cityLocalTime;
    if (!timeElement) return;

    const timeZone = this.currentWeatherData?.location?.timezone;
    if (!timeZone) {
      timeElement.textContent = 'Unavailable';
      timeElement.removeAttribute('datetime');
      return;
    }

    const now = new Date();
    try {
      timeElement.textContent = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone
      }).format(now);
      timeElement.dateTime = now.toISOString();
    } catch {
      timeElement.textContent = 'Unavailable';
      timeElement.removeAttribute('datetime');
    }
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

  // Invalidate a pending browser location callback after another city action wins.
  invalidatePendingLocationLookup() {
    this.locationRequestId += 1;
  }

  // Get current geolocation
  getCurrentLocation() {
    this.lastActionType = 'location';
    this.showLoading();
    const requestId = ++this.locationRequestId;
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        this.showError('Geolocation is not supported by this browser');
        reject('Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (requestId !== this.locationRequestId) {
            resolve();
            return;
          }
          try {
            const { latitude, longitude } = position.coords;
            const locationQuery = `${latitude},${longitude}`;
            this.currentLocation = { lat: latitude, lon: longitude };
            this.lastSearchQuery = locationQuery;
            this.lastActionType = 'search';
            await this.fetchWeatherData(locationQuery);
            resolve();
          } catch (error) {
            this.showError('Failed to fetch weather for current location');
            reject(error);
          }
        },
        (error) => {
          if (requestId !== this.locationRequestId) {
            resolve();
            return;
          }
          let errorMessage = 'Unable to retrieve location. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied by user.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location lookup took too long. Check that device location services are enabled and allow location access for this site, or search for a city instead.';
              break;
            default:
              errorMessage += 'An unknown error occurred.';
          }
          this.showError(errorMessage);
          reject(error);
        },
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 300000 // reuse a recent location for up to 5 minutes
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

    this.invalidatePendingLocationLookup();
    window.clearTimeout(this.suggestionTimer);
    this.closeCitySuggestions();
    this.lastSearchQuery = query;
    this.lastActionType = 'search';
    await this.fetchWeatherData(query);
  }

  // Retry last action
  async retryLastAction() {
    if (this.lastActionType === 'location') {
      await this.getCurrentLocation();
      return;
    }

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
    const queryText = String(query).trim();
    const coordinateMatch = queryText.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    const type = coordinateMatch ? 'reverse' : 'geocode';
    const params = coordinateMatch
      ? { lat: coordinateMatch[1], lon: coordinateMatch[2] }
      : { q: queryText };

    const response = await this.fetchJson(this.getWeatherApiUrl(type, params));
    const matches = Array.isArray(response) ? response : [];
    let match = coordinateMatch
      ? matches[0]
      : this.rankCityLocations(matches, queryText)[0];

    if (!coordinateMatch && !match) {
      const mapMatches = await this.fetchPhotonCitySuggestions(queryText).catch(() => []);
      match = this.rankCityLocations(mapMatches, queryText)[0];
    }
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
      countryCode: match.countryCode || match.country || '',
      lat: Number(match.lat),
      lon: Number(match.lon)
    };
  }

  getWeatherApiUrl(type, params = {}) {
    const query = new URLSearchParams({ type, ...params });
    return `/api/weather?${query.toString()}`;
  }

  getAqiDetails(payload) {
    const data = payload && Array.isArray(payload.list) ? payload.list[0] : null;
    if (!data || !Number.isFinite(Number(data.main?.aqi))) return null;
    const labels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very poor'];
    return {
      index: Number(data.main.aqi),
      label: labels[Number(data.main.aqi)] || 'Unknown',
      pm25: Number(data.components?.pm2_5)
    };
  }

  async shareCurrentWeather() {
    if (!this.currentWeatherData || !this.currentCity) return;
    const current = this.currentWeatherData.current;
    const unitKey = this.temperatureUnit.toLowerCase();
    const summary = `${this.currentCity.label}: ${Math.round(current[`temp_${unitKey}`])}°${this.temperatureUnit}, ${current.condition.text}. Check it on Skylens: ${window.location.origin}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Skylens weather', text: summary, url: window.location.href });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
        this.elements.cityShortcutStatus.textContent = 'Weather summary copied to your clipboard.';
      } else {
        window.prompt('Copy this weather summary:', summary);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') this.elements.cityShortcutStatus.textContent = 'Could not share weather right now.';
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}), { once: true });
    }
  }

  cacheWeatherData() {
    if (!this.currentWeatherData || !this.forecastData || !this.currentCity) return;
    try {
      localStorage.setItem('weatherapp-last-weather', JSON.stringify({
        currentWeatherData: this.currentWeatherData,
        forecastData: this.forecastData,
        currentCity: this.currentCity,
        lastAirQuality: this.lastAirQuality,
        lastFetchedAt: this.lastFetchedAt
      }));
    } catch (error) {}
  }

  restoreCachedWeather() {
    try {
      const cached = JSON.parse(localStorage.getItem('weatherapp-last-weather') || 'null');
      if (!cached?.currentWeatherData || !cached?.forecastData || !cached?.currentCity) return;
      this.currentWeatherData = cached.currentWeatherData;
      this.forecastData = cached.forecastData;
      this.currentCity = cached.currentCity;
      this.lastAirQuality = cached.lastAirQuality || null;
      this.lastFetchedAt = Number(cached.lastFetchedAt) || null;
      this.updateCurrentWeather(this.currentWeatherData);
      this.updateHourlyChart(this.forecastData);
      this.updateForecast(this.forecastData);
      this.updateBackground(this.currentWeatherData.current);
      this.showWeatherContent();
      this.updateSaveCityButton();
      this.elements.cityShortcutStatus.textContent = 'Showing the last saved weather while Skylens reconnects.';
    } catch (error) {}
  }

  async fetchJson(url, requestOptions = {}) {
    const response = await fetch(url, requestOptions);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || `HTTP error! status: ${response.status}`);
    }

    return payload;
  }

  getOpenWeatherIconCode(weather) {
    const iconCode = String(weather?.icon || '01d').trim().toLowerCase();
    return /^\d{2}[dn]$/.test(iconCode) ? iconCode : '01d';
  }

  getOpenWeatherIconUrl(iconCode) {
    const suppliedCode = String(iconCode || '01d').trim().toLowerCase();
    const safeIconCode = /^\d{2}[dn]$/.test(suppliedCode) ? suppliedCode : '01d';
    const condition = safeIconCode.slice(0, 2);
    const isDay = safeIconCode.endsWith('d');

    const sun = '<g stroke="#e8892d" stroke-width="3.5" stroke-linecap="round">' +
      '<path d="M32 4v7M32 53v7M4 32h7M53 32h7M11.5 11.5l5 5M47 47l5.5 5.5M52.5 11.5 47 17M17 47l-5.5 5.5"/>' +
      '</g><circle cx="32" cy="32" r="13.5" fill="#f7aa43" stroke="#e8892d" stroke-width="2"/>';
    const sunBehindCloud = '<g stroke="#e8892d" stroke-width="2.8" stroke-linecap="round">' +
      '<path d="M44 3v5M44 34v5M25 20h5M58 20h4M30.5 7.5l3.5 3.5M54 29l3.5 3.5M57.5 7.5 54 11M34 29l-3.5 3.5"/>' +
      '</g><circle cx="44" cy="20" r="8.5" fill="#f7aa43" stroke="#e8892d" stroke-width="1.8"/>';
    const moon = '<path d="M42 9a22 22 0 1 0 13 39A21 21 0 0 1 42 9Z" fill="#e7cf88" stroke="#b39b5c" stroke-width="1.5"/>' +
      '<circle cx="15" cy="17" r="1.5" fill="#95a9b7"/><circle cx="48" cy="12" r="1.4" fill="#95a9b7"/>';
    const moonBehindCloud = '<path d="M48 7a15 15 0 1 0 9 27A14 14 0 0 1 48 7Z" fill="#e7cf88" stroke="#b39b5c" stroke-width="1.4"/>' +
      '<circle cx="33" cy="12" r="1.3" fill="#95a9b7"/>';
    const cloud = '<path d="M13 47h38a9 9 0 0 0 0-18h-2a14 14 0 0 0-26.6-2.6A11 11 0 0 0 13 47Z" fill="#f6f8fa" stroke="#a7b8c4" stroke-width="1.8" stroke-linejoin="round"/>';
    const cloudPair = '<path d="M31 35h18a7 7 0 0 0 0-14h-1a10 10 0 0 0-19-1.6A8 8 0 0 0 31 35Z" fill="#d9e2e6" stroke="#a7b8c4" stroke-width="1.6" stroke-linejoin="round"/>' + cloud;
    const overcast = '<path d="M30 42h21a8 8 0 0 0 0-16h-1a11 11 0 0 0-21-2A9 9 0 0 0 30 42Z" fill="#65747c" stroke="#45545d" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M12 50h37a9 9 0 0 0 0-18h-2a14 14 0 0 0-26.6-2.6A11 11 0 0 0 12 50Z" fill="#8a979e" stroke="#586871" stroke-width="1.8" stroke-linejoin="round"/>';
    const rain = '<g fill="#348eae">' +
      '<path d="M21 49c0 2-3 4.3-3 6.2a3 3 0 0 0 6 0c0-1.9-3-4.2-3-6.2Z"/>' +
      '<path d="M33 49c0 2-3 4.3-3 6.2a3 3 0 0 0 6 0c0-1.9-3-4.2-3-6.2Z"/>' +
      '<path d="M45 49c0 2-3 4.3-3 6.2a3 3 0 0 0 6 0c0-1.9-3-4.2-3-6.2Z"/>' +
      '</g>';
    const lightning = '<path d="M35 38h-8l-4 12h7l-2 12 13-17h-8l4-7Z" fill="#f3bd43" stroke="#d79721" stroke-width="1.5" stroke-linejoin="round"/>';
    const snow = '<g stroke="#4d9db6" stroke-width="2" stroke-linecap="round">' +
      '<path d="M23 49v10m-5-8 10 6m0-6-10 6M43 49v10m-5-8 10 6m0-6-10 6"/>' +
      '</g>';

    let illustration;
    switch (condition) {
      case '01':
        illustration = isDay ? sun : moon;
        break;
      case '02':
        illustration = (isDay ? sunBehindCloud : moonBehindCloud) + cloud;
        break;
      case '03':
        illustration = cloudPair;
        break;
      case '04':
        illustration = overcast;
        break;
      case '09':
        illustration = cloud + rain;
        break;
      case '10':
        illustration = (isDay ? sunBehindCloud : moonBehindCloud) + cloud + rain;
        break;
      case '11':
        illustration = '<path d="M13 44h38a9 9 0 0 0 0-18h-2a14 14 0 0 0-26.6-2.6A11 11 0 0 0 13 44Z" fill="#65747c" stroke="#45545d" stroke-width="1.8" stroke-linejoin="round"/>' +
          lightning + '<g fill="#348eae"><circle cx="19" cy="53" r="2.2"/><circle cx="46" cy="55" r="2.2"/></g>';
        break;
      case '13':
        illustration = cloud + snow;
        break;
      case '50':
        illustration = '<g fill="none" stroke="#8497a0" stroke-width="3" stroke-linecap="round">' +
          '<path d="M12 23h40M7 33h43M13 43h39M20 53h27"/></g>';
        break;
      default:
        illustration = cloud;
    }

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
      illustration + '</svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
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
      iconCode: this.getOpenWeatherIconCode(point.weather?.[0])
    });
    const sunriseTimestamp = currentPoint.sunrise ?? dailyPayload.data?.[0]?.sunrise ?? null;
    const sunsetTimestamp = currentPoint.sunset ?? dailyPayload.data?.[0]?.sunset ?? null;
    const isDay = sunriseTimestamp && sunsetTimestamp
      ? currentPoint.dt >= sunriseTimestamp && currentPoint.dt <= sunsetTimestamp
      : true;

    const currentData = {
      location: {
        name: location.name,
        region: location.state || location.country,
        country: location.country,
        lat: location.lat,
        lon: location.lon,
        timezone: currentPayload.timezone || dailyPayload.timezone || location.timezone || null
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
        sunrise: sunriseTimestamp ? toIso(sunriseTimestamp) : null,
        sunset: sunsetTimestamp ? toIso(sunsetTimestamp) : null,
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
        mintemp_f: toFahrenheit(point.temp?.min ?? point.temp?.night),
        precipitation_probability_percent: point.pop == null || !Number.isFinite(Number(point.pop))
          ? null
          : Math.max(0, Math.min(100, Math.round(Number(point.pop) * 100)))
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

      const coordinates = {
        lat: String(location.lat),
        lon: String(location.lon)
      };
      const [currentPayload, hourlyPayload, dailyPayload, airPayload] = await Promise.all([
        this.fetchJson(this.getWeatherApiUrl('current', coordinates)),
        this.fetchJson(this.getWeatherApiUrl('hourly', coordinates)),
        this.fetchJson(this.getWeatherApiUrl('daily', coordinates)),
        this.fetchJson(this.getWeatherApiUrl('air', coordinates)).catch(() => null)
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
      this.lastAirQuality = this.getAqiDetails(airPayload);
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
      this.cacheWeatherData();
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
      } else if (this.currentWeatherData && this.forecastData) {
        this.elements.cityShortcutStatus.textContent = 'You appear to be offline. Showing the last successful weather data.';
        this.showWeatherContent();
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
    this.updateLocationLocalTime();
    this.elements.lastUpdated.textContent = `Last updated: ${this.formatTime(current.last_updated)}`;
    
    // Weather icon
    this.elements.currentWeatherIcon.src = this.getOpenWeatherIconUrl(current.condition.iconCode);
    
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
    this.elements.airQuality.textContent = this.lastAirQuality
      ? this.lastAirQuality.label + (Number.isFinite(this.lastAirQuality.pm25) ? ' · PM2.5 ' + Math.round(this.lastAirQuality.pm25) : '')
      : 'Unavailable';
    this.elements.sunriseTime.textContent = this.formatLocationTime(current.sunrise, location.timezone);
    this.elements.sunsetTime.textContent = this.formatLocationTime(current.sunset, location.timezone);
    this.updateSunProgress(current, location);
  }

  updateSunProgress(current, location) {
    const sunrise = Date.parse(current.sunrise);
    const sunset = Date.parse(current.sunset);
    const now = Date.now();
    if (!Number.isFinite(sunrise) || !Number.isFinite(sunset) || sunset <= sunrise) {
      this.elements.sunProgress.hidden = true;
      return;
    }
    const progress = Math.max(0, Math.min(1, (now - sunrise) / (sunset - sunrise)));
    const isDaylight = now >= sunrise && now <= sunset;
    this.elements.sunProgress.hidden = false;
    this.elements.sunProgressFill.style.width = (progress * 100) + '%';
    this.elements.sunProgressMarker.style.left = (progress * 100) + '%';
    this.elements.sunProgress.classList.toggle('is-night', !isDaylight);
    this.elements.sunProgressLabel.textContent = isDaylight
      ? Math.round(progress * 100) + '% through daylight'
      : (now < sunrise ? 'Sunrise at ' + this.formatLocationTime(current.sunrise, location.timezone) : 'Sunset at ' + this.formatLocationTime(current.sunset, location.timezone));
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
      const rainChance = day.day.precipitation_probability_percent;
      const rainMarkup = Number.isFinite(rainChance)
        ? `<p class="forecast-rain"><i class="fas fa-droplet" aria-hidden="true"></i><span>${rainChance}% rain chance</span></p>`
        : '';
      
      forecastItem.innerHTML = `
        <div class="forecast-date">${dayName}<br><small>${monthDay}</small></div>
        <img class="forecast-icon" src="${this.getOpenWeatherIconUrl(day.day.condition.iconCode)}" alt="" aria-hidden="true" loading="lazy" decoding="async">
        <div class="forecast-temps">
          <span class="temp-max">${Math.round(day.day[`maxtemp_${unitKey}`])}°</span>
          <span class="temp-min">${Math.round(day.day[`mintemp_${unitKey}`])}°</span>
        </div>
        <div class="forecast-condition">${day.day.condition.text}</div>
        ${rainMarkup}
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
      // Use a light first-visit theme; keep any saved preference.
      document.documentElement.setAttribute('data-theme', 'light');
      const icon = this.elements.themeToggle.querySelector('i');
      icon.className = 'fas fa-moon';
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
  formatLocationTime(value, timeZone) {
    if (value == null) return '—';

    const timestamp = typeof value === 'number'
      ? value * 1000
      : Date.parse(value);
    if (!Number.isFinite(timestamp)) return '—';

    const date = new Date(timestamp);
    const options = { hour: 'numeric', minute: '2-digit' };
    if (timeZone) options.timeZone = timeZone;

    try {
      return new Intl.DateTimeFormat(undefined, options).format(date);
    } catch {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
    }
  }

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
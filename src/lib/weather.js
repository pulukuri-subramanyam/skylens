/** Provider normalization and location ranking retained from the original Skylens app. */
export class WeatherService {
  constructor(savedCities = [], recentCities = []) {
    this.PHOTON_BASE_URL = "https://photon.komoot.io";
    this.savedCities = savedCities;
    this.recentCities = recentCities;
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
        temp_f: toFahrenheit(point.temp),
        precipitation_probability_percent: point.pop == null || !Number.isFinite(Number(point.pop))
          ? null : Math.max(0, Math.min(100, Math.round(Number(point.pop) * 100)))
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

  formatLocationTime(value, timeZone) {
    if (value == null) return 'Unavailable';

    const timestamp = typeof value === 'number'
      ? value * 1000
      : Date.parse(value);
    if (!Number.isFinite(timestamp)) return 'Unavailable';

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

export const weatherService = new WeatherService();

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useCitySuggestions } from '../hooks/useCitySuggestions';
import { weatherService } from '../lib/weather';

export function SearchBar({ saved, recent, onSearch, onLocate, locating }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef(null);
  const list = useRef(null);
  const { locations, loading } = useCitySuggestions(query, saved, recent, open);
  const visible = open && query.trim().length >= 2 && (locations.length > 0 || loading);
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);
  const choose = location => { setOpen(false); setQuery(''); setActive(-1); onSearch(location); };
  const submit = event => {
    event.preventDefault();
    if (!query.trim()) return input.current?.focus();
    choose(visible && active >= 0 && locations[active] ? locations[active] : query.trim());
  };
  return <section className="search-section"><form onSubmit={submit} className="search-container" role="search">
    <div className="search-input-container">
      <Icon name="search" className="search-icon"/>
      <input ref={input} id="cityInput" value={query} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); setActive(-1); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && locations.length) {
          event.preventDefault(); setOpen(true);
          setActive(index => event.key === 'ArrowDown' ? (index + 1) % locations.length : index <= 0 ? locations.length - 1 : index - 1);
        }
      }} placeholder="Enter city name..." autoComplete="off" aria-label="Search for a city" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="citySuggestions" aria-expanded={visible} aria-activedescendant={visible && locations[active] ? `city-suggestion-${active}` : undefined} className="search-input"/>
      <button id="searchBtn" type="submit" aria-label="Search" className="search-btn"><Icon name="search" /></button>
      {visible && <div ref={list} id="citySuggestions" role="listbox" aria-label="City suggestions" className="city-suggestions" onPointerDown={event => event.preventDefault()}>
        {locations.map((location, index) => <div key={`${location.lat},${location.lon},${location.name}`} id={`city-suggestion-${index}`} role="option" aria-selected={active === index} onClick={() => choose(location)} className="city-suggestion">
          <span className="city-suggestion-name">{location.name}</span><span className="city-suggestion-meta"><span className="city-suggestion-details">{weatherService.formatCitySuggestionDetails(location)}</span>{location.source && <span className="city-suggestion-source">{location.source}</span>}</span>
        </div>)}
        {loading && <p role="status" className="city-suggestion-status">{loading ? locations.length ? 'Finding more places…' : 'Searching places…' : locations.length ? 'Choose a place or refine your search.' : 'No suggestions found. Try a city and state.'}</p>}
      </div>}
    </div>
    <button type="button" id="locationBtn" onClick={onLocate} aria-label="Use my current location" title="Use current location" className="location-btn" disabled={locating}>
      <Icon name="location" /><span >{locating ? 'Locating…' : 'Current Location'}</span>
    </button>
  </form></section>;
}

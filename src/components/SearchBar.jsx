import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useCitySuggestions } from '../hooks/useCitySuggestions';
import { weatherService } from '../lib/weather';

export function SearchBar({ saved, recent, onSearch, onLocate, locating }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, setPending] = useState(null);
  const [needsChoice, setNeedsChoice] = useState(false);
  const input = useRef(null);
  const list = useRef(null);
  const { locations, loading, valid, failed } = useCitySuggestions(query, saved, recent, open);
  const visible = open && valid;
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);
  const choose = useCallback(location => { setPending(null); setNeedsChoice(false); setOpen(false); setQuery(''); setActive(-1); onSearch(location); }, [onSearch]);
  useEffect(() => {
    if (!pending || pending !== query.trim() || !open || loading) return;
    setPending(null);
    if (!failed && locations.length === 1) choose(locations[0]);
    else setNeedsChoice(locations.length > 1);
  }, [pending, query, open, loading, failed, locations, choose]);
  const submit = event => {
    event.preventDefault();
    if (!query.trim()) return input.current?.focus();
    if (visible && active >= 0 && locations[active]) return choose(locations[active]);
    if (!valid) return choose(query.trim());
    setOpen(true); setPending(query.trim()); setNeedsChoice(false); input.current?.focus();
  };
  return <section className="search-section"><form onSubmit={submit} className="search-container" role="search">
    <div className="search-input-container">
      <input ref={input} id="cityInput" value={query} onChange={event => { setQuery(event.target.value); setPending(null); setNeedsChoice(false); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setPending(null); }} onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); setPending(null); setNeedsChoice(false); setActive(-1); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && locations.length) {
          event.preventDefault(); setOpen(true);
          setActive(index => event.key === 'ArrowDown' ? (index + 1) % locations.length : index <= 0 ? locations.length - 1 : index - 1);
        }
      }} placeholder="Search a city" autoComplete="off" aria-label="Search for a city" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="citySuggestions" aria-expanded={visible} aria-activedescendant={visible && locations[active] ? `city-suggestion-${active}` : undefined} className="search-input"/>
      <button id="searchBtn" type="submit" aria-label="Search" className="search-btn"><Icon name="search" /></button>
      {visible && <div className="city-suggestions" onPointerDown={event => event.preventDefault()}>
        <div ref={list} id="citySuggestions" role="listbox" aria-label="City suggestions" aria-busy={loading}>
        {locations.map((location, index) => <div key={`${location.lat},${location.lon},${location.name}`} id={`city-suggestion-${index}`} role="option" aria-selected={active === index} onClick={() => choose(location)} className="city-suggestion">
          <span className="city-suggestion-name">{location.name}</span><span className="city-suggestion-meta"><span className="city-suggestion-details">{weatherService.formatCitySuggestionDetails(location)}</span>{location.source && <span className="city-suggestion-source">{location.source}</span>}</span>
        </div>)}
        </div>
        {(loading || !locations.length || needsChoice) && <p role="status" className="city-suggestion-status">{loading ? locations.length ? 'Finding more places\u2026' : 'Searching places\u2026' : needsChoice ? 'Choose a location to see its weather.' : failed ? 'Could not load suggestions. Try again or search by city and state.' : 'No suggestions found'}</p>}
      </div>}
    </div>
    <button type="button" id="locationBtn" onClick={onLocate} aria-label="Use my current location" title="Use current location" className="location-btn" disabled={locating}>
      <Icon name={locating?'refresh':'location'} className={locating?'animate-spin':''}/><span className="sr-only">{locating ? 'Locating…' : 'Current Location'}</span>
    </button>
  </form></section>;
}

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
  const visible = open && query.trim().length >= 2;
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);
  const choose = location => { setOpen(false); setQuery(''); setActive(-1); onSearch(location); };
  const submit = event => {
    event.preventDefault();
    if (!query.trim()) return input.current?.focus();
    choose(visible && active >= 0 && locations[active] ? locations[active] : query.trim());
  };
  return <form onSubmit={submit} className="mb-[18px] flex items-stretch gap-2 sm:gap-4" role="search">
    <div className="relative min-w-0 flex-1">
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-[18px] w-[18px] -translate-y-1/2 text-muted sm:left-4"/>
      <input ref={input} id="cityInput" value={query} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); setActive(-1); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && locations.length) {
          event.preventDefault(); setOpen(true);
          setActive(index => event.key === 'ArrowDown' ? (index + 1) % locations.length : index <= 0 ? locations.length - 1 : index - 1);
        }
      }} placeholder="Enter city name..." autoComplete="off" aria-label="Search for a city" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="citySuggestions" aria-expanded={visible} aria-activedescendant={visible && locations[active] ? `city-suggestion-${active}` : undefined} className="h-[50px] w-full rounded-[10px] border border-line bg-surface pr-12 pl-10 text-[13px] outline-none placeholder:text-muted focus:border-accent sm:pl-[46px] sm:text-[15px]"/>
      <button id="searchBtn" type="submit" aria-label="Search" className="absolute top-[7px] right-[7px] flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-on-accent"><Icon name="search" className="h-[18px] w-[18px]"/></button>
      {visible && <div ref={list} id="citySuggestions" role="listbox" aria-label="City suggestions" className="absolute top-full z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg" onPointerDown={event => event.preventDefault()}>
        {locations.map((location, index) => <div key={`${location.lat},${location.lon},${location.name}`} id={`city-suggestion-${index}`} role="option" aria-selected={active === index} onClick={() => choose(location)} className={`cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-canvas ${active === index ? 'bg-canvas' : ''}`}>
          <span className="block font-semibold">{location.name}</span><span className="block text-xs text-muted">{weatherService.formatCitySuggestionDetails(location)}{location.source ? ` � ${location.source}` : ''}</span>
        </div>)}
        <p role="status" className="px-3 py-2 text-xs text-muted">{loading ? locations.length ? 'Finding more places�' : 'Searching places�' : locations.length ? 'Choose a place or refine your search.' : 'No suggestions found. Try a city and state.'}</p>
      </div>}
    </div>
    <button type="button" id="locationBtn" onClick={onLocate} aria-label="Use my current location" title="Use current location" className="flex min-h-[50px] min-w-[46px] items-center justify-center gap-2 rounded-[10px] border border-accent bg-surface px-3 text-sm font-medium text-accent sm:px-[18px]" disabled={locating}>
      <Icon name="location" className="h-5 w-5"/><span className="hidden sm:inline">{locating ? 'Locating�' : 'Current Location'}</span>
    </button>
  </form>;
}

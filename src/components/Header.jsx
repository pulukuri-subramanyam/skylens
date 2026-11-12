import { Icon } from './Icon';

export function Header({ unit, onUnit, theme, onTheme }) {
  return <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
    <h1 className="flex items-center gap-2 text-[28px] font-bold tracking-[-.045em] max-[380px]:text-2xl"><Icon name="brand" className="h-9 w-9 text-accent"/>skylens</h1>
    <div className="flex items-center gap-3">
      <div className="relative isolate flex gap-0.5 rounded-[10px] border border-line bg-surface p-[3px]" role="group" aria-label="Temperature units">
        <span aria-hidden="true" className={`absolute top-[3px] left-[3px] -z-10 h-[34px] w-10 rounded-[7px] bg-accent transition-transform duration-300 ${unit === 'F' ? 'translate-x-[42px]' : ''}`}/>
        {['C', 'F'].map(value => <button key={value} id={value === 'C' ? 'celsiusBtn' : 'fahrenheitBtn'} type="button" aria-pressed={unit === value} aria-label={value === 'C' ? 'Use Celsius' : 'Use Fahrenheit'} onClick={() => onUnit(value)} className={`h-[34px] w-10 text-xs font-semibold ${unit === value ? 'text-on-accent' : 'text-muted'}`}>°{value}</button>)}
      </div>
      <button type="button" id="themeToggle" aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} onClick={onTheme} className="control h-[42px] w-[42px] justify-center p-0"><Icon name={theme === 'light' ? 'moon' : 'sun'} className="h-5 w-5"/></button>
    </div>
  </header>;
}

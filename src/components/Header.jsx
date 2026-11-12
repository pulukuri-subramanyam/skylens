import { Icon } from './Icon';
export function Header({ unit, onUnit, theme, onTheme }) {
  return <header className="header"><div className="header-content">
    <div className="brand-lockup"><h1 className="app-title"><Icon name="brand"/>skylens</h1></div>
    <div className="header-controls"><div className="unit-toggle" data-unit={unit} role="group" aria-label="Temperature units">
      {['C','F'].map(value=><button key={value} id={value==='C'?'celsiusBtn':'fahrenheitBtn'} type="button" className={`unit-option ${unit===value?'is-active':''}`} aria-pressed={unit===value} aria-label={value==='C'?'Use Celsius':'Use Fahrenheit'} onClick={()=>onUnit(value)}>{'\u00b0'}{value}</button>)}
    </div><button type="button" className="theme-toggle" id="themeToggle" aria-label="Toggle theme" onClick={onTheme}><Icon name={theme==='light'?'moon':'sun'}/></button></div>
  </div></header>;
}

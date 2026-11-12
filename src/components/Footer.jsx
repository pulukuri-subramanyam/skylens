import { Icon } from './Icon';

export function Footer() {
  return <footer className="mt-[22px] flex flex-col items-center justify-between gap-3 border-t border-line py-4 text-center text-[11px] text-secondary sm:flex-row sm:text-left sm:text-xs">
    <p><span className="font-semibold text-ink">skylens</span> <span aria-hidden="true">|</span> by subramanyam pulukuri</p>
    <nav aria-label="Social profiles" className="flex gap-[18px]">
      <a href="https://github.com/pulukuri-subramanyam" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-accent"><Icon name="github" className="h-3.5 w-3.5"/>GitHub</a>
      <a href="https://www.linkedin.com/in/pulukuri-subramanyam/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-accent"><Icon name="linkedin" className="h-3.5 w-3.5"/>LinkedIn</a>
    </nav>
  </footer>;
}

import { Icon } from './Icon';
export function Footer() {
  return <footer className="app-footer"><p className="footer-credit"><span className="footer-brand">skylens</span> <span aria-hidden="true">|</span> by subramanyam pulukuri</p><nav className="footer-social-links" aria-label="Social profiles">
    <a className="footer-social-link" href="https://github.com/pulukuri-subramanyam" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile"><Icon name="github"/><span>GitHub</span></a>
    <a className="footer-social-link" href="https://www.linkedin.com/in/pulukuri-subramanyam/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile"><Icon name="linkedin"/><span>LinkedIn</span></a>
  </nav></footer>;
}

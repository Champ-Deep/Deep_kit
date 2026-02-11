import { Zap } from 'lucide-react';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Zap className="logo-icon" />
          <h1>DEEPKIT <span className="version">v0.5</span></h1>
        </div>
        <div className="tagline">
          Your Personal AI. Locally Contained. Locally Empowered.
        </div>
      </div>
    </header>
  );
}

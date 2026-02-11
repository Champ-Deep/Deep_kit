import { useState } from 'react';
import Header from './components/Header';
import ServiceDashboard from './components/ServiceDashboard';
import Chat from './components/Chat';
import HardwareMetrics from './components/HardwareMetrics';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'metrics'>('dashboard');

  return (
    <div className="app">
      <Header />
      
      <nav className="nav-tabs">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          [ Dashboard ]
        </button>
        <button
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => setActiveTab('chat')}
        >
          [ Chat ]
        </button>
        <button
          className={activeTab === 'metrics' ? 'active' : ''}
          onClick={() => setActiveTab('metrics')}
        >
          [ Metrics ]
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'dashboard' && <ServiceDashboard />}
        {activeTab === 'chat' && <Chat />}
        {activeTab === 'metrics' && <HardwareMetrics />}
      </main>

      <footer className="footer">
        <p>DeepKit v0.5 | Core Foundation Complete | Phase 3 of 4</p>
      </footer>
    </div>
  );
}

export default App;

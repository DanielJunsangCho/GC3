import React, { useState } from 'react';
import './App.css';
import './EnhancedApp.css';
import DisplayTabs from './components/Tabs';
import Menu from './components/Menu';
import Generate from './components/Generate';

function App() {
  const [plot, setPlot] = useState<string | null>(null);

  const handlePlotGenerated = (plot: string | null) => {
    setPlot(plot);
  };

  return (
    <main className="enhanced-app-container">
      <header className="app-header">
        <Menu />
        <img src="/images/GC3 Logo.png" alt="GC3 Logo" className="app-logo" />
        <Generate onPlotGenerated={handlePlotGenerated} />
      </header>
      <DisplayTabs plot={plot} />
    </main>
  );
}

export default App;
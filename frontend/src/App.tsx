/** 
 * CS-410: Frontend for uploading files, generating spectrograms, and interacting with MongoDB
 * @file app.tsx
 * @authors Jun Cho, Will Cho, Grace Johnson, Connor Whynott
 * @collaborators None
 */

import { useState } from 'react';
import './App.css';
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
      {/* ✅ Application Header */}
      <header className="app-header">
        <Menu />
        <img src="/images/GC3 Logo.png" alt="GC3 Logo" className="app-logo" />
        <Generate onPlotGenerated={handlePlotGenerated} />
      </header>

      {/* ✅ Main Layout: Upload Controls + Metadata + Tabs */}
      <div className="upload-metadata-wrapper">
        <DisplayTabs plot={plot} />
      </div>

      {/* ✅ Spectrogram Display at the Bottom */}
      {plot && (
        <div className="spectrogram-container">
          <img src={`data:image/png;base64,${plot}`} alt="Generated Spectrogram" />
        </div>
      )}
    </main>
  );
}

export default App;

/* test */
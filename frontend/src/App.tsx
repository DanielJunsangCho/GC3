/** 
 * CS-410: Frontend for uploading files, generating spectrograms, and interacting with MongoDB
 * @file App.tsx
 * @authors Jun Cho, Will Cho, Grace Johnson, Connor Whynott
 * @collaborators None
 */

import { useState } from 'react';
import './App.css';
import DisplayTabs from './components/Tabs';
import Generate from './components/Generate';

function App() {
  const [plot, setPlot] = useState<string | null>(null);

  const handlePlotGenerated = (plot: string | null) => {
    setPlot(plot);
  };

  const repoUrl = "https://github.com/DanielJunsangCho/GC3";

  return (
    <main className="enhanced-app-container">
      {/* Application Header */}
      <header className="app-header">
        <div className="header-left">
          <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="github-link">
            <img src="images/github-logo.png" alt="GitHub Repository" className="github-logo" />
          </a>
          <img src="images/GC3-logo.png" alt="GC3 Logo" className="app-logo" />
        </div>
        <Generate onPlotGenerated={handlePlotGenerated} />
      </header>

      {/* Main Layout: Upload Controls + Metadata + Tabs */}
      <div className="upload-metadata-wrapper">
        <DisplayTabs/>
      </div>
    </main>
  );
}

export default App;
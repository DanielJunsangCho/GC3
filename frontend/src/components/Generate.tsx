import React, { useState } from 'react';
import GeneratePopup from './GeneratePopup';

const Generate: React.FC<{ onPlotGenerated: (plot: string | null) => void }> = ({ onPlotGenerated }) => {
  const [showPopup, setShowPopup] = useState(false);

  const handleGenerateClick = () => {
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const handleGenerateData = async (data: {
      rows: number | null;
      cols: number | null;
      numTransmitters: number | null;
      transmitterMean: number | null;
      transmitterSd: number | null;
      noiseMean: number | null;
      noiseSd: number | null;
      bandwidth: number | null;
      activeTime: number | null;
      matrixFilename: string;
      transmittersFilename: string;
      placementMethod: string;
    }) => {
      if (
        data.rows === null || 
        data.cols === null || 
        data.numTransmitters === null || 
        data.transmitterMean === null || 
        data.transmitterSd === null || 
        data.noiseMean === null || 
        data.noiseSd === null || 
        data.bandwidth === null || 
        data.activeTime === null
      ) {
        console.error("Invalid data: some fields are null");
        return;
      }
    console.log("Generate data with:", data);
    try {
      const response = await fetch('http://127.0.0.1:5000/generate', { // Update URL to match backend
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(result.message);
        onPlotGenerated(result.plot); // Pass plot data to parent component
        // Handle success (e.g., display a success message or update the UI)
      } else {
        const error = await response.json();
        console.error(error.error);
        // Handle error (e.g., display an error message)
      }
    } catch (error) {
      console.error('Error:', error);
      // Handle error (e.g., display an error message)
    }
  };

  return (
    <>
      <button className="generate-button" onClick={handleGenerateClick}>
        Generate
      </button>
      {showPopup && (
        <GeneratePopup onClose={handleClosePopup} onGenerate={handleGenerateData} />
      )}
    </>
  );
};

export default Generate;
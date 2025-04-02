import React, { useState } from 'react';

interface GeneratePopupProps {
  onClose: () => void;
  onGenerate: (data: {
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
  }) => void;
}

const GeneratePopup: React.FC<GeneratePopupProps> = ({ onClose, onGenerate }) => {
  const [rows, setRows] = useState<number | null>(1000);
  const [cols, setCols] = useState<number | null>(1024);
  const [numTransmitters, setNumTransmitters] = useState<number | null>(5);
  const [transmitterMean, setTransmitterMean] = useState<number | null>(-75);
  const [transmitterSd, setTransmitterSd] = useState<number | null>(2);
  const [noiseMean, setNoiseMean] = useState<number | null>(-109);
  const [noiseSd, setNoiseSd] = useState<number | null>(10);
  const [bandwidth, setBandwidth] = useState<number | null>(200);
  const [activeTime, setActiveTime] = useState<number | null>(10);
  const [matrixFilename, setMatrixFilename] = useState<string>('output_matrix.csv');
  const [transmittersFilename, setTransmittersFilename] = useState<string>('output_transmitters.csv');
  const [placementMethod, setPlacementMethod] = useState<string>('equally_spaced');
  const [error, setError] = useState<string | null>(null); // State to store error messages

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation logic
    if (
      rows === null ||
      cols === null ||
      numTransmitters === null ||
      transmitterMean === null ||
      transmitterSd === null ||
      noiseMean === null ||
      noiseSd === null ||
      bandwidth === null ||
      activeTime === null ||
      matrixFilename.trim() === '' ||
      transmittersFilename.trim() === ''
    ) {
      setError('All fields are required. Please fill out all fields.');
      return;
    }

    // Clear error if validation passes
    setError(null);

    const formData = {
      rows,
      cols,
      numTransmitters,
      transmitterMean,
      transmitterSd,
      noiseMean,
      noiseSd,
      bandwidth,
      activeTime,
      matrixFilename,
      transmittersFilename,
      placementMethod,
    };

    console.log('Form submitted with data:', formData);
    onGenerate(formData);
    onClose();
  };

  const handleNumberInput = (setter: React.Dispatch<React.SetStateAction<number | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setter(value === '' ? null : Number(value));
  };

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h4>Generate Data</h4>
        {error && <p className="error-message">{error}</p>} {/* Display error message */}
        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend>Placement Method</legend>
            <label>
              <input
                type="radio"
                value="equally_spaced"
                checked={placementMethod === 'equally_spaced'}
                onChange={(e) => setPlacementMethod(e.target.value)}
              />
              Equally Spaced
            </label>
            <label>
              <input
                type="radio"
                value="random"
                checked={placementMethod === 'random'}
                onChange={(e) => setPlacementMethod(e.target.value)}
              />
              Random
            </label>
          </fieldset>
          <label>
            Rows:
            <input type="number" value={rows ?? ''} onChange={handleNumberInput(setRows)} />
          </label>
          <label>
            Columns:
            <input type="number" value={cols ?? ''} onChange={handleNumberInput(setCols)} />
          </label>
          <label>
            Number of Transmitters:
            <input type="number" value={numTransmitters ?? ''} onChange={handleNumberInput(setNumTransmitters)} />
          </label>
          <label>
            Transmitter Mean:
            <input type="number" value={transmitterMean ?? ''} onChange={handleNumberInput(setTransmitterMean)} />
          </label>
          <label>
            Transmitter Standard Deviation:
            <input type="number" value={transmitterSd ?? ''} onChange={handleNumberInput(setTransmitterSd)} />
          </label>
          <label>
            Noise Mean:
            <input type="number" value={noiseMean ?? ''} onChange={handleNumberInput(setNoiseMean)} />
          </label>
          <label>
            Noise Standard Deviation:
            <input type="number" value={noiseSd ?? ''} onChange={handleNumberInput(setNoiseSd)} />
          </label>
          <label>
            Bandwidth:
            <input type="number" value={bandwidth ?? ''} onChange={handleNumberInput(setBandwidth)} />
          </label>
          <label>
            Active Time:
            <input type="number" value={activeTime ?? ''} onChange={handleNumberInput(setActiveTime)} />
          </label>
          <label>
            Matrix Filename:
            <input type="text" value={matrixFilename} onChange={(e) => setMatrixFilename(e.target.value)} />
          </label>
          <label>
            Transmitters Filename:
            <input type="text" value={transmittersFilename} onChange={(e) => setTransmittersFilename(e.target.value)} />
          </label>
          <button type="submit">Generate</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

export default GeneratePopup;
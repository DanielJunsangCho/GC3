/**
 * CS-410: Component where user uploads, views and manages files.
 * @file FileHandle.tsx
 * @authors Jun Cho, Will Cho, Grace Johnson, Connor Whynott
 * @collaborators None
 * @description This component is used to upload, view and manage files.
 */

import { useState, useEffect, ChangeEvent, useRef } from 'react';
import '../App.css';
import SavedFiles from './SavedFiles';
import Annotations from './Annotations';

interface SavedFile {
  _id: string;
  filename: string;
}

interface FileHandleProps {
  fileId: string | null;
  onFileSelect: (fileId: string | null) => void;
}

const FileHandle: React.FC<FileHandleProps> = ({ fileId, onFileSelect }) => {
  // State variables
  const [verticalCursors, setVerticalCursors] = useState<number[]>([50, 150]); // Default positions for vertical cursors
  const [horizontalCursors, setHorizontalCursors] = useState<number[]>([50, 150]); // Default positions for horizontal cursors
  const [showCursors, setShowCursors] = useState<boolean>(true);
  const [currentFileId, setCurrentFileId] = useState<string | null>(fileId); // Track the currently selected file ID
  const [selectedCFile, setSelectedCFile] = useState<File | null>(null);
  const [selectedMetaFile, setSelectedMetaFile] = useState<File | null>(null);
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Please upload a .cfile and .sigmf-meta file');
  const [selectedCFileName, setSelectedCFileName] = useState<string | null>(null);
  const [selectedMetaFileName, setSelectedMetaFileName] = useState<string | null>(null);
  const [dots, setDots] = useState<string>(''); // Track the dots
  const [maxTime, setMaxTime] = useState(10);
  const [minFreq, setMinFreq] = useState(0); 
  const [maxFreq, setMaxFreq] = useState(1000); 
  const [fileData, setFileData] = useState<{
    maxTime: number;
    minFreq: number;
    maxFreq: number;
    annotations: { 
      id: string; 
      corners: { freq1: number; time1: number; freq2: number; time2: number }; 
      label: string; 
      comment: string; 
      display: boolean;
    }[]; // Add annotations field
  } | null>(null);
  const spectrogramRef = useRef<HTMLDivElement | null>(null);

  const [annotations, setAnnotations] = useState<
    { id: string; corners: { freq1: number; time1: number; freq2: number; time2: number }; label: string; comment: string; display: boolean}[]
  >([]);
  const [annotationLabel, setAnnotationLabel] = useState<string>(''); // State for the annotation label
  const [annotationComment, setAnnotationComment] = useState<string>(''); // State for the annotation comment

  // whitespace padding constants for calculating cursor positions
  const left_padding = .125;
  const right_padding = .1064;
  const top_padding = .1185;
  const bottom_padding = .1203;

  // State for tab switching
  const [activeTab, setActiveTab] = useState<string>('spectrogram');
  const [plotImages, setPlotImages] = useState<{ [key: string]: string | null }>({
    spectrogram: null,
    time_domain: null,
    freq_domain: null,
    iq_plot: null,
  });

  useEffect(() => {
    if (fileId) {
      fetchPlots(fileId);
    }
  }, [fileId]);

  // Handle .cfile selection
  const handleCFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file || !file.name.endsWith('.cfile')) {
      setStatusMessage('Invalid file type. Please select a .cfile.');
      setSelectedCFile(null);
      setSelectedCFileName(null);
      event.target.value = ''; // Reset file input
      return;
    }

    setSelectedCFile(file);
    setSelectedCFileName(file.name);

    setStatusMessage(selectedMetaFile ? 'Ready to upload both files.' : 'Now select and upload a .sigmf-meta file.');
  };

  // Handle .sigmf-meta file selection
  const handleMetaFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file || !file.name.endsWith('.sigmf-meta')) {
      setStatusMessage('Invalid file type. Please select a .sigmf file.');
      setSelectedMetaFile(null);
      setSelectedMetaFileName(null);
      event.target.value = ''; // Reset file input
      return;
    }

    setSelectedMetaFile(file);
    setSelectedMetaFileName(file.name);

    setStatusMessage(selectedCFile ? 'Ready to upload both files.' : 'Now select and upload a .cfile.');

  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedCFile || !selectedMetaFile) {
      return setStatusMessage('Both .cfile and .sigmf-meta files are required.');
    }
  
    updateStatusMessage('Uploading files');
    try {
      const formData = new FormData();
      formData.append('cfile', selectedCFile);
      formData.append('metaFile', selectedMetaFile);
  
      const response = await fetch('http://127.0.0.1:5000/upload', { method: 'POST', body: formData });
      const result = await response.json();
  
      if (result.error) return setStatusMessage(`Error: ${result.error}`);
  
      console.log("Upload Response:", result);
  
      onFileSelect(result.file_id);
  
      // Immediately add uploaded file to saved list
      setSavedFiles((prevFiles) => [
        ...prevFiles,
        { _id: result.file_id, filename: selectedCFile.name }
      ]);
  
      // Save fileData in state
      if (result.max_time && result.min_freq && result.max_freq) {
        setFileData({
          maxTime: result.max_time,
          minFreq: result.min_freq,
          maxFreq: result.max_freq,
          annotations: [],
        });
        setMaxTime(result.max_time);
        setMaxFreq(result.max_freq);
        setMinFreq(result.min_freq);
      }
  
      // Immediately set spectrogram image
      if (result.spectrogram) {
        setPlotImages((prevImages) => ({ ...prevImages, spectrogram: result.spectrogram }));
        setActiveTab('spectrogram'); // Ensure spectrogram is shown first
      }
  
      // Update current file ID
      setCurrentFileId(result.file_id);
      fetchPlots(result.file_id);
      setStatusMessage(result.message);
    } catch (error) {
      console.error("Upload failed:", error);
      setStatusMessage('Upload failed. Please try again.');
    }
  };
  
  // Handle clearing selected file
  const handleClearCurrentFile = () => {
    setSelectedCFile(null);
    setSelectedMetaFile(null);
    setSelectedCFileName(null);
    setSelectedMetaFileName(null);
    setCurrentFileId(null);
    setPlotImages({
      spectrogram: null,
      time_domain: null,
      freq_domain: null,
      iq_plot: null,
    });
    onFileSelect(null); // Notify parent component to reset fileId
    setStatusMessage('File cleared. Please upload new files.');
  };
  
  // Fetch and store images dynamically
  const fetchPlots = async (fileId: string) => {
    const plotTypes = ['spectrogram', 'time_domain', 'freq_domain', 'iq_plot'];
  
    for (const plot of plotTypes) {
      try {
        console.log(`Fetching ${plot}...`);
  
        const response = await fetch(`http://127.0.0.1:5000/file/${fileId}/${plot}`);
        const result = await response.json();
  
        if (result.error) {
          console.error(`Error fetching ${plot}:`, result.error);
          continue;
        }
  
        console.log(`Fetched ${plot}: ✅ Success`);
  
        // Ensure the spectrogram is set first
        setPlotImages((prevImages) => ({ ...prevImages, [plot]: result.image }));
  
        if (plot === 'spectrogram') {
          setActiveTab('spectrogram');  // Ensure spectrogram is shown first
        }
  
      } catch (error) {
        console.error(`Error fetching ${plot}:`, error);
      }
    }
  };

  // Handle single file deletion
  const handleSingleDelete = async (fileId: string) => {
    const userConfirmed = window.confirm(`Are you sure you want to delete this file?`);
    if (!userConfirmed) {
      return; // Exit if the user cancels
    }
  
    try {
      const response = await fetch(`http://127.0.0.1:5000/file/${fileId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete file.');
      }
  
      // If the deleted file is currently open, clear the graphs and reset the fileId
      if (fileId === currentFileId) {
        setActiveTab(''); // Reset the active tab
        setPlotImages({
          spectrogram: null,
          time_domain: null,
          freq_domain: null,
          iq_plot: null,
        });
        setCurrentFileId(null); // Reset the selected file
        onFileSelect(null); // Notify parent component to reset fileId

      }
  
      // Refresh the saved files list
      setTimeout(() => {
        fetchSavedFiles();
        setStatusMessage('File successfully deleted.');
      }, 500); // Adjust delay if necessary
    } catch (error) {
      console.error("Error deleting file:", error);
      setStatusMessage('Failed to delete file.');
    }
  };

  // handle load file from saved file library
  const handleLoadFile = async (fileId: string) => {
    setActiveTab('spectrogram');
    setStatusMessage('Loading file...');
  
    try {
      // Fetch fileData from the backend
      const response = await fetch(`http://127.0.0.1:5000/file/${fileId}/data`);
      const result = await response.json();
  
      if (result.error) {
        console.error("Error fetching file data:", result.error);
        setStatusMessage(`Error: ${result.error}`);
        return;
      }
  
      // Save fileData in state
      if (result.max_time && result.min_freq && result.max_freq) {
        setFileData({
          maxTime: result.max_time,
          minFreq: result.min_freq,
          maxFreq: result.max_freq,
          annotations: result.annotations.map((annotation: Annotation) => ({
            ...annotation,
            display: annotation.display ?? true, // Default to true if undefined
          })),
        });
        setMaxTime(result.max_time);
        setMinFreq(result.min_freq);
        setMaxFreq(result.max_freq);
      }
  
      // Restore annotations
      if (result.annotations) {
        const loadedAnnotations = result.annotations.map((annotation: Annotation) => ({
          ...annotation,
          display: annotation.display ?? true, // Default to true if undefined
        }));
        setAnnotations(loadedAnnotations);
      }
  
      setCurrentFileId(fileId);
      onFileSelect(fileId);
      setStatusMessage('File loaded successfully');
    } catch (error) {
      console.error("Error loading file:", error);
      setStatusMessage('Failed to load file.');
    }
  };

  // Fetch saved files from the database
  const fetchSavedFiles = async () => {
    try {  
      const response = await fetch('http://127.0.0.1:5000/files');
      const result = await response.json();
  
      if (result.error) {
        console.error("Error fetching saved files:", result.error);
        setStatusMessage(`Error: ${result.error}`);
        return;
      }  
      if (Array.isArray(result.files)) {
        setSavedFiles(result.files);
      } else {
        console.error("Unexpected response format:", result);
        setSavedFiles([]);
      }
    } catch (error) {
      console.error("Error fetching saved files:", error);
      setStatusMessage('Error fetching saved files');
    }
  };
  
  // Fetch saved files on component mount
  useEffect(() => {
    fetchSavedFiles();
    setStatusMessage('Please upload a .cfile and .sigmf file');
  }, []);

  // Dot Animation Effect: Runs whenever statusMessage changes
  useEffect(() => {
    if (statusMessage === "Uploading files" || statusMessage === "Clearing all saved files...") {
      setDots(""); // Reset dots when statusMessage starts
  
      const interval = setInterval(() => {
        setDots((prevDots) => (prevDots.length === 3 ? "" : prevDots + ".")); // Cycle . → .. → ... → .
      }, 500);
  
      return () => clearInterval(interval); // Cleanup on unmount or message change
    } else {
      setDots(""); // Ensure no dots for other messages
    }
  }, [statusMessage]);

  useEffect(() => {
    console.log("File Data:", fileData);
  }, [fileData]);

  useEffect(() => {
    if (activeTab === 'spectrogram' && !fileData && currentFileId) {
      console.log("Restoring fileData from backend for fileId:", currentFileId);
      handleLoadFile(currentFileId); // Re-fetch fileData from the backend
    }
  }, [activeTab, fileData, currentFileId]);
  
  const updateStatusMessage = (message: string) => {
    setStatusMessage(message);
    if (message !== "Uploading files" && message !== "Clearing all saved files...") {
      setDots(""); // Stop dots animation for other messages
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, index: number, type: 'vertical' | 'horizontal') => {
    e.preventDefault(); // Prevent default browser behavior
  
    // Capture the bounding rectangle of the spectrogram container
    const container = e.currentTarget.parentElement;
    if (!container) return; // Ensure the container exists
    const containerRect = container.getBoundingClientRect();
  
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (type === 'vertical') {
        const newX = moveEvent.clientX - containerRect.left;
        console.log(minFreq)
        console.log(maxFreq)
        console.log(maxTime)
        setVerticalCursors((prev) => {
          const updated = [...prev];
          updated[index] = Math.max(0, Math.min(newX, containerRect.width));
          return updated;
        });
      } else if (type === 'horizontal') {
        const newY = moveEvent.clientY - containerRect.top;
        setHorizontalCursors((prev) => {
          const updated = [...prev];
          updated[index] = Math.max(0, Math.min(newY, containerRect.height));
          return updated;
        });
      }
    };
  
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const getSpectrogramWidth = () => {
    if (spectrogramRef.current) {
      return spectrogramRef.current.getBoundingClientRect().width;
    }
    return 0; // Default to 0 if the container is not available
  };

  const getSpectrogramHeight = () => {
    if (spectrogramRef.current) {
      return spectrogramRef.current.getBoundingClientRect().height;
    }
    return 0; // Default to 0 if the container is not available
  };

  const calculateHorizontalCursorPosition = (position: number) => {
    if (!fileData) return 0;
    const specgramHeight = getSpectrogramHeight();
    const trueHeight = (1 - top_padding - bottom_padding) * specgramHeight;
    const padding_adjust = top_padding * specgramHeight;
    const adjusted_pos = position - padding_adjust;
    return (adjusted_pos / trueHeight) * maxTime;
  };
  
  const calculateVerticalCursorPosition = (position: number) => {
    if (!fileData) return 0;
    const specgramWidth = getSpectrogramWidth();
    const trueWidth = (1 - left_padding - right_padding) * specgramWidth;
    const padding_adjust = left_padding * specgramWidth;
    const adjusted_pos = position - padding_adjust;
    return fileData.minFreq + (adjusted_pos / trueWidth) * (maxFreq - minFreq);
  };

  const calculatePositionFromTime = (time: number) => {
    if (!fileData) return 0;
    const specgramHeight = getSpectrogramHeight();
    const trueHeight = (1 - top_padding - bottom_padding) * specgramHeight;
    const padding_adjust = top_padding * specgramHeight;
    console.log("height:", time, "/", maxTime, "*", trueHeight, "+", padding_adjust )
    return ((time / maxTime) * trueHeight) + padding_adjust;
  };
  
  const calculatePositionFromFreq = (freq: number) => {
    if (!fileData) return 0;
    const specgramWidth = getSpectrogramWidth();
    const trueWidth = (1 - left_padding - right_padding) * specgramWidth;
    const padding_adjust = left_padding * specgramWidth;
    console.log("width:", freq, "-", minFreq, "/", maxFreq, "*", trueWidth, "+", padding_adjust )
    return (((freq - minFreq)/ (maxFreq - minFreq)) * trueWidth) + padding_adjust;
  };

  const toggleAnnotationDisplay = (annotationId: string, isChecked: boolean) => {
    setAnnotations((prevAnnotations) =>
      prevAnnotations.map((annotation) =>
        annotation.id === annotationId
          ? { ...annotation, display: isChecked }
          : annotation
      )
    );
  
    // Optionally, update the backend or trigger a re-render of the spectrogram
    if (isChecked) {
      console.log(`Annotation ${annotationId} will be displayed.`);
    } else {
      console.log(`Annotation ${annotationId} will not be displayed.`);
    }
  };

  const createAnnotation = async () => {
    if (verticalCursors.length < 2 || horizontalCursors.length < 2) {
      alert('Please position at least two vertical and two horizontal cursors to create an annotation.');
      return;
    }
  
    const freq1 = Math.min(calculateVerticalCursorPosition(verticalCursors[0]), calculateVerticalCursorPosition(verticalCursors[1]));
    const freq2 = Math.max(calculateVerticalCursorPosition(verticalCursors[0]), calculateVerticalCursorPosition(verticalCursors[1]));
    const time1 = Math.min(calculateHorizontalCursorPosition(horizontalCursors[0]), calculateHorizontalCursorPosition(horizontalCursors[1]));
    const time2 = Math.max(calculateHorizontalCursorPosition(horizontalCursors[0]), calculateHorizontalCursorPosition(horizontalCursors[1]));
  
    const newAnnotation = {
      id: `${Date.now()}`, // Unique ID for the annotation
      corners: { freq1, time1, freq2, time2 },
      label: annotationLabel.trim(),
      comment: annotationComment.trim(), // Include the comment
      display: true,
    };
  
    // Update the frontend state
    setAnnotations((prev) => [...prev, newAnnotation]);
    setAnnotationLabel(''); // Clear the label input field
    setAnnotationComment(''); // Clear the comment input field
  
    // Update the fileData state to include the new annotations
    setFileData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        annotations: [...annotations, newAnnotation], // Include the new annotation
      };
    });
  
    // Send the updated annotations to the backend
    try {
      const response = await fetch(`http://127.0.0.1:5000/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: currentFileId, // Pass the current file ID
          annotations: [...annotations, newAnnotation], // Include the new annotation
        }),
      });
  
      const result = await response.json();
      if (result.error) {
        console.error('Error saving annotation:', result.error);
        alert('Failed to save annotation to the backend.');
      } else {
        console.log('Annotation saved successfully:', result.message);
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
      alert('Failed to save annotation to the backend.');
    }
  };

  const deleteAnnotation = async (annotationId: string) => {
    const updatedAnnotations = annotations.filter((annotation) => annotation.id !== annotationId);
    setAnnotations(updatedAnnotations);
  
    // Update the fileData state
    setFileData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        annotations: updatedAnnotations,
      };
    });
  
    // Update the backend
    try {
      const response = await fetch(`http://127.0.0.1:5000/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: currentFileId, // Pass the current file ID
          annotations: updatedAnnotations, // Send the updated list of annotations
        }),
      });
  
      const result = await response.json();
      if (result.error) {
        console.error('Error deleting annotation:', result.error);
        alert('Failed to delete annotation from the backend.');
      } else {
        console.log('Annotation deleted successfully:', result.message);
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
      alert('Failed to delete annotation from the backend.');
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setAnnotations((prev) => [...prev]); // Trigger a re-render
    };
  
    window.addEventListener('resize', handleResize);
  
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
   
  return (
    <main className="enhanced-app-container">
      {/* Status Banner */}
      <p className="status-banner">{statusMessage}{dots}</p>
  
      {/* File Selection Section */}
      <div className="file-selection">
        {/* .cfile Selection */}
        <div className="file-row">
          <label htmlFor="cfile-upload" className="custom-file-upload">Choose .cfile</label>
          <input
            id="cfile-upload"
            type="file"
            accept=".cfile"
            onChange={handleCFileChange}
            className="file-input"
          />
          <span className="file-name">{selectedCFileName || "No file selected"}</span>
        </div>
  
        {/* .sigmf-meta Selection */}
        <div className="file-row">
          <label htmlFor="meta-upload" className="custom-file-upload">Choose .sigmf</label>
          <input
            id="meta-upload"
            type="file"
            accept=".sigmf-meta"
            onChange={handleMetaFileChange}
            className="file-input"
          />
          <span className="file-name">{selectedMetaFileName || "No file selected"}</span>
        </div>
      </div>
  
      {/* File Actions */}
      <div className="file-actions">
        <button
          onClick={handleUpload}
          className="btn upload-btn"
          disabled={!selectedCFile || !selectedMetaFile}
        >
          Upload
        </button>
        <button
          onClick={handleClearCurrentFile}
          className="btn clear-files-btn"
        >
          Clear Current File
        </button>
      </div>
  
      {/* Tabbed Interface for Plots */}
      {currentFileId ? (
        <div className="plot-container">
          {/* Tabs */}
          <div className="tabs">
            {['spectrogram', 'time_domain', 'freq_domain', 'iq_plot'].map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? 'active' : ''}
                onClick={() => setActiveTab(tab)}
              >
                {tab.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
  
          {/* Plot Display */}
          {plotImages[activeTab] ? (
            <div className="spectrogram-container" ref={spectrogramRef}>
              <img
                src={`data:image/png;base64,${plotImages[activeTab]}`}
                alt={activeTab}
                className="plot-image"
              />
  
              {/* Render Cursors for Spectrogram */}
              {activeTab === 'spectrogram' && showCursors && (
                <>
                  {/* Vertical Cursors */}
                  {verticalCursors.map((x, index) => {
                    const frequency = calculateVerticalCursorPosition(x);
                    return (
                      <div
                        key={`vertical-${index}`}
                        className="vertical-cursor"
                        style={{ left: `${x}px` }}
                        onMouseDown={(e) => handleMouseDown(e, index, 'vertical')}
                      >
                        <span className="cursor-label">{frequency.toFixed(2)} Hz</span>
                      </div>
                    );
                  })}
  
                  {/* Horizontal Cursors */}
                  {horizontalCursors.map((y, index) => {
                    const time = calculateHorizontalCursorPosition(y);
                    return (
                      <div
                        key={`horizontal-${index}`}
                        className="horizontal-cursor"
                        style={{ top: `${y}px` }}
                        onMouseDown={(e) => handleMouseDown(e, index, 'horizontal')}
                      >
                        <span className="cursor-label">{time.toFixed(2)} s</span>
                      </div>
                    );
                  })}
                </>
              )}
  
              {/* Render Annotations */}
              {annotations
                .filter((annotation) => annotation.display) // Only render annotations with display: true
                .map((annotation) => {
                  const left = calculatePositionFromFreq(annotation.corners.freq1);
                  const top = calculatePositionFromTime(annotation.corners.time1);
                  const width = calculatePositionFromFreq(annotation.corners.freq2) - calculatePositionFromFreq(annotation.corners.freq1);
                  const height = calculatePositionFromTime(annotation.corners.time2) - calculatePositionFromTime(annotation.corners.time1);

                  return (
                    <div
                      key={annotation.id}
                      className="annotation-box"
                      style={{
                        position: 'absolute',
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                        border: '2px solid red',
                        backgroundColor: 'rgba(255, 0, 0, 0.2)', // Optional: Add a semi-transparent background
                      }}
                    >
                      <span className="annotation-label">{annotation.label}</span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="status-banner">Loading {activeTab}...</p>
          )}
        </div>
      ) : (
        <p className="status-banner">No file selected. Please upload a file.</p>
      )}
  
      {/* Annotations Container */}
      {currentFileId && activeTab === 'spectrogram' && (
        <Annotations
          annotations={annotations}
          annotationLabel={annotationLabel}
          annotationComment={annotationComment}
          horizontalCursors={horizontalCursors}
          verticalCursors={verticalCursors}
          calculateHorizontalCursorPosition={calculateHorizontalCursorPosition}
          calculateVerticalCursorPosition={calculateVerticalCursorPosition}
          setAnnotationLabel={setAnnotationLabel}
          setAnnotationComment={setAnnotationComment}
          createAnnotation={createAnnotation}
          deleteAnnotation={deleteAnnotation}
          toggleAnnotationDisplay={toggleAnnotationDisplay}
          showCursors={showCursors} 
          setShowCursors={setShowCursors} 
        />
      )}
  
      {/* Saved Files Section */}
      <SavedFiles
        savedFiles={savedFiles}
        onDelete={handleSingleDelete}
        onLoad={handleLoadFile}
      />
    </main>
  );
}

export default FileHandle;
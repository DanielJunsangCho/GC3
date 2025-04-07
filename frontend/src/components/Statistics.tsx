import React, { useState, useEffect } from 'react';
import Select from 'react-select';


const tabOptions = [
  { value: 'metadata', label: 'Metadata Statistics' },
  { value: 'calculated', label: 'Receiver Properties' },
  { value: 'transmission', label: 'Transmission Statistics' },
];


interface StatisticsProps {
  fileId: string | null;
}

interface MetadataType {
  sample_rate?: number;
  center_frequency?: number;
  datatype?: string;
  sample_start?: number;
  offset?: number;
  author?: string;
  hardware?: string;
  recorder?: string;
  datetime?: string;
}

const MetadataSection: React.FC<{ title: string; items: [string, any][] }> = ({ title, items }) => (
  <div className="metadata-section">
    <h3 className="section-title">{title}</h3>
    <div className="metadata-grid">
      {items.map(([key, value]) => (
        <div className="metadata-item" key={key}>
          <span className="metadata-key">{key}:</span>
          <span className="metadata-value">{value ?? 'N/A'}</span>
        </div>
      ))}
    </div>
  </div>
);

const Statistics: React.FC<StatisticsProps> = ({ fileId }) => {
  const [metadata, setMetadata] = useState<MetadataType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('metadata');
  const [calculatedStats, setCalculatedStats] = useState<Record<string, any> | null>(null);


  useEffect(() => {
    if (!fileId) {
      setMetadata(null);
      return;
    }

    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://127.0.0.1:5000/metadata/${fileId}`);
        const result = await response.json();

        if (result.error) {
          setError(result.error);
          setMetadata(null);
        } else {
          setMetadata(result);
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Failed to load metadata.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
    const fetchCalculatedStats = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:5000/file/${fileId}/calculated_statistics`);
        const result = await response.json();
    
        console.log("Received calculated stats:", result); // ✅ DEBUG HERE
    
        if (!result.error) {
          setCalculatedStats(result);
        }
      } catch (err) {
        console.error('Error fetching calculated statistics:', err);
      }
    };
    fetchCalculatedStats();    
  }, [fileId]);


  const formatCalculatedStats = (data: Record<string, any>) => {
    const fields: [string, any][] = [
      ['Sample Rate', `${Number(data.sampling_frequency).toLocaleString()} Hz`],
      ['FFT', data.fft_size],
      ['Row Duration', `${data.row_duration.toExponential(2)} s`],
      ['Frequency Resolution', `${data.frequency_resolution.toFixed(2)} Hz`]
    ];
  
    return (
      <div className="metadata-container">
        <MetadataSection title="Receiver Properties" items={fields} />
      </div>
    );
  };
  
  const formatMetadata = (data: MetadataType) => {
    const administrativeFields: [string, any][] = [
      ['Author', data.author],
      ['Hardware', data.hardware],
      ['Recorder', data.recorder],
      ['Date/Time', data.datetime ? new Date(data.datetime).toLocaleString() : 'N/A'],
    ];

    const technicalFields: [string, any][] = [
      ['Sample Rate', data.sample_rate ? `${Number(data.sample_rate).toLocaleString()} Hz` : 'N/A'],
      ['Center Frequency', data.center_frequency ? `${Number(data.center_frequency).toLocaleString()} Hz` : 'N/A'],
      ['Data Type', data.datatype],
      ['Sample Start', data.sample_start],
      ['Offset', data.offset],
    ];

    return (
      <div className="metadata-container">
        <MetadataSection title="General Information" items={administrativeFields} />
        <MetadataSection title="Statistics" items={technicalFields} />
      </div>
    );
  };
  

  const renderTabContent = () => {
    switch (activeTab) {
      case 'metadata':
        return metadata ? formatMetadata(metadata) : <p className="no-file-message">No metadata available.</p>;
      case 'calculated':
        return calculatedStats
          ? formatCalculatedStats(calculatedStats)
          : <p className="placeholder-message">whaisodiaoksjdkajsldk.</p>;
      case 'transmission':
        return <p className="placeholder-message">Analysis tools tab coming soon.</p>;
      default:
        return null;
    }
  };

  return (
    <div className="statistics-container">
      <h2 className="statistics-header">Information</h2>

      <div className="mb-6 w-full max-w-md min-w-[250px]">
        <Select
          inputId="tab-select"
          options={tabOptions}
          defaultValue={tabOptions.find((option) => option.value === activeTab)}
          onChange={(selectedOption) => setActiveTab(selectedOption?.value || 'current')}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          styles={{
            control: (base) => ({
              ...base,
              width: '100%',
              borderRadius: '0.5rem',
              borderColor: '#d1d5db',
              padding: '2px',
              boxShadow: 'none',
              '&:hover': { borderColor: '#3b82f6' },
            }),
            menuPortal: (base) => ({ ...base, zIndex: 9999 }), // important for visibility
            option: (base, { isFocused, isSelected }) => ({
              ...base,
              backgroundColor: isSelected
                ? '#3b82f6'
                : isFocused
                ? '#e0e7ff'
                : undefined,
              color: isSelected ? 'white' : 'black',
              cursor: 'pointer',
            }),
          }}
        />
      </div>




      <div className="tab-content">
        {loading ? (
          <p className="loading-message">Loading metadata...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
};

export default Statistics;

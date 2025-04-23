"""
CS-410: FileData class that stores file level information about uploaded data file
@file FileData.py
@authors Jun Cho, Will Cho, Grace Johnson, Connor Whynott
@collaborators None
"""

import SigMF

class FileData:
    def __init__(self, original_name, sigmf_metadata, pxx_csv_file_id, plot_ids, freqs, bins, fft=1024, airview_annotations=None):
        """
        Initializes FileData object.
        :param original_name: Original filename without extension
        :param sigmf_metadata: SigMF metadata object
        :param pxx_csv_file_id: File ID of the power spectral density (Pxx) CSV file
        :param plot_ids: Dictionary containing file IDs for various plots
        :param bins: Array of time bins for the spectrogram
        :param freqs: Array of frequency bins for the spectrogram
        :param fft: FFT size for spectrogram processing (default: 1024)
        :param annotations: Optional list of annotations from AirVIEW
        """
        self.filename = original_name
        self.max_time = bins[-1]
        print(f"MAX TIME {self.max_time}")
        self.min_freq = freqs[0]
        self.max_freq = freqs[-1]
        print(f"MIN FREQ {self.min_freq}")
        print(f"MAX FREQ {self.max_freq}")
        self.raw_data_file_id = str(plot_ids["raw_data"]) if "raw_data" in plot_ids else None
        self.csv_file_id = str(pxx_csv_file_id)
        self.spectrogram_file_id = str(plot_ids["spectrogram"])
        self.iq_plot_file_id = str(plot_ids["iq_plot"])
        self.time_domain_file_id = str(plot_ids["time_domain"])
        self.freq_domain_file_id = str(plot_ids["freq_domain"])
        self.metadata = sigmf_metadata.__dict__

        # Additional metadata
        self.sigmf = sigmf_metadata.__dict__
        self.fft = fft

        self.airview_annotations = airview_annotations if airview_annotations is not None else []

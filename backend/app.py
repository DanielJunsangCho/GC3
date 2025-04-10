"""
CS-410: Generates spectrograms from uploaded files and stores them in MongoDB
@file app.py
@authors Jun Cho, Will Cho, Grace Johnson, Connor Whynott
@collaborators None
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import matplotlib.pyplot as plt
import io
import base64
from pymongo import MongoClient
from bson import ObjectId
from gridfs import GridFS
from gridfs import errors as gridfs_errors
from SigMF import SigMF
from FileData import FileData
import csv
import os
import json

import matplotlib
# Use the Agg backend for Matplotlib to avoid using any X server
matplotlib.use('Agg')

"""
 * Creates and configures the Flask application.
 * @return The configured Flask application.
"""
def create_app():
    # Initialize the Flask application
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes

    # MongoDB setup using GridFS
    client = MongoClient("mongodb://localhost:27017")
    db = client['files_db']
    fs = GridFS(db)

    @app.route('/upload', methods=['POST'])
    def upload_file():
        """Uploads files, generates plots, stores in MongoDB."""
        if 'cfile' not in request.files or 'metaFile' not in request.files:
            return jsonify({'error': 'Both .cfile and .sigmf-meta files are required'}), 400

        cfile, metafile = request.files['cfile'], request.files['metaFile']
        original_name = cfile.filename.replace('.cfile', '')

        try:
            # Pass the actual file object to SigMF, NOT a string
            sigmf_metadata = SigMF(metafile)
        except Exception as e:
            return jsonify({'error': f'Failed to parse metadata: {str(e)}'}), 400

        iq_data = np.frombuffer(cfile.read(), dtype=np.complex64)

        plot_ids, Pxx, freqs, bins = generate_plots(original_name, iq_data, sigmf_metadata)
        pxx_csv_file_id = save_pxx_csv(original_name, Pxx, freqs, bins)

        # Save the metadata file in GridFS
        metafile.seek(0)  # Reset file pointer before saving
        meta_file_id = fs.put(metafile.read(), filename=f"{original_name}.sigmf-meta")

        # Store metadata file ID in file_records
        file_data = FileData(original_name, sigmf_metadata, pxx_csv_file_id, plot_ids)
        file_data.meta_file_id = meta_file_id  # Save metadata file ID
        file_record_id = db.file_records.insert_one(file_data.__dict__).inserted_id

        encoded_spectrogram = base64.b64encode(fs.get(plot_ids["spectrogram"]).read()).decode('utf-8')

        return jsonify({
            'spectrogram': encoded_spectrogram,
            'file_id': str(file_record_id),
            'message': 'All files uploaded and saved successfully'
        })

    def generate_plots(original_name, iq_data, sigmf_metadata):
        """Generates and stores plots in GridFS."""
        plots = {}

        # Debug: Starting plot generation
        print(f"Generating plots for {original_name}...")

        # Generate spectrogram and get Pxx, freqs, bins
        fig, Pxx, freqs, bins = plot_spectrogram(iq_data, sigmf_metadata)
        spectrogram_file_id = save_plot(fig, f"{original_name}_spectrogram.png")
        plots["spectrogram"] = spectrogram_file_id
        print(f"Saved Spectrogram: {spectrogram_file_id}")

        # Generate time domain plot
        fig = plot_time_domain(iq_data, sigmf_metadata)
        plots["time_domain"] = save_plot(fig, f"{original_name}_time_domain.png")
        print(f"Saved Time Domain Plot: {plots['time_domain']}")

        # Generate frequency domain (FFT) plot
        fig = plot_freq_domain(iq_data, sigmf_metadata)
        plots["freq_domain"] = save_plot(fig, f"{original_name}_freq_domain.png")
        print(f"Saved Frequency Domain Plot: {plots['freq_domain']}")

        # Generate IQ plot (Constellation Diagram)
        fig = plot_iq(iq_data)
        plots["iq_plot"] = save_plot(fig, f"{original_name}_iq_plot.png")
        print(f"Saved IQ Plot: {plots['iq_plot']}")

        # Debug: Finished plot generation
        print(f"All plots generated and saved for {original_name}.")

        return plots, Pxx, freqs, bins

    def save_plot(fig, filename):
        """Saves a given Matplotlib figure to GridFS."""
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        return fs.put(buf.getvalue(), filename=filename)

    def plot_time_domain(iq_data, sigmf_metadata):
        """Generates the time-domain plot."""
        fig, ax = plt.subplots(figsize=(8, 4))
        time_axis = np.arange(len(iq_data)) / sigmf_metadata.sample_rate
        ax.plot(time_axis[:1000], iq_data[:1000].real, label="Real")
        ax.plot(time_axis[:1000], iq_data[:1000].imag, label="Imaginary", linestyle='dashed')
        ax.set_title("Time Domain Signal")
        ax.set_xlabel("Time [s]")
        ax.set_ylabel("Amplitude")
        ax.legend()
        return fig

    def plot_freq_domain(iq_data, sigmf_metadata):
        """Generates the frequency-domain (FFT) plot."""
        fig, ax = plt.subplots(figsize=(8, 4))
        fft_spectrum = np.fft.fftshift(np.fft.fft(iq_data))
        freq_axis = np.fft.fftshift(np.fft.fftfreq(len(iq_data), 1 / sigmf_metadata.sample_rate))
        ax.plot(freq_axis, 20 * np.log10(np.abs(fft_spectrum)), color='red')
        ax.set_title("Frequency Domain (FFT)")
        ax.set_xlabel("Frequency [Hz]")
        ax.set_ylabel("Power [dB]")
        return fig

    def plot_iq(iq_data):
        """Generates the IQ plot (constellation diagram)."""
        fig, ax = plt.subplots(figsize=(8, 8))
        ax.scatter(iq_data[:5000].real, iq_data[:5000].imag, alpha=0.5, s=2)
        ax.set_title("IQ Plot (Constellation Diagram)")
        ax.set_xlabel("In-phase")
        ax.set_ylabel("Quadrature")
        return fig

    def plot_spectrogram(iq_data, sigmf_metadata):
        """Generates the spectrogram and returns Pxx, freqs, bins."""
        fig, ax = plt.subplots(figsize=(8, 4.8))
        # Generate the spectrogram
        Pxx, freqs, bins, im = ax.specgram(
            iq_data,
            Fs=sigmf_metadata.sample_rate,
            Fc=sigmf_metadata.center_frequency,
            cmap='viridis'
        )
        # Overlay image representation of Pxx (Power Spectral Density)
        ax.imshow(10 * np.log10(Pxx.T), aspect='auto', extent=[freqs[0], freqs[-1], bins[-1], 0], cmap='viridis')
        # Set plot labels
        ax.set_xlabel("Frequency [Hz]")
        ax.set_ylabel("Time [s]")
        ax.set_title("Spectrogram")
        return fig, Pxx, freqs, bins

    def save_pxx_csv(original_name, Pxx, freqs, bins):
        """Saves the Pxx matrix as a CSV in GridFS."""
        pxx_csv_data = io.StringIO()
        csv_writer = csv.writer(pxx_csv_data)

        csv_writer.writerow(["Frequency (Hz)"] + bins.tolist())
        for i, freq in enumerate(freqs):
            csv_writer.writerow([freq] + Pxx[i].tolist())

        pxx_csv_data.seek(0)
        return fs.put(pxx_csv_data.getvalue().encode(), filename=f"{original_name}_pxx.csv")
    
    @app.route('/file/<file_id>', methods=['DELETE'])
    def delete_file(file_id):
        """Deletes a file and its associated data (plots, Pxx file, metadata)."""
        try:
            print("DELETING.....")
            
            # Retrieve the file record from the database
            file_record = db.file_records.find_one({"_id": ObjectId(file_id)})
            if not file_record:
                print("file not found")
                return jsonify({"error": "File not found"}), 404
            
            print("File Record Attributes:")
            for key, value in file_record.items():
                print(f"{key}: {value}")

            print("HELLOOOOOOOOOOO")
            # Delete PXX file
            try:
                print(ObjectId(file_record["csv_file_id"]))
                fs.delete(ObjectId(file_record["csv_file_id"]))
                print("PXX deleted")
                print(ObjectId(file_record["iq_plot_file_id"]))
                fs.delete(ObjectId(file_record["iq_plot_file_id"]))
                print("IQ plot deleted")
                fs.delete(ObjectId(file_record["spectrogram_file_id"]))
                print("Spectrogram deleted")
                fs.delete(ObjectId(file_record["time_domain_file_id"]))
                print("Time domain plot deleted")
                fs.delete(ObjectId(file_record["freq_domain_file_id"]))
                print("Frequency domain plot deleted")
                fs.delete(ObjectId(file_record["meta_file_id"]))
                print("Metadata file deleted")
                
            except gridfs_errors.NoFile:
                print(f"file not found.")


            db.file_records.delete_one({"_id": ObjectId(file_id)})

            return jsonify({"message": f"File with ID {file_id} and its associated data deleted successfully."})

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/files', methods=['GET'])
    def get_files():
        """Lists all stored filenames."""
        try:
            files = list(db.file_records.find({}, {"filename": 1}))
            file_list = [{"_id": str(file["_id"]), "filename": file["filename"]} for file in files]
            return jsonify({"files": file_list})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/file/<file_id>/spectrogram', methods=['GET'])
    def get_file_spectrogram(file_id):
        """Retrieves the spectrogram PNG from GridFS using the saved file ID."""
        try:
            if not ObjectId.is_valid(file_id):
                return jsonify({'error': 'Invalid file ID format'}), 400  

            file_record = db.file_records.find_one({"_id": ObjectId(file_id)})
            if not file_record:
                return jsonify({'error': 'File not found'}), 404

            spectrogram_file = fs.get(ObjectId(file_record["spectrogram_file_id"]))
            return jsonify({'image': base64.b64encode(spectrogram_file.read()).decode('utf-8')})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/refresh', methods=['POST'])
    def refresh_files():
        """Clears all saved files and metadata."""
        try:
            db.file_records.delete_many({})
            for file in fs.find():
                fs.delete(file._id)
            return jsonify({'message': 'All files have been cleared.'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/file/<file_id>/<plot_type>', methods=['GET'])
    def get_file_plot(file_id, plot_type):
        """Retrieves a requested plot (spectrogram, time domain, frequency domain, or IQ plot) from GridFS."""
        try:
            if not ObjectId.is_valid(file_id):
                return jsonify({'error': 'Invalid file ID format'}), 400  

            file_record = db.file_records.find_one({"_id": ObjectId(file_id)})
            if not file_record or f"{plot_type}_file_id" not in file_record:
                return jsonify({'error': f'{plot_type} file not found'}), 404

            # Fetch the file from GridFS
            plot_file = fs.get(ObjectId(file_record[f"{plot_type}_file_id"]))
            return jsonify({'image': base64.b64encode(plot_file.read()).decode('utf-8')})

        except gridfs_errors.NoFile:
            return jsonify({'error': f'{plot_type} file does not exist in GridFS'}), 404
        except Exception as e:
            return jsonify({'error': str(e)}), 500


    import json

    @app.route('/metadata/<file_id>', methods=['GET'])
    def get_metadata(file_id):
        """Fetch metadata for a given file."""
        if not ObjectId.is_valid(file_id):
            return jsonify({'error': 'Invalid file ID format'}), 400  

        file_record = db.file_records.find_one({"_id": ObjectId(file_id)})
        if not file_record:
            return jsonify({'error': 'File not found'}), 404

        # Ensure meta_file_id exists in file_record
        if "meta_file_id" not in file_record:
            return jsonify({'error': 'meta_file_id not found in record'}), 400

        try:
            # Fetch the metadata file from GridFS
            meta_file = fs.get(ObjectId(file_record["meta_file_id"]))

            # Read and decode metadata
            meta_content = meta_file.read().decode('utf-8')  # Keep this as a string!

            # Pass the JSON string to SigMF (not a dict!)
            sigmf_metadata = SigMF(io.StringIO(meta_content))

        except gridfs_errors.NoFile:
            return jsonify({'error': 'Metadata file not found in GridFS'}), 404
        except json.JSONDecodeError:
            return jsonify({'error': 'Failed to parse metadata JSON'}), 400
        except Exception as e:
            return jsonify({'error': f'Error processing SigMF: {str(e)}'}), 500

        # Return extracted metadata
        metadata = {
            "datatype": sigmf_metadata.datatype,
            "sample_rate": sigmf_metadata.sample_rate,
            "author": sigmf_metadata.author,
            "hardware": sigmf_metadata.hardware,
            "offset": sigmf_metadata.offset,
            "recorder": sigmf_metadata.recorder,
            "datetime": sigmf_metadata.datetime,
            "center_frequency": sigmf_metadata.center_frequency,
            "sample_start": sigmf_metadata.sample_start,
        }

        return jsonify(metadata)

    def generate_data(rows, cols, num_transmitters, transmitter_mean, transmitter_sd, noise_mean, noise_sd, bandwidth, active_time, placement_method):
        matrix = np.random.normal(loc=noise_mean, scale=noise_sd, size=(rows, cols))

        transmitters = []
        center_freq = cols // 2  # Center frequency bin

        def is_overlapping(start_time, start_freq):
            for t_start, f_start in transmitters:
                if (start_time < t_start + active_time and start_time + active_time > t_start and
                    start_freq < f_start + bandwidth and start_freq + bandwidth > f_start):
                    return True
            return False

        if placement_method == "random":
            for _ in range(num_transmitters):
                while True:
                    start_time = np.random.randint(0, rows - active_time + 1)
                    start_freq = center_freq - (bandwidth // 2)  # Center the transmitter around the middle frequency
                    if not is_overlapping(start_time, start_freq):
                        transmitters.append((start_time, start_freq))
                        break
        elif placement_method == "equally_spaced":
    
            if num_transmitters == 1:
                # Handle single transmitter case - place it randomly
                start_time = np.random.randint(0, rows - active_time + 1)
                start_freq = center_freq - (bandwidth // 2)
                transmitters.append((start_time, start_freq))
            else:
                # Place the first transmitter randomly in the top third of the matrix
                top_third = (rows - active_time) // 3
                min_position = max(0, top_third // 2)  # Ensure some margin from the very top
                first_transmitter_pos = np.random.randint(min_position, min_position + top_third)
                
                # Add the first transmitter
                transmitters.append((first_transmitter_pos, center_freq - (bandwidth // 2)))
                
                # Calculate available space from first transmitter to bottom of matrix
                available_space = rows - first_transmitter_pos - active_time
                
                # Important: Calculate total number of gaps needed
                # We need (num_transmitters-1) gaps between transmitters + 1 gap after last transmitter
                total_gaps = num_transmitters  # This equals (num_transmitters-1) + 1
                
                # Calculate the size of each gap to ensure equal spacing
                gap_size = available_space // total_gaps
                
                # Place remaining transmitters with equal gaps
                for i in range(1, num_transmitters):
                    # Position each transmitter after a consistent gap
                    # Each transmitter is placed after the end of the previous one + a gap
                    start_time = first_transmitter_pos + active_time + (i * gap_size)
                    start_freq = center_freq - (bandwidth // 2)
                    transmitters.append((start_time, start_freq))

        # Inject the transmitter signal
        for start_time, start_freq in transmitters:
            for t in range(start_time, start_time + active_time):
                for f in range(start_freq, start_freq + bandwidth):
                    if 0 <= t < rows and 0 <= f < cols:  # Ensure we're within matrix bounds
                        signal = np.random.normal(loc=transmitter_mean, scale=transmitter_sd)
                        matrix[t][f] += signal

        # Generate plot as base64
        plt.figure(figsize=(10, 6))
        plt.imshow(matrix, aspect='auto', cmap='viridis')
        plt.title('Generated Data Matrix')
        plt.xlabel("Frequency")
        plt.ylabel("Time")
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        plot_data = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        # Generate CSV data
        csv_data = io.StringIO()
        csv_writer = csv.writer(csv_data)
        
        # Add header row with column indices
        header = ['Row/Col'] + [str(i) for i in range(cols)]
        csv_writer.writerow(header)
        
        # Add data rows
        for i in range(rows):
            row_data = [str(i)] + [str(float(x)) for x in matrix[i]]
            csv_writer.writerow(row_data)
        
        csv_data.seek(0)
        csv_string = csv_data.getvalue()
        
        return plot_data, csv_string

    @app.route('/generate', methods=['POST'])
    def generate_data_endpoint():
        """High level function for generating spectrogram"""
        data = request.json
        rows = data['rows']
        cols = data['cols']
        num_transmitters = data['numTransmitters']
        transmitter_mean = data['transmitterMean']
        transmitter_sd = data['transmitterSd']
        noise_mean = data['noiseMean']
        noise_sd = data['noiseSd']
        bandwidth = data['bandwidth']
        active_time = data['activeTime']
        placement_method = data['placementMethod']

        try:
            plot_data, csv_data = generate_data(rows, cols, num_transmitters, transmitter_mean, transmitter_sd, noise_mean, noise_sd,
                                    bandwidth, active_time, placement_method)
            return jsonify({
                'plot': plot_data,
                'csv': csv_data
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
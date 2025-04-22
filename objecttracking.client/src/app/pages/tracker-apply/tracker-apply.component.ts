import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tracker-apply',
  standalone: false,
  templateUrl: './tracker-apply.component.html',
  styleUrl: './tracker-apply.component.css'
})
export class TrackerApplyComponent {
  videoFile: File | null = null;
  modelFile: File | null = null;

  uploadMessage: string = '';
  loading: boolean = false;
  processedVideoUrl: string | null = null;  // Store URL for processed video

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  constructor(private http: HttpClient) { }

  // Handle model file selection
  onModelSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.modelFile = file;
    }
  }

  // Handle video file selection
  onVideoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.videoFile = file;
    }
  }

  // Upload assets (model and video)
  uploadAssets(): void {
    if (!this.videoFile || !this.modelFile) {
      this.uploadMessage = 'Please select both a video file and a model (.pt) file.';
      return;
    }

    this.loading = true;
    this.uploadMessage = 'Uploading and preparing...';

    const formData = new FormData();
    formData.append('video', this.videoFile);
    formData.append('model', this.modelFile);

    this.http.post<any>('/VideoUpload/upload-assets', formData).subscribe({
      next: () => {
        this.uploadMessage = 'Upload successful. Processing video...';
        this.processVideo();  // Proceed to video processing
      },
      error: (err) => {
        this.uploadMessage = 'Upload failed.';
        this.loading = false;
        console.error('Upload error:', err);
      }
    });
  }

  // Process the video by calling the backend endpoint to add bounding boxes
  processVideo(): void {
    this.uploadMessage = 'Processing video...';

    this.http.post<any>('/VideoUpload/process-video', {}).subscribe({
      next: () => {
        this.uploadMessage = 'Video processed successfully. Streaming video...';
        this.loading = false;
        this.getVideo();  // Fetch the processed video URL
      },
      error: (err) => {
        this.uploadMessage = 'Error processing video.';
        this.loading = false;
        console.error('Error processing video:', err);
      }
    });
  }

  getVideo(): void {
    // Fetch the video file as a Blob (binary data)
    this.http.get('/VideoUpload/download-processed-video', { responseType: 'blob' }).subscribe({
      next: (response: Blob) => {
        // Create an object URL for the video Blob
        const videoUrl = URL.createObjectURL(response);
        this.processedVideoUrl = videoUrl;  // Set the video URL for the <video> tag

        this.uploadMessage = 'Processed video is ready for download.';
      },
      error: (err) => {
        console.error('Error fetching video download URL:', err);
        this.uploadMessage = 'Error fetching video download URL.';
      }
    });
  }
}

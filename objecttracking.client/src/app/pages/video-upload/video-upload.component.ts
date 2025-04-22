import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-video-upload',
  standalone: false,
  templateUrl: './video-upload.component.html',
  styleUrl: './video-upload.component.css'
})
export class VideoUploadComponent {
  selectedFile: File | null = null;
  nFrames: number = 5;
  uploadMessage: string = '';
  loading: boolean = false;

  constructor(private http: HttpClient, private router: Router) { }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.selectedFile = input.files[0];
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      return;
    }

    this.loading = true;
    this.uploadMessage = 'Uploading...';

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('nFrames', this.nFrames.toString());

    this.http.post<any>('/VideoUpload/upload', formData)
      .subscribe({
        next: (res: any) => {
          // Update message after successful upload
          this.uploadMessage = `Upload successful`;

          setTimeout(() => {
            this.router.navigate(['/frame-labeler']);
          }, 1000);
        },
        error: (err: any) => {
          // Handle error
          this.uploadMessage = 'Upload failed.';
          console.error('Error uploading video:', err);
        }
      });
  }
}

import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-frame-labeler',
  standalone: false,
  templateUrl: './frame-labeler.component.html',
  styleUrl: './frame-labeler.component.css'
})
export class FrameLabelerComponent implements OnInit {
  frames: string[] = [];
  currentFrameIndex = 0;
  currentImageUrl = '';
  drawing = false;
  box = { x: 0, y: 0, w: 0, h: 0 };
  loading = false;
  trainingMessage = '';
  private lastBox: { x: number; y: number; w: number; h: number } | null = null;
  private imageScale = 1;

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private startX = 0;
  private startY = 0;

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.loadFrameList();
  }

  loadFrameList() {
    this.http.get<string[]>('/VideoUpload/frames').subscribe((frames) => {
      this.frames = frames;
      this.loadCurrentFrame();
    });
  }

  loadCurrentFrame() {
    const frame = this.frames[this.currentFrameIndex];
    if (!frame) {
      alert('All frames labeled!');
      return;
    }

    this.currentImageUrl = `/VideoUpload/frame/${frame}`;

    this.http.get(this.currentImageUrl, { responseType: 'blob' }).subscribe(
      (blob: Blob) => {
        const imgUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = this.canvasRef.nativeElement;
          const maxWidth = window.innerWidth * 0.9;
          const scale = Math.min(maxWidth / img.width, 1);
          this.imageScale = scale;

          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          this.ctx.clearRect(0, 0, canvas.width, canvas.height);
          this.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(imgUrl);
        };
        img.src = imgUrl;
      },
      (error) => {
        console.error('Failed to load frame image:', error);
      }
    );
  }

  onMouseDown(event: MouseEvent) {
    this.drawing = true;
    if (this.box.w !== 0 && this.box.h !== 0) {
      this.lastBox = { ...this.box };
    }
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.startX = event.clientX - rect.left;
    this.startY = event.clientY - rect.top;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.drawing) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.box = {
      x: this.startX,
      y: this.startY,
      w: x - this.startX,
      h: y - this.startY
    };
    this.redraw();
  }

  onMouseUp() {
    this.drawing = false;
  }

  redraw() {
    const canvas = this.canvasRef.nativeElement;
    const img = new Image();
    img.src = this.currentImageUrl;
    img.onload = () => {
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      this.ctx.strokeStyle = 'red';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(this.box.x, this.box.y, this.box.w, this.box.h);
    };
  }

  undoLastBox() {
    if (this.lastBox) {
      this.box = { ...this.lastBox };
      this.redraw();
    } else {
      alert('No previous box to undo.');
    }
  }

  markNoObject() {
    this.saveLabel(null);
  }

  saveLabel(box: { x: number; y: number; w: number; h: number } | null = this.box) {
    const frame = this.frames[this.currentFrameIndex];
    const canvas = this.canvasRef.nativeElement;

    let labelData = '';
    if (box) {
      const scale = this.imageScale;
      const x_center = ((box.x + box.w / 2) / canvas.width);
      const y_center = ((box.y + box.h / 2) / canvas.height);
      const width = Math.abs(box.w) / canvas.width;
      const height = Math.abs(box.h) / canvas.height;
      labelData = `0 ${x_center} ${y_center} ${width} ${height}`;
    }

    this.http.post('/VideoUpload/save-label', {
      frame,
      label: labelData
    }).subscribe(() => this.moveToNextFrame());
  }

  moveToNextFrame() {
    this.currentFrameIndex++;
    this.box = { x: 0, y: 0, w: 0, h: 0 };
    this.lastBox = null;

    if (this.currentFrameIndex >= this.frames.length) {
      this.startTraining();
    } else {
      this.loadCurrentFrame();
    }
  }

  startTraining() {
    this.loading = true;
    this.trainingMessage = 'Starting training...';

    const eventSource = new EventSource('/VideoUpload/train-stream');

    eventSource.onmessage = (event) => {
      const data = event.data;

      // Update progress message in UI
      if (data.includes('Epoch')) {
        this.trainingMessage = data;
        this.cdr.detectChanges();
      }

      if (data.includes('Training complete')) {
        this.trainingMessage = 'Finalizing... Preparing download...';
        this.cdr.detectChanges();
        eventSource.close();
        setTimeout(() => {
          this.downloadTrainingZip(); // Trigger zip download after small delay
        }, 1000);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Training stream error:', err);
      this.trainingMessage = 'Training failed.';
      this.cdr.detectChanges();
      this.loading = false;
      eventSource.close();
    };
  }

  downloadTrainingZip() {
    this.http.get('/VideoUpload/get-training-zip', { responseType: 'blob' }).subscribe({
      next: (response: Blob) => {
        const blob = new Blob([response], { type: 'application/zip' });
        const downloadUrl = window.URL.createObjectURL(blob);
        sessionStorage.setItem('zipUrl', downloadUrl);
        this.router.navigate(['/training-result']);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to download training result:', err);
        this.trainingMessage = 'Download failed.';
        this.loading = false;
      }
    });
  }
}

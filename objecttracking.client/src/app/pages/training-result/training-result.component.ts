import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-training-result',
  standalone: false,
  templateUrl: './training-result.component.html',
  styleUrl: './training-result.component.css'
})
export class TrainingResultComponent implements OnInit {
  zipUrl: string | null = null;

  ngOnInit(): void {
    this.zipUrl = sessionStorage.getItem('zipUrl');
  }

  downloadZip() {
    if (this.zipUrl) {
      const link = document.createElement('a');
      link.href = this.zipUrl;
      link.download = 'training_result.zip';
      link.click();
    }
  }
}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { VideoUploadComponent } from './pages/video-upload/video-upload.component';
import { TrackerApplyComponent } from './pages/tracker-apply/tracker-apply.component';
import { FrameLabelerComponent } from './pages/frame-labeler/frame-labeler.component';
import { TrainingResultComponent } from './pages/training-result/training-result.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'upload-train', component: VideoUploadComponent },
  { path: 'apply-tracker', component: TrackerApplyComponent },
  { path: 'frame-labeler', component: FrameLabelerComponent },
  { path: 'training-result', component: TrainingResultComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { VideoUploadComponent } from './pages/video-upload/video-upload.component';
import { TrackerApplyComponent } from './pages/tracker-apply/tracker-apply.component';
import { FrameLabelerComponent } from './pages/frame-labeler/frame-labeler.component';
import { TrainingResultComponent } from './pages/training-result/training-result.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    VideoUploadComponent,
    TrackerApplyComponent,
    FrameLabelerComponent,
    TrainingResultComponent
  ],
  imports: [
    BrowserModule, HttpClientModule, FormsModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

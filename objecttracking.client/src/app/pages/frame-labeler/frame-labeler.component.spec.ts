import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FrameLabelerComponent } from './frame-labeler.component';

describe('FrameLabelerComponent', () => {
  let component: FrameLabelerComponent;
  let fixture: ComponentFixture<FrameLabelerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FrameLabelerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FrameLabelerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

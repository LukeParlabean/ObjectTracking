import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackerApplyComponent } from './tracker-apply.component';

describe('TrackerApplyComponent', () => {
  let component: TrackerApplyComponent;
  let fixture: ComponentFixture<TrackerApplyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TrackerApplyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrackerApplyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

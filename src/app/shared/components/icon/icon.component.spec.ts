import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'home');
  });

  it('should render the ligature and carry the icon font class', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent?.trim()).toBe('home');
    expect(host.classList.contains('material-icons')).toBeTrue();
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });
});

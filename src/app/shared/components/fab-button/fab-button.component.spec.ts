import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FabButtonComponent } from './fab-button.component';

describe('FabButtonComponent', () => {
  let fixture: ComponentFixture<FabButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FabButtonComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FabButtonComponent);
    fixture.componentRef.setInput('icon', 'add');
    fixture.componentRef.setInput('label', 'Agregar');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a button that emits when there is no link', () => {
    fixture.detectChanges();
    const emitted: unknown[] = [];
    fixture.componentInstance.action.subscribe(() => emitted.push(true));

    const button = fixture.nativeElement.querySelector('button.fab') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();

    expect(emitted.length).toBe(1);
  });

  it('should render a link when a target is given', () => {
    fixture.componentRef.setInput('link', '/payments');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a.fab')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button.fab')).toBeNull();
  });
});

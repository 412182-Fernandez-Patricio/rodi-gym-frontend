import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MemberDetailComponent } from './member-detail.component';
import { PageHeaderService } from '../../../../shared/services/page-header.service';

describe('MemberDetailComponent', () => {
  let fixture: ComponentFixture<MemberDetailComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '30111222' }) } },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MemberDetailComponent);
  });

  afterEach(() => httpMock.verify());

  it('should render the member and publish the header title', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/members/30111222').flush({
      id: 30111222,
      name: 'Ana',
      last_name: 'Garcia',
      phone_number: '3512345678',
      status: true,
      expiration_date: '2099-09-01',
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ana Garcia');
    expect(text).toContain('30.111.222');
    expect(text).toContain('01/09/2099');
    expect(TestBed.inject(PageHeaderService).title()).toBe('Perfil - Ana Garcia');
    expect(TestBed.inject(PageHeaderService).backLink()).toBe('/members');
  });

  it('should show a message when the request fails', () => {
    fixture.detectChanges();

    httpMock
      .expectOne('/api/members/30111222')
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No se pudo cargar el socio',
    );
  });
});

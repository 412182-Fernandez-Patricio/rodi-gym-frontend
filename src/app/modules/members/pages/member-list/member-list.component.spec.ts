import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MemberListComponent } from './member-list.component';
import { caseConversionInterceptor } from '../../../../shared/interceptors/case-conversion.interceptor';

describe('MemberListComponent', () => {
  let fixture: ComponentFixture<MemberListComponent>;
  let httpMock: HttpTestingController;

  const member = (id: number, name: string, lastName: string) => ({
    id,
    name,
    last_name: lastName,
    phone_number: '351',
    status: true,
    expiration_date: '2099-01-01',
  });

  const pageOf = (content: unknown[], overrides: Record<string, unknown> = {}) => ({
    content,
    page: 0,
    size: 20,
    total_elements: content.length,
    total_pages: 1,
    last: true,
    ...overrides,
  });

  const membersRequest = () => httpMock.expectOne((req) => req.url === '/api/members');
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const chip = (label: string): HTMLButtonElement =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label,
    ) as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MemberListComponent);
  });

  afterEach(() => httpMock.verify({ ignoreCancelled: true }));

  it('should ask with no filters on entry', fakeAsync(() => {
    fixture.detectChanges();
    tick(300);

    const request = membersRequest();
    expect(request.request.params.has('search')).toBeFalse();
    expect(request.request.params.has('status')).toBeFalse();
    expect(request.request.params.get('size')).toBe('20');

    request.flush(pageOf([member(1, 'Ana', 'Garcia')]));
    fixture.detectChanges();
    expect(text()).toContain('Ana Garcia');
  }));

  it('should send the status of the chip in upper case', fakeAsync(() => {
    fixture.detectChanges();
    tick(300);
    membersRequest().flush(pageOf([]));
    fixture.detectChanges();

    chip('Deudores').click();
    fixture.detectChanges();
    tick(300);

    const request = membersRequest();
    expect(request.request.params.get('status')).toBe('EXPIRED');
    request.flush(pageOf([]));
  }));

  it('should wait for a pause before searching, and ask only once', fakeAsync(() => {
    fixture.detectChanges();
    tick(300);
    membersRequest().flush(pageOf([]));
    fixture.detectChanges();

    // detectChanges tras cada tecla: toObservable se alimenta de un effect, que
    // se vacia en la deteccion de cambios. Al tipear de verdad eso pasa solo.
    fixture.componentInstance.onSearch('a');
    fixture.detectChanges();
    tick(100);
    fixture.componentInstance.onSearch('an');
    fixture.detectChanges();
    tick(100);
    fixture.componentInstance.onSearch('ana');
    fixture.detectChanges();
    tick(300);

    const request = membersRequest();
    expect(request.request.params.get('search')).toBe('ana');
    request.flush(pageOf([member(1, 'Ana', 'Garcia')]));
  }));

  it('should append the next page instead of replacing it', fakeAsync(() => {
    fixture.detectChanges();
    tick(300);
    membersRequest().flush(
      pageOf([member(1, 'Ana', 'Garcia')], { last: false, total_elements: 2 }),
    );
    fixture.detectChanges();

    fixture.componentInstance.loadMore();
    const request = membersRequest();
    expect(request.request.params.get('page')).toBe('1');
    request.flush(pageOf([member(2, 'Beto', 'Lopez')], { total_elements: 2 }));
    fixture.detectChanges();

    expect(text()).toContain('Ana Garcia');
    expect(text()).toContain('Beto Lopez');
  }));

  it('should replace the list when the filter changes', fakeAsync(() => {
    fixture.detectChanges();
    tick(300);
    membersRequest().flush(pageOf([member(1, 'Ana', 'Garcia')]));
    fixture.detectChanges();

    chip('Inactivos').click();
    fixture.detectChanges();
    tick(300);
    membersRequest().flush(pageOf([member(2, 'Beto', 'Lopez')]));
    fixture.detectChanges();

    expect(text()).toContain('Beto Lopez');
    expect(text()).not.toContain('Ana Garcia');
  }));

  it('should not skip a page when loading more fails', fakeAsync(() => {
    fixture.detectChanges();
    tick(300);
    membersRequest().flush(pageOf([member(1, 'Ana', 'Garcia')], { last: false }));
    fixture.detectChanges();

    fixture.componentInstance.loadMore();
    membersRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    fixture.componentInstance.loadMore();
    const retry = membersRequest();
    expect(retry.request.params.get('page')).toBe('1');
    retry.flush(pageOf([member(2, 'Beto', 'Lopez')]));
  }));
});

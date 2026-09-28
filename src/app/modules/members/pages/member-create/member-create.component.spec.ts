import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MemberCreateComponent } from './member-create.component';
import { routes } from '../../../../app.routes';
import { PageHeaderService } from '../../../../shared/services/page-header.service';
import { caseConversionInterceptor } from '../../../../shared/interceptors/case-conversion.interceptor';

describe('MemberCreateComponent', () => {
  let fixture: ComponentFixture<MemberCreateComponent>;
  let httpMock: HttpTestingController;
  let router: Router;

  const createdBody = {
    id: 40123456,
    name: 'Laura',
    last_name: 'Quiroga',
    phone_number: '3515550199',
    status: true,
    expiration_date: null,
  };

  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent ?? '';
  const input = (id: string) => element().querySelector(`#${id}`) as HTMLInputElement;
  const submitButton = () => element().querySelector('button[type="submit"]') as HTMLButtonElement;

  const type = (id: string, value: string) => {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };

  const fillValid = () => {
    type('dni', '40123456');
    type('name', 'Laura');
    type('lastName', 'Quiroga');
    type('phoneNumber', '3515550199');
  };

  const submit = () => {
    submitButton().click();
    fixture.detectChanges();
  };

  const createRequest = () =>
    httpMock.expectOne((req) => req.method === 'POST' && req.url === '/api/members');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberCreateComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(MemberCreateComponent);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('should take the header with a way back to the list', () => {
    const header = TestBed.inject(PageHeaderService);
    expect(header.title()).toBe('Nuevo socio');
    expect(header.backLink()).toBe('/members');
  });

  it('should not show errors before the fields are touched', () => {
    expect(text()).not.toContain('Ingresá');
  });

  it('should show the errors and not call the API when saving an empty form', () => {
    submit();

    expect(text()).toContain('Ingresá el DNI.');
    expect(text()).toContain('Ingresá el nombre.');
    expect(text()).toContain('Ingresá el apellido.');
    expect(text()).toContain('Ingresá el teléfono.');
    httpMock.expectNone('/api/members');
  });

  it('should show the error of a field once it is left', () => {
    type('name', '');

    expect(text()).toContain('Ingresá el nombre.');
    expect(text()).not.toContain('Ingresá el apellido.');
  });

  it('should reject a DNI that is not 7 or 8 digits', () => {
    for (const dni of ['123456', '123456789', '0123456', '40a23456']) {
      type('dni', dni);
      expect(text()).withContext(dni).toContain('El DNI tiene que tener 7 u 8 números.');
    }
  });

  it('should accept a DNI written with dots and send it as a number', () => {
    fillValid();
    type('dni', '40.123.456');
    expect(text()).not.toContain('El DNI tiene');

    submit();

    expect(createRequest().request.body).toEqual({
      id: 40123456,
      name: 'Laura',
      last_name: 'Quiroga',
      phone_number: '3515550199',
    });
  });

  it('should reject fields with only spaces and trim the rest', () => {
    fillValid();
    type('name', '   ');
    submit();

    expect(text()).toContain('Ingresá el nombre.');
    httpMock.expectNone('/api/members');

    type('name', '  Laura ');
    submit();

    expect(createRequest().request.body.name).toBe('Laura');
  });

  it('should send a single request while saving', () => {
    fillValid();
    submit();

    expect(submitButton().disabled).toBeTrue();
    expect(submitButton().textContent).toContain('Guardando…');

    submit();
    createRequest().flush(createdBody, { status: 201, statusText: 'Created' });
  });

  it('should go to the new profile replacing the form in the history', () => {
    fillValid();
    submit();
    createRequest().flush(createdBody, { status: 201, statusText: 'Created' });

    expect(router.navigate).toHaveBeenCalledWith(['/members', 40123456], { replaceUrl: true });
  });

  it('should mark a repeated DNI and link to that member', () => {
    fillValid();
    submit();
    createRequest().flush(
      { status: 409, error: 'Conflict', message: 'whatever the backend says' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(text()).toContain('Ya existe un socio con ese DNI.');
    const link = element().querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/members/40123456');
    expect(input('name').value).toBe('Laura');
    expect(submitButton().disabled).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should clear the repeated DNI error once the DNI changes', () => {
    fillValid();
    submit();
    createRequest().flush(null, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    type('dni', '40123457');

    expect(text()).not.toContain('Ya existe');
  });

  it('should show a general notice on a server error and keep the data', () => {
    fillValid();
    submit();
    createRequest().flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text()).toContain('No se pudo guardar el socio.');
    expect(input('dni').value).toBe('40123456');
    expect(submitButton().disabled).toBeFalse();
  });

  it('should show a general notice when there is no connection', () => {
    fillValid();
    submit();
    createRequest().error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(text()).toContain('No se pudo guardar el socio.');
  });
});

describe('members/new route', () => {
  it('should open the form and not the profile of a member called "new"', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const harness = await RouterTestingHarness.create('/members/new');

    const page = harness.fixture.nativeElement as HTMLElement;
    expect(page.querySelector('app-member-create')).not.toBeNull();
    expect(page.querySelector('app-member-detail')).toBeNull();
  });
});

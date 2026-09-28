import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MemberService } from './member.service';
import { Member } from '../models/member.model';
import { caseConversionInterceptor } from '../../../shared/interceptors/case-conversion.interceptor';

describe('MemberService', () => {
  let service: MemberService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(MemberService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should create a member sending the body in snake_case', () => {
    let created: Member | undefined;

    service
      .createMember({ id: 40123456, name: 'Laura', lastName: 'Quiroga', phoneNumber: '3515550199' })
      .subscribe((member) => (created = member));

    const request = httpMock.expectOne('/api/members');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      id: 40123456,
      name: 'Laura',
      last_name: 'Quiroga',
      phone_number: '3515550199',
    });

    request.flush(
      {
        id: 40123456,
        name: 'Laura',
        last_name: 'Quiroga',
        phone_number: '3515550199',
        status: true,
        expiration_date: null,
      },
      { status: 201, statusText: 'Created' },
    );

    expect(created?.lastName).toBe('Quiroga');
    expect(created?.expirationDate).toBeNull();
  });
});

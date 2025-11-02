import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RoutesDataService } from './routes-data.service';
import { environment } from '../../environments/environment';

describe('RoutesDataService', () => {
  let service: RoutesDataService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.baseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RoutesDataService]
    });
    service = TestBed.inject(RoutesDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getClients', () => {
    it('should return clients list', (done) => {
      const mockClients = [
        {
          id: 'C1',
          name: 'Cliente 1',
          address: 'Dirección 1',
          lat: 4.68,
          lng: -74.08,
          demand: 1
        },
        {
          id: 'C2',
          name: 'Cliente 2',
          address: 'Dirección 2',
          lat: 4.679,
          lng: -74.081,
          demand: 2
        }
      ];

      service.getClients().subscribe({
        next: (clients) => {
          expect(clients).toEqual(mockClients);
          expect(clients.length).toBe(2);
          expect(clients[0].id).toBe('C1');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}routes/clients`);
      expect(req.request.method).toBe('GET');
      req.flush(mockClients);
    });

    it('should handle error', (done) => {
      service.getClients().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}routes/clients`);
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });

    it('should handle empty response', (done) => {
      service.getClients().subscribe({
        next: (clients) => {
          expect(clients).toEqual([]);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}routes/clients`);
      req.flush([]);
    });
  });

  describe('getVehicles', () => {
    it('should return vehicles list', (done) => {
      const mockVehicles = [
        {
          id: 'V-01',
          capacity: 8,
          color: '#3f51b5',
          label: 'Vehículo 1'
        },
        {
          id: 'V-02',
          capacity: 8,
          color: '#e91e63',
          label: 'Vehículo 2'
        }
      ];

      service.getVehicles().subscribe({
        next: (vehicles) => {
          expect(vehicles).toEqual(mockVehicles);
          expect(vehicles.length).toBe(2);
          expect(vehicles[0].capacity).toBe(8);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}routes/vehicles`);
      expect(req.request.method).toBe('GET');
      req.flush(mockVehicles);
    });

    it('should handle error', (done) => {
      service.getVehicles().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}routes/vehicles`);
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });

    it('should handle empty response', (done) => {
      service.getVehicles().subscribe({
        next: (vehicles) => {
          expect(vehicles).toEqual([]);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}routes/vehicles`);
      req.flush([]);
    });
  });
});


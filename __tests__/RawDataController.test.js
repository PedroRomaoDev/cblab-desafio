import { RawDataController } from '../src/controllers/raw-data.js';
import { ValidationError } from '../src/errors/validation.js';

describe('RawZoneController', () => {
  let rawDataUseCaseMock;
  let req;
  let res;
  let controller;

  beforeEach(() => {
    rawDataUseCaseMock = {
      execute: jest.fn(),
    };

    req = {
      query: {
        apiName: 'getFiscalInvoice',
        busDt: '2025-07-29',
        storeId: 'store_001',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    controller = new RawDataController(rawDataUseCaseMock);
  });

  it('deve retornar 200 e os dados quando encontrados', async () => {
    const mockData = [{ id: 1, info: 'dados' }];
    rawDataUseCaseMock.execute.mockResolvedValue(mockData);

    await controller.getRawData(req, res);

    expect(rawDataUseCaseMock.execute).toHaveBeenCalledWith(
      'getFiscalInvoice',
      '2025-07-29',
      'store_001',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockData);
  });

  it('deve retornar 404 quando nenhum dado for encontrado', async () => {
    rawDataUseCaseMock.execute.mockResolvedValue([]);

    await controller.getRawData(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message:
        'Nenhuns dados brutos encontrados para getFiscalInvoice/2025-07-29/store_001.',
    });
  });

  it('deve retornar 400 se ocorrer erro de validação', async () => {
    rawDataUseCaseMock.execute.mockRejectedValue(
      new ValidationError('Parâmetros inválidos'),
    );

    await controller.getRawData(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Parâmetros inválidos',
    });
  });

  it('deve retornar 500 se ocorrer erro inesperado', async () => {
    rawDataUseCaseMock.execute.mockRejectedValue(
      new Error('Erro de banco de dados'),
    );

    await controller.getRawData(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Erro interno do servidor ao buscar dados brutos.',
    });
  });
});

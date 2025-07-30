import { QueryDataController } from '../src/controllers/query-data.js';
import { ValidationError } from '../src/errors/validation.js';

// Mocks auxiliares
const mockRequest = (params = {}, body = {}) => ({ params, body });
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('QueryDataController', () => {
  let queryDataUseCaseMock;
  let controller;

  beforeEach(() => {
    queryDataUseCaseMock = {
      execute: jest.fn(),
    };
    controller = new QueryDataController(queryDataUseCaseMock);
  });

  it('deve retornar status 200 com dados processados válidos', async () => {
    const req = mockRequest(
      { apiName: 'getGuestChecks' },
      { busDt: '2023-01-01', storeId: 'store_001' },
    );
    const res = mockResponse();
    const mockData = [{ id: 1, name: 'guest1' }];

    queryDataUseCaseMock.execute.mockResolvedValue(mockData);

    await controller.execute(req, res);

    expect(queryDataUseCaseMock.execute).toHaveBeenCalledWith(
      'getGuestChecks',
      {
        busDt: '2023-01-01',
        storeId: 'store_001',
      },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockData);
  });

  it('deve retornar status 404 quando nenhum dado é encontrado', async () => {
    const req = mockRequest(
      { apiName: 'getGuestChecks' },
      { busDt: '2023-01-01', storeId: 'store_999' },
    );
    const res = mockResponse();

    queryDataUseCaseMock.execute.mockResolvedValue([]);

    await controller.execute(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining(
        'Nenhum dado processado encontrado para getGuestChecks com os filtros fornecidos.',
      ),
    });
  });

  it('deve retornar status 400 se apiName estiver ausente ou inválido', async () => {
    const req = mockRequest(
      { apiName: '' },
      { busDt: '2023-01-01', storeId: 'store_001' },
    );
    const res = mockResponse();

    await controller.execute(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining('Nome da API inválido'),
    });
  });

  it('deve retornar status 500 em caso de erro inesperado', async () => {
    const req = mockRequest(
      { apiName: 'getGuestChecks' },
      { busDt: '2023-01-01', storeId: 'store_001' },
    );
    const res = mockResponse();

    queryDataUseCaseMock.execute.mockRejectedValue(
      new Error('Erro inesperado'),
    );

    await controller.execute(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Erro interno do servidor ao buscar dados processados.',
    });
  });

  it('deve retornar status 400 se o Use Case lançar um ValidationError', async () => {
    const req = mockRequest(
      { apiName: 'getGuestChecks' },
      { busDt: 'invalid-date' },
    );
    const res = mockResponse();

    queryDataUseCaseMock.execute.mockRejectedValue(
      new ValidationError('Data inválida'),
    );

    await controller.execute(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Data inválida',
    });
  });
});

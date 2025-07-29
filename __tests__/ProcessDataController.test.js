import { ProcessDataController } from '../src/controllers/process-data.js';

beforeAll(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.info.mockRestore();
  console.warn.mockRestore();
  console.error.mockRestore();
});

describe('ProcessDataController', () => {
  let mockUseCase;
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn().mockResolvedValue({
        status: 'success',
        message: 'Processamento de dados iniciado com sucesso.',
        processedCount: 10,
      }),
    };

    controller = new ProcessDataController(mockUseCase);

    mockReq = {
      body: {
        apiName: 'getGuestChecks',
        busDt: '2020-07-31',
        storeId: 'store_002',
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test('deve retornar 202 quando o processamento for iniciado com sucesso', async () => {
    await controller.execute(mockReq, mockRes);

    expect(mockUseCase.execute).toHaveBeenCalledWith(mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(202);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Processamento de dados iniciado com sucesso.',
      processedCount: 10,
    });
  });

  test('deve retornar 500 com mensagem contextualizada do Use Case', async () => {
    mockUseCase.execute.mockRejectedValue(
      new Error('Falha no Use Case de Processamento: erro no disco'),
    );

    await controller.execute(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Falha no Use Case de Processamento: erro no disco',
    });
  });

  test('deve retornar 500 com erro genérico se erro não for do Use Case', async () => {
    mockUseCase.execute.mockRejectedValue(
      new Error('Erro inesperado no sistema de arquivos'),
    );

    await controller.execute(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Erro interno do servidor ao processar dados.',
    });
  });

  test('deve lançar erro se instanciado sem use case', () => {
    expect(() => new ProcessDataController()).toThrow(
      'ProcessDataController requires a ProcessDataUseCase instance.',
    );
  });
});

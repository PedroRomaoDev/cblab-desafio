import { ItemQueryController } from '../src/controllers/item-query.js';
import { ValidationError } from '../src/errors/validation.js';

describe('ItemQueryController', () => {
  let mockItemQueryUseCase;
  let controller;
  let req;
  let res;

  beforeEach(() => {
    mockItemQueryUseCase = {
      execute: jest.fn(),
    };

    controller = new ItemQueryController(mockItemQueryUseCase);

    req = {
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('deve retornar 400 se o ID estiver ausente', async () => {
    req.body = {}; // sem id

    await controller.execute(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'ID do item inválido ou ausente no corpo da requisição.',
    });
  });

  it('deve retornar 400 se o ID for uma string vazia', async () => {
    req.body = { id: '  ' };

    await controller.execute(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'ID do item inválido ou ausente no corpo da requisição.',
    });
  });

  it('deve retornar 200 com os dados do item se encontrado', async () => {
    const item = { id: 'GC-20250729-001A', value: 42 };
    mockItemQueryUseCase.execute.mockResolvedValue(item);
    req.body = { id: 'GC-20250729-001A' };

    await controller.execute(req, res);

    expect(mockItemQueryUseCase.execute).toHaveBeenCalledWith(
      'GC-20250729-001A',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(item);
  });

  it('deve retornar 404 se o item não for encontrado', async () => {
    mockItemQueryUseCase.execute.mockResolvedValue(null);
    req.body = { id: 'GC-20250729-001A' };

    await controller.execute(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: `Item com ID 'GC-20250729-001A' não encontrado nos dados processados.`,
    });
  });

  it('deve retornar 500 se ocorrer um erro inesperado', async () => {
    mockItemQueryUseCase.execute.mockRejectedValue(
      new Error('Erro inesperado'),
    );
    req.body = { id: 'GC-20250729-001A' };

    await controller.execute(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Erro interno do servidor ao buscar item.',
    });
  });
  it('deve retornar 400 se o use case lançar ValidationError', async () => {
    const error = new ValidationError('ID inválido no use case');
    mockItemQueryUseCase.execute.mockRejectedValue(error);

    req.body = { id: 'ID-FALSO' };

    await controller.execute(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'ID inválido no use case',
    });
  });
});

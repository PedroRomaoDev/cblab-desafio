// __tests__/ItemQueryUseCase.test.js

import { ItemQueryUseCase } from '../src/usecases/item-query.js';
import { ValidationError } from '../src/errors/validation.js';

describe('ItemQueryUseCase', () => {
  let mockRepository;
  let useCase;

  beforeEach(() => {
    mockRepository = {
      getItemById: jest.fn(),
    };
    useCase = new ItemQueryUseCase(mockRepository);
  });

  it('deve lançar erro se nenhum repositório for passado', () => {
    expect(() => new ItemQueryUseCase(null)).toThrow(
      'ItemQueryUseCase requires a ProcessedDataRepository instance.',
    );
  });

  it('deve lançar ValidationError se ID for inválido (nulo)', async () => {
    await expect(useCase.execute(null)).rejects.toThrow(ValidationError);
  });

  it('deve lançar ValidationError se ID for string vazia', async () => {
    await expect(useCase.execute('')).rejects.toThrow(ValidationError);
  });

  it('deve chamar getItemById com o ID correto', async () => {
    const fakeItem = { id: '123', name: 'Item Teste' };
    mockRepository.getItemById.mockResolvedValue(fakeItem);

    const result = await useCase.execute('123');

    expect(mockRepository.getItemById).toHaveBeenCalledWith('123');
    expect(result).toEqual(fakeItem);
  });

  it('deve retornar null se item não for encontrado', async () => {
    mockRepository.getItemById.mockResolvedValue(null);
    const result = await useCase.execute('999');
    expect(result).toBeNull();
  });

  it('deve relançar erro de ValidationError vindo do repositório', async () => {
    const validationError = new ValidationError('Erro interno');
    mockRepository.getItemById.mockRejectedValue(validationError);

    await expect(useCase.execute('123')).rejects.toThrow(ValidationError);
  });

  it('deve lançar erro genérico se repositório falhar', async () => {
    mockRepository.getItemById.mockRejectedValue(new Error('Erro inesperado'));

    await expect(useCase.execute('123')).rejects.toThrow(
      'Falha na busca por item: Erro inesperado',
    );
  });
});

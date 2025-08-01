import { QueryDataUseCase } from '../src/usecases/query-data.js';
import { ValidationError } from '../src/errors/validation.js';

describe('QueryDataUseCase', () => {
  let mockRepository;
  let useCase;

  beforeEach(() => {
    mockRepository = {
      getByApiDateStore: jest.fn(),
    };
    useCase = new QueryDataUseCase(mockRepository);
  });

  test('deve lançar ValidationError se apiName estiver ausente', async () => {
    await expect(useCase.execute(null)).rejects.toThrow(ValidationError);
  });

  test('deve lançar ValidationError se apiName não for uma string', async () => {
    await expect(useCase.execute(123)).rejects.toThrow(ValidationError);
  });

  test('deve lançar ValidationError se apiName for uma string vazia', async () => {
    await expect(useCase.execute('   ')).rejects.toThrow(ValidationError);
  });

  test('deve lançar ValidationError para tipo inválido de busDt', async () => {
    await expect(
      useCase.execute('getGuestChecks', { busDt: 20230728 }),
    ).rejects.toThrow(ValidationError);
  });

  test('deve lançar ValidationError para formato inválido de busDt', async () => {
    await expect(
      useCase.execute('getGuestChecks', { busDt: '28-07-2023' }),
    ).rejects.toThrow(ValidationError);
  });

  test('deve lançar ValidationError para storeId vazio', async () => {
    await expect(
      useCase.execute('getGuestChecks', { storeId: ' ' }),
    ).rejects.toThrow(ValidationError);
  });

  test('deve chamar o repositório com os parâmetros corretos', async () => {
    const expectedData = [{ some: 'value' }];
    mockRepository.getByApiDateStore.mockResolvedValue(expectedData);

    const result = await useCase.execute('getGuestChecks', {
      busDt: '2023-07-28',
      storeId: '001',
    });

    expect(mockRepository.getByApiDateStore).toHaveBeenCalledWith(
      'getGuestChecks',
      '2023-07-28',
      '001',
    );
    expect(result).toEqual(expectedData);
  });

  test('deve retornar dados quando nenhum filtro for fornecido', async () => {
    const expectedData = [{ x: 1 }];
    mockRepository.getByApiDateStore.mockResolvedValue(expectedData);

    const result = await useCase.execute('getGuestChecks');

    expect(mockRepository.getByApiDateStore).toHaveBeenCalledWith(
      'getGuestChecks',
      undefined,
      undefined,
    );
    expect(result).toEqual(expectedData);
  });

  test('deve relançar ValidationError do repositório', async () => {
    const validationError = new ValidationError(
      'Validação do repositório falhou',
    );
    mockRepository.getByApiDateStore.mockRejectedValue(validationError);

    await expect(useCase.execute('getGuestChecks')).rejects.toThrow(
      ValidationError,
    );
  });

  test('deve encapsular erros desconhecidos do repositório', async () => {
    mockRepository.getByApiDateStore.mockRejectedValue(
      new Error('Falha inesperada'),
    );

    await expect(useCase.execute('getGuestChecks')).rejects.toThrow(
      'Falha na consulta de dados: Falha inesperada',
    );
  });
});

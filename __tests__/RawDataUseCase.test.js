import { RawDataUseCase } from '../src/usecases/raw-data.js';
import { ValidationError } from '../src/errors/validation.js';

describe('RawDataUseCase', () => {
  let rawDataRepositoryMock;
  let useCase;

  beforeEach(() => {
    rawDataRepositoryMock = {
      getByApiDateStore: jest.fn(),
    };
    useCase = new RawDataUseCase(rawDataRepositoryMock);
  });

  test('deve lançar erro se o repositório não for fornecido', () => {
    expect(() => new RawDataUseCase()).toThrow(
      'RawDataUseCase requires a RawDataRepository instance.',
    );
  });

  test('deve lançar ValidationError se apiName for inválido', async () => {
    await expect(useCase.execute('', '2024-01-01', '123')).rejects.toThrow(
      ValidationError,
    );
    await expect(useCase.execute(null, '2024-01-01', '123')).rejects.toThrow(
      ValidationError,
    );
  });

  test('deve lançar ValidationError se busDt for inválido', async () => {
    await expect(
      useCase.execute('getFiscalInvoice', '', '123'),
    ).rejects.toThrow(ValidationError);
    await expect(
      useCase.execute('getFiscalInvoice', '20240101', '123'),
    ).rejects.toThrow(ValidationError);
  });

  test('deve lançar ValidationError se storeId for inválido', async () => {
    await expect(
      useCase.execute('getFiscalInvoice', '2024-01-01', ''),
    ).rejects.toThrow(ValidationError);
    await expect(
      useCase.execute('getFiscalInvoice', '2024-01-01', null),
    ).rejects.toThrow(ValidationError);
  });

  test('deve chamar o repositório com os parâmetros corretos', async () => {
    const fakeData = [{ id: 1 }];
    rawDataRepositoryMock.getByApiDateStore.mockResolvedValue(fakeData);

    const result = await useCase.execute(
      'getFiscalInvoice',
      '2024-01-01',
      '123',
    );

    expect(rawDataRepositoryMock.getByApiDateStore).toHaveBeenCalledWith(
      'getFiscalInvoice',
      '2024-01-01',
      '123',
    );
    expect(result).toEqual(fakeData);
  });

  test('deve relançar ValidationError vindo do repositório', async () => {
    rawDataRepositoryMock.getByApiDateStore.mockRejectedValue(
      new ValidationError('Erro no repositório'),
    );

    await expect(
      useCase.execute('getFiscalInvoice', '2024-01-01', '123'),
    ).rejects.toThrow(ValidationError);
  });

  test('deve lançar erro genérico com contexto se o repositório falhar com erro comum', async () => {
    rawDataRepositoryMock.getByApiDateStore.mockRejectedValue(
      new Error('Erro inesperado'),
    );

    await expect(
      useCase.execute('getFiscalInvoice', '2024-01-01', '123'),
    ).rejects.toThrow('Falha na consulta da Raw Zone: Erro inesperado');
  });
});

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

  test('should throw if repository is not provided', () => {
    expect(() => new QueryDataUseCase()).toThrow(
      'QueryDataUseCase requires a ProcessedDataRepository instance.',
    );
  });

  test('should throw ValidationError if apiName is missing', async () => {
    await expect(useCase.execute(null)).rejects.toThrow(ValidationError);
  });

  test('should throw ValidationError if apiName is not a string', async () => {
    await expect(useCase.execute(123)).rejects.toThrow(ValidationError);
  });

  test('should throw ValidationError if apiName is an empty string', async () => {
    await expect(useCase.execute('   ')).rejects.toThrow(ValidationError);
  });

  test('should throw ValidationError for invalid busDt type', async () => {
    await expect(
      useCase.execute('getGuestChecks', { busDt: 20230728 }),
    ).rejects.toThrow(ValidationError);
  });

  test('should throw ValidationError for invalid busDt format', async () => {
    await expect(
      useCase.execute('getGuestChecks', { busDt: '28-07-2023' }),
    ).rejects.toThrow(ValidationError);
  });

  test('should throw ValidationError for empty storeId', async () => {
    await expect(
      useCase.execute('getGuestChecks', { storeId: ' ' }),
    ).rejects.toThrow(ValidationError);
  });

  test('should call repository with correct parameters', async () => {
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

  test('should return data when no filters are provided', async () => {
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

  test('should rethrow ValidationError from repository', async () => {
    const validationError = new ValidationError('Repo validation failed');
    mockRepository.getByApiDateStore.mockRejectedValue(validationError);

    await expect(useCase.execute('getGuestChecks')).rejects.toThrow(
      ValidationError,
    );
  });

  test('should wrap unknown repository errors', async () => {
    mockRepository.getByApiDateStore.mockRejectedValue(
      new Error('Unexpected failure'),
    );

    await expect(useCase.execute('getGuestChecks')).rejects.toThrow(
      'Falha na consulta de dados: Unexpected failure',
    );
  });
});

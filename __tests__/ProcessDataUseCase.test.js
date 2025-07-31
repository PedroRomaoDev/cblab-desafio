import { ProcessDataUseCase } from '../src/usecases/process-data.js';
import { promises as fs } from 'fs';

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

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readdir: jest.fn(),
  },
}));

describe('ProcessDataUseCase', () => {
  const mockRawRepo = {
    getByApiDateStore: jest.fn(),
  };
  const mockProcessedRepo = {
    saveToProcessedZone: jest.fn(),
  };

  let useCase;

  beforeEach(() => {
    useCase = new ProcessDataUseCase(mockRawRepo, mockProcessedRepo);
    jest.clearAllMocks();
  });

  it('não deve processar se o caminho base da raw zone não existir', async () => {
    fs.access.mockRejectedValue({ code: 'ENOENT' });

    await expect(useCase.execute()).toBeTruthy();
    expect(fs.access).toHaveBeenCalled();
    expect(fs.readdir).not.toHaveBeenCalled();
  });

  it('deve lançar erro se fs.access falhar com erro diferente de ENOENT', async () => {
    fs.access.mockRejectedValue(new Error('Falha no disco'));

    await expect(useCase.execute()).rejects.toThrow(/Falha no Use Case/);
  });

  it('deve pular o processamento se nenhuma pasta de API for encontrada', async () => {
    fs.access.mockResolvedValue();
    fs.readdir.mockResolvedValue([]);

    await expect(useCase.execute()).toBeTruthy();
    expect(fs.readdir).toHaveBeenCalled();
  });

  it('deve transformar e salvar dados com caminho completo de processamento', async () => {
    fs.access.mockResolvedValue();
    fs.readdir
      .mockResolvedValueOnce([
        { isDirectory: () => true, name: 'getGuestChecks' },
      ])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '2024' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '07' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '15' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: 'store123' }]);

    mockRawRepo.getByApiDateStore.mockResolvedValue([{ id: 1, taxes: 10 }]);
    mockProcessedRepo.saveToProcessedZone.mockResolvedValue('/some/path');

    await useCase.execute();

    expect(mockRawRepo.getByApiDateStore).toHaveBeenCalledWith(
      'getGuestChecks',
      '2024-07-15',
      'store123',
    );
    expect(mockProcessedRepo.saveToProcessedZone).toHaveBeenCalledWith(
      'getGuestChecks',
      '2024-07-15',
      'store123',
      expect.arrayContaining([
        expect.objectContaining({
          taxation: 10,
          _processedAt: expect.any(String),
          _processorVersion: '1.0',
        }),
      ]),
    );
  });

  it('deve pular transformação se os dados brutos estiverem vazios', async () => {
    fs.access.mockResolvedValue();
    fs.readdir
      .mockResolvedValueOnce([{ isDirectory: () => true, name: 'apiX' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '2023' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '11' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '01' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: 'store99' }]);

    mockRawRepo.getByApiDateStore.mockResolvedValue([]);

    await useCase.execute();

    expect(mockProcessedRepo.saveToProcessedZone).not.toHaveBeenCalled();
  });

  it('deve processar apenas apiName, busDt e storeId filtrados', async () => {
    fs.access.mockResolvedValue();
    fs.readdir.mockResolvedValue([]);
    mockRawRepo.getByApiDateStore.mockResolvedValue([{ id: 1 }]);
    mockProcessedRepo.saveToProcessedZone.mockResolvedValue('/fake');

    await useCase.execute({
      apiName: 'getFiscalInvoice',
      busDt: '2023-01-02',
      storeId: 'storeX',
    });

    expect(mockRawRepo.getByApiDateStore).toHaveBeenCalledWith(
      'getFiscalInvoice',
      '2023-01-02',
      'storeX',
    );
  });

  it('deve lançar erro se saveToProcessedZone falhar', async () => {
    fs.access.mockResolvedValue();
    fs.readdir
      .mockResolvedValueOnce([{ isDirectory: () => true, name: 'apiX' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '2023' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '01' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '01' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: 'storeX' }]);

    mockRawRepo.getByApiDateStore.mockResolvedValue([{ id: 1 }]);
    mockProcessedRepo.saveToProcessedZone.mockRejectedValue(
      new Error('Disco cheio'),
    );

    await expect(useCase.execute()).rejects.toThrow('Disco cheio');
  });
});

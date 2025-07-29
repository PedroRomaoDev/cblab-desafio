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

  it('should not process if raw zone base path does not exist', async () => {
    fs.access.mockRejectedValue({ code: 'ENOENT' });

    await expect(useCase.execute()).toBeTruthy();
    expect(fs.access).toHaveBeenCalled();
    expect(fs.readdir).not.toHaveBeenCalled();
  });

  it('should throw if fs.access fails with non-ENOENT error', async () => {
    fs.access.mockRejectedValue(new Error('Disk failure'));

    await expect(useCase.execute()).rejects.toThrow(/Falha no Use Case/);
  });

  it('should skip processing if no API folders found', async () => {
    fs.access.mockResolvedValue();
    fs.readdir.mockResolvedValue([]); // No API folders

    await expect(useCase.execute()).toBeTruthy();
    expect(fs.readdir).toHaveBeenCalled();
  });

  it('should transform and save data with full processing path', async () => {
    fs.access.mockResolvedValue();
    fs.readdir
      .mockResolvedValueOnce([
        { isDirectory: () => true, name: 'getGuestChecks' },
      ]) // apiName
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '2024' }]) // year
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '07' }]) // month
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '15' }]) // day
      .mockResolvedValueOnce([{ isDirectory: () => true, name: 'store123' }]); // store

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

  it('should skip transformation if raw data is empty', async () => {
    fs.access.mockResolvedValue();
    fs.readdir
      .mockResolvedValueOnce([{ isDirectory: () => true, name: 'apiX' }]) // api
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '2023' }]) // year
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '11' }]) // month
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '01' }]) // day
      .mockResolvedValueOnce([{ isDirectory: () => true, name: 'store99' }]); // store

    mockRawRepo.getByApiDateStore.mockResolvedValue([]);

    await useCase.execute();

    expect(mockProcessedRepo.saveToProcessedZone).not.toHaveBeenCalled();
  });

  it('should only process filtered apiName and busDt/storeId', async () => {
    fs.access.mockResolvedValue();
    fs.readdir.mockResolvedValue([]); // won't be used due to filters
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

  it('should throw error if saveToProcessedZone fails', async () => {
    fs.access.mockResolvedValue();
    fs.readdir
      .mockResolvedValueOnce([{ isDirectory: () => true, name: 'apiX' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '2023' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '01' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: '01' }])
      .mockResolvedValueOnce([{ isDirectory: () => true, name: 'storeX' }]);

    mockRawRepo.getByApiDateStore.mockResolvedValue([{ id: 1 }]);
    mockProcessedRepo.saveToProcessedZone.mockRejectedValue(
      new Error('Disk full'),
    );

    await expect(useCase.execute()).rejects.toThrow('Disk full');
  });
});

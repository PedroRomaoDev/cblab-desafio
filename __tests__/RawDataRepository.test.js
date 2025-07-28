import { RawDataRepository } from '../src/repositories/raw-zone.js';
import { promises as fs } from 'fs';
import path from 'path';

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

// Mock do módulo fs.promises
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
  },
}));

describe('RawDataRepository', () => {
  const repo = new RawDataRepository();
  const apiName = 'getGuestChecks';
  const busDt = '2024-12-01';
  const storeId = '001';

  const fullPath = path.join(
    process.cwd(),
    'nodered_data',
    'raw',
    apiName,
    '2024',
    '12',
    '01',
    storeId,
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getByApiDateStore', () => {
    it('deve retornar dados válidos de arquivos JSON', async () => {
      fs.readdir.mockResolvedValue(['file1.json', 'file2.json']);
      fs.readFile
        .mockResolvedValueOnce(JSON.stringify([{ id: 1 }]))
        .mockResolvedValueOnce(JSON.stringify({ id: 2 }));

      const result = await repo.getByApiDateStore(apiName, busDt, storeId);

      expect(fs.readdir).toHaveBeenCalledWith(fullPath);
      expect(fs.readFile).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('deve ignorar arquivos JSON malformados com warning', async () => {
      fs.readdir.mockResolvedValue(['bad.json']);
      fs.readFile.mockResolvedValue('invalid json');

      const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation();

      const result = await repo.getByApiDateStore(apiName, busDt, storeId);

      expect(result).toEqual([]);
      expect(consoleWarnMock).toHaveBeenCalledWith(
        expect.stringContaining('Falha ao analisar JSON'),
        expect.any(String),
      );

      consoleWarnMock.mockRestore();
    });

    it('deve retornar array vazio se pasta não existir (ENOENT)', async () => {
      fs.readdir.mockRejectedValue({ code: 'ENOENT' });

      const consoleLogMock = jest.spyOn(console, 'log').mockImplementation();

      const result = await repo.getByApiDateStore(apiName, busDt, storeId);

      expect(result).toEqual([]);
      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('Nenhuma pasta encontrada'),
      );

      consoleLogMock.mockRestore();
    });

    it('deve lançar erro se falha não for ENOENT', async () => {
      fs.readdir.mockRejectedValue(new Error('Falha de permissão'));

      await expect(
        repo.getByApiDateStore(apiName, busDt, storeId),
      ).rejects.toThrow('Falha ao acessar Raw Zone: Falha de permissão');
    });
  });

  describe('saveToRawZone', () => {
    it('deve criar diretório e salvar arquivo com dados', async () => {
      const data = [{ produto: 'café' }];
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const result = await repo.saveToRawZone(apiName, busDt, storeId, data);

      expect(fs.mkdir).toHaveBeenCalledWith(fullPath, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('data_'), // nome do arquivo
        JSON.stringify(data, null, 2),
        'utf8',
      );
      expect(result).toMatch(
        new RegExp(`^${fullPath.replace(/\\/g, '\\\\')}.*\\.json$`),
      );
    });
  });
});

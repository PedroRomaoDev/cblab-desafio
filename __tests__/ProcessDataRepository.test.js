import { ProcessedDataRepository } from '../src/repositories/processed-data.js'; // ajuste o caminho conforme seu projeto
import fs from 'fs';
import path from 'path';

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

// Mock do fs.promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

const mockFs = fs.promises;

describe('ProcessedDataRepository', () => {
  const repo = new ProcessedDataRepository();
  const basePath = repo.basePath;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveToProcessedZone', () => {
    it('deve criar diretório e salvar arquivo com dados JSON', async () => {
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();

      const apiName = 'api-test';
      const busDt = '2023-07-27';
      const storeId = 'store123';
      const data = [{ foo: 'bar' }];

      const resultPath = await repo.saveToProcessedZone(
        apiName,
        busDt,
        storeId,
        data,
      );

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(
          process.cwd(),
          'nodered_data',
          'data',
          'processed',
          apiName,
          '2023',
          '07',
          '27',
          storeId,
        ),
        { recursive: true },
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join(storeId, 'processed_data_')),
        JSON.stringify(data, null, 2),
        'utf8',
      );

      expect(typeof resultPath).toBe('string');
      expect(resultPath).toContain('processed_data_');
    });
  });

  describe('getByApiDateStore', () => {
    it('deve retornar todos dados JSON encontrados na pasta (recursivo)', async () => {
      // Simular estrutura de pastas e arquivos JSON
      mockFs.readdir.mockImplementation(async (dirPath, options) => {
        if (!options?.withFileTypes) return [];
        if (dirPath.endsWith('api-test')) {
          return [
            { name: '2023', isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith(path.join('api-test', '2023'))) {
          return [{ name: '07', isDirectory: () => true, isFile: () => false }];
        }
        if (dirPath.endsWith(path.join('api-test', '2023', '07'))) {
          return [{ name: '27', isDirectory: () => true, isFile: () => false }];
        }
        if (dirPath.endsWith(path.join('api-test', '2023', '07', '27'))) {
          return [
            { name: 'store123', isDirectory: () => true, isFile: () => false },
          ];
        }
        if (
          dirPath.endsWith(
            path.join('api-test', '2023', '07', '27', 'store123'),
          )
        ) {
          return [
            {
              name: 'file1.json',
              isDirectory: () => false,
              isFile: () => true,
            },
            {
              name: 'file2.json',
              isDirectory: () => false,
              isFile: () => true,
            },
          ];
        }
        return [];
      });

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify([{ id: 1 }]))
        .mockResolvedValueOnce(JSON.stringify({ id: 2 }));

      const result = await repo.getByApiDateStore(
        'api-test',
        '2023-07-27',
        'store123',
      );
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('deve ignorar arquivos JSON inválidos com aviso', async () => {
      console.warn = jest.fn();

      mockFs.readdir.mockResolvedValue([
        { name: 'badfile.json', isDirectory: () => false, isFile: () => true },
        { name: 'goodfile.json', isDirectory: () => false, isFile: () => true },
      ]);
      mockFs.readFile
        .mockResolvedValueOnce('{"invalid": ') // inválido
        .mockResolvedValueOnce(JSON.stringify([{ id: 'ok' }]));

      const result = await repo.getByApiDateStore('api-test');
      expect(result).toEqual([{ id: 'ok' }]);
      expect(console.warn).toHaveBeenCalled();

      console.warn.mockRestore();
    });

    it('deve retornar array vazio se pasta não existir (erro ENOENT)', async () => {
      const error = new Error('not found');
      error.code = 'ENOENT';
      mockFs.readdir.mockRejectedValue(error);

      const result = await repo.getByApiDateStore('api-inexistente');
      expect(result).toEqual([]);
    });

    it('deve lançar erro para outros erros não tratados', async () => {
      const error = new Error('fail');
      mockFs.readdir.mockRejectedValue(error);

      await expect(repo.getByApiDateStore('api-error')).rejects.toThrow('fail');
    });
  });

  describe('getItemById', () => {
    it('deve retornar item encontrado por id', async () => {
      mockFs.readdir.mockImplementation(async (dirPath) => {
        if (
          dirPath ===
          path.join(process.cwd(), 'nodered_data', 'data', 'processed')
        ) {
          return [
            { name: 'api1', isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith('api1')) {
          return [
            { name: 'file.json', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      mockFs.readFile.mockResolvedValue(
        JSON.stringify([{ id: 'abc123', name: 'found item' }]),
      );

      const item = await repo.getItemById('abc123');
      expect(item).toEqual({ id: 'abc123', name: 'found item' });
    });

    it('deve retornar null se item não for encontrado', async () => {
      mockFs.readdir.mockImplementation(async (dirPath) => {
        if (
          dirPath ===
          path.join(process.cwd(), 'nodered_data', 'data', 'processed')
        ) {
          return [
            { name: 'api1', isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith('api1')) {
          return [
            { name: 'file.json', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      mockFs.readFile.mockResolvedValue(JSON.stringify([{ id: 'other' }]));

      const item = await repo.getItemById('notfound');
      expect(item).toBeNull();
    });

    it('deve ignorar pastas que não podem ser lidas e continuar', async () => {
      mockFs.readdir.mockImplementation(async (dir) => {
        if (dir === basePath) {
          // raiz: retorna uma pasta 'api1'
          return [
            { name: 'api1', isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dir.includes('api1')) {
          // subpasta: lança erro que deve ser ignorado
          throw new Error('fail');
        }
        return [];
      });

      const result = await repo.getItemById('qualquer');
      expect(result).toBeNull(); // deve continuar e não lançar exceção
    });

    it('deve lançar erro se falha grave ocorrer', async () => {
      // Aqui o erro ocorre na raiz, deve lançar exceção
      mockFs.readdir.mockRejectedValue(new Error('fatal error'));

      await expect(repo.getItemById('any')).rejects.toThrow(
        'Falha ao buscar item por ID: fatal error',
      );
    });
  });
});

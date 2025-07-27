import { promises as fs } from 'fs';
import path from 'path';

/**
 * Repositório para acesso e escrita de dados na Processed Zone do Data Lake.
 * Implementa métodos para salvar e ler arquivos JSON processados.
 */
export class ProcessedDataRepository {
  // Certifique-se do 'export' aqui
  constructor() {
    this.basePath = path.join(
      process.cwd(),
      'nodered_data',
      'data',
      'processed',
    );
  }

  /**
   * Salva dados JSON processados em um arquivo na Processed Zone.
   * @param {string} apiName - O nome da API.
   * @param {string} busDt - A data de negócio (formato 'YYYY-MM-DD').
   * @param {string} storeId - O ID da loja.
   * @param {Array<Object>} data - Os dados processados a serem salvos.
   * @returns {Promise<string>} - O caminho do arquivo salvo.
   */
  async saveToProcessedZone(apiName, busDt, storeId, data) {
    const [year, month, day] = busDt.split('-');
    const outputDir = path.join(
      this.basePath,
      apiName,
      year,
      month,
      day,
      storeId,
    );
    await fs.mkdir(outputDir, { recursive: true });
    const outputFilePath = path.join(
      outputDir,
      `processed_data_${Date.now()}.json`,
    );
    await fs.writeFile(outputFilePath, JSON.stringify(data, null, 2), 'utf8');
    return outputFilePath;
  }

  /**
   * Lê todos os arquivos JSON de uma pasta específica na Processed Zone.
   * @param {string} apiName - O nome da API.
   * @param {string} [busDt] - Opcional: A data de negócio para filtrar.
   * @param {string} [storeId] - Opcional: O ID da loja para filtrar.
   * @returns {Promise<Array<Object>>} - Um array de objetos JSON lidos.
   */
  async getByApiDateStore(apiName, busDt, storeId) {
    let searchPath = path.join(this.basePath, apiName);
    let allData = [];

    // Refina o caminho da busca se busDt e storeId forem fornecidos
    if (busDt) {
      const [year, month, day] = busDt.split('-');
      searchPath = path.join(searchPath, year, month, day);
      if (storeId) {
        searchPath = path.join(searchPath, storeId);
      }
    }

    try {
      // Função recursiva para ler todos os JSONs em subdiretórios
      const readDirRecursive = async (currentPath) => {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          if (entry.isDirectory()) {
            await readDirRecursive(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.json')) {
            const fileContent = await fs.readFile(fullPath, 'utf8');
            try {
              const jsonData = JSON.parse(fileContent);
              allData = allData.concat(
                Array.isArray(jsonData) ? jsonData : [jsonData],
              );
            } catch (parseError) {
              console.warn(
                `[WARN] ProcessedDataRepository: Falha ao analisar JSON de ${fullPath}:`,
                parseError.message,
              );
            }
          }
        }
      };

      await readDirRecursive(searchPath);
      return allData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(
          `[INFO] ProcessedDataRepository: Nenhuma pasta encontrada para ${apiName} com os filtros.`,
        );
        return [];
      }
      console.error(
        `[ERROR] ProcessedDataRepository: Falha ao ler dados processados para ${apiName}:`,
        error,
      );
      throw new Error(`Falha ao acessar Processed Zone: ${error.message}`);
    }
  }

  /**
   * Busca um item específico por ID em todas as pastas da Processed Zone.
   * ATENÇÃO: Esta é uma busca ineficiente para grandes volumes de dados.
   * Em produção, seria otimizada com um banco de dados ou índice.
   * @param {string} id - O ID do item a ser buscado.
   * @returns {Promise<Object|null>} - O item encontrado ou null.
   */
  async getItemById(id) {
    let foundItem = null;
    try {
      const apiFolders = await fs.readdir(this.basePath);
      for (const apiName of apiFolders) {
        const apiPath = path.join(this.basePath, apiName);
        const findItemRecursive = async (currentPath) => {
          const entries = await fs.readdir(currentPath, {
            withFileTypes: true,
          });
          for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
              await findItemRecursive(fullPath);
              if (foundItem) return;
            } else if (entry.isFile() && entry.name.endsWith('.json')) {
              const fileContent = await fs.readFile(fullPath, 'utf8');
              try {
                const jsonData = JSON.parse(fileContent);
                const dataArray = Array.isArray(jsonData)
                  ? jsonData
                  : [jsonData];
                for (const item of dataArray) {
                  if (
                    item.id === id ||
                    item.guestCheckId === id ||
                    item.invoiceNumber === id ||
                    item.chargeBackId === id ||
                    item.transactionId === id ||
                    item.cashManagementId === id
                  ) {
                    foundItem = item;
                    return;
                  }
                }
              } catch (parseError) {
                console.warn(
                  `[WARN] ProcessedDataRepository: Falha ao analisar JSON de ${fullPath}:`,
                  parseError.message,
                );
              }
            }
          }
        };
        await findItemRecursive(apiPath);
        if (foundItem) break;
      }
      return foundItem;
    } catch (error) {
      console.error(
        `[ERROR] ProcessedDataRepository: Falha ao buscar item com ID '${id}':`,
        error,
      );
      throw new Error(`Falha ao buscar item por ID: ${error.message}`);
    }
  }
}

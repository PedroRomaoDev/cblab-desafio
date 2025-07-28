import { promises as fs } from 'fs';
import path from 'path';

export class ProcessedDataRepository {
  constructor() {
    this.basePath = path.join(process.cwd(), 'nodered_data', 'processed');
  }

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

    // Use Date.now() mas evite colisões se executar muito rápido: uma alternativa pode ser incluir nano time, ou um UUID
    const outputFilePath = path.join(
      outputDir,
      `processed_data_${Date.now()}.json`,
    );
    await fs.writeFile(outputFilePath, JSON.stringify(data, null, 2), 'utf8');
    return outputFilePath;
  }

  async getByApiDateStore(apiName, busDt, storeId) {
    let searchPath = path.join(this.basePath, apiName);
    if (busDt) {
      const [year, month, day] = busDt.split('-');
      searchPath = path.join(searchPath, year, month, day);
      if (storeId) searchPath = path.join(searchPath, storeId);
    }

    const allData = [];

    const readDirRecursive = async (currentPath) => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          await readDirRecursive(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const fileContent = await fs.readFile(fullPath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            allData.push(...(Array.isArray(jsonData) ? jsonData : [jsonData]));
          } catch (parseError) {
            console.warn(
              `[WARN] Falha ao analisar JSON em ${fullPath}: ${parseError.message}`,
            );
          }
        }
      }
    };

    try {
      await readDirRecursive(searchPath);
      return allData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Pasta não existe, retorna vazio — bom para casos com filtros inexistentes
        console.info(
          `[INFO] Pasta não encontrada para ${apiName} nos filtros indicados.`,
        );
        return [];
      }
      console.error(
        `[ERROR] Falha ao ler Processed Zone para ${apiName}:`,
        error,
      );
      throw new Error(`Falha ao acessar Processed Zone: ${error.message}`);
    }
  }

  async getItemById(id) {
    let foundItem = null;

    const findItemRecursive = async (currentPath) => {
      if (foundItem) return; // interrompe se já encontrou

      let entries;
      try {
        entries = await fs.readdir(currentPath, { withFileTypes: true });
      } catch {
        console.error('[INFO] Pasta não encontrada:', currentPath);
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          await findItemRecursive(fullPath);
          if (foundItem) return;
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const fileContent = await fs.readFile(fullPath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
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
              `[WARN] Falha ao analisar JSON em ${fullPath}: ${parseError.message}`,
            );
          }
        }
      }
    };

    try {
      const apiFolders = await fs.readdir(this.basePath, {
        withFileTypes: true,
      });
      for (const folder of apiFolders) {
        if (!folder.isDirectory()) continue;
        const apiPath = path.join(this.basePath, folder.name);
        await findItemRecursive(apiPath);
        if (foundItem) break;
      }
      return foundItem;
    } catch (error) {
      console.error(`[ERROR] Falha ao buscar item com ID '${id}':`, error);
      throw new Error(`Falha ao buscar item por ID: ${error.message}`);
    }
  }
}

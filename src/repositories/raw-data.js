// src/repositories/raw-data.js

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Repositório para acesso aos dados brutos na Raw Zone do Data Lake.
 * Implementa métodos para ler e salvar arquivos JSON.
 */
export class RawDataRepository {
  constructor() {
    // Define o caminho base para a Raw Zone
    // process.cwd() retorna o diretório de trabalho atual (que é /app dentro do contêiner Docker)
    this.basePath = path.join(process.cwd(), 'nodered_data', 'data', 'raw');
  }

  /**
   * Lê todos os arquivos JSON de uma pasta específica na Raw Zone.
   * @param {string} apiName - O nome da API (ex: 'getGuestChecks').
   * @param {string} busDt - A data de negócio (formato 'YYYY-MM-DD').
   * @param {string} storeId - O ID da loja.
   * @returns {Promise<Array<Object>>} - Um array de objetos JSON lidos.
   */
  async getByApiDateStore(apiName, busDt, storeId) {
    const [year, month, day] = busDt.split('-');
    const fullPath = path.join(
      this.basePath,
      apiName,
      year,
      month,
      day,
      storeId,
    );
    let allData = [];

    try {
      const files = await fs.readdir(fullPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(fullPath, file);
          const fileContent = await fs.readFile(filePath, 'utf8');
          try {
            const jsonData = JSON.parse(fileContent);
            // Concatena se for um array, ou adiciona o objeto se for único
            allData = allData.concat(
              Array.isArray(jsonData) ? jsonData : [jsonData],
            );
          } catch (parseError) {
            console.warn(
              `[WARN] RawDataRepository: Falha ao analisar JSON de ${filePath}:`,
              parseError.message,
            );
          }
        }
      }
      return allData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(
          `[INFO] RawDataRepository: Nenhuma pasta encontrada para ${apiName}/${busDt}/${storeId}`,
        );
        return []; // Retorna array vazio se a pasta não existir
      }
      console.error(
        `[ERROR] RawDataRepository: Falha ao ler dados de ${fullPath}:`,
        error,
      );
      throw new Error(`Falha ao acessar Raw Zone: ${error.message}`);
    }
  }
}

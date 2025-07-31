import { promises as fs } from 'fs';
import path from 'path';
export class RawDataRepository {
  constructor() {
    this.basePath = path.join(process.cwd(), 'nodered_data', 'raw');
  }

  /** JSDoc
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
        return [];
      }
      console.error(
        `[ERROR] RawDataRepository: Falha ao ler dados de ${fullPath}:`,
        error,
      );
      throw new Error(`Falha ao acessar Raw Zone: ${error.message}`);
    }
  }

  /** JSDoc
   * Salva dados JSON em um arquivo na Raw Zone.
   * Usado para simular o salvamento que o Node-RED faz.
   * @param {string} apiName - O nome da API.
   * @param {string} busDt - A data de negócio.
   * @param {string} storeId - O ID da loja.
   * @param {Array<Object>} data - Os dados a serem salvos.
   * @returns {Promise<string>} - O caminho do arquivo salvo.
   */
  async saveToRawZone(apiName, busDt, storeId, data) {
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
    const outputFilePath = path.join(outputDir, `data_${Date.now()}.json`);
    await fs.writeFile(outputFilePath, JSON.stringify(data, null, 2), 'utf8');
    return outputFilePath;
  }
}

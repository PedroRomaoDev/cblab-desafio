import { promises as fs } from 'fs';
import path from 'path';
import { ValidationError } from '../errors/validation.js'; // Importa ValidationError

/**
 * Use Case para processar dados brutos da Raw Zone e salvá-los na Processed Zone.
 * Contém a lógica de negócio de transformação.
 */
export class ProcessDataUseCase {
  // Define a lista de nomes de API válidos como uma propriedade estática
  static VALID_API_NAMES = [
    'getFiscalInvoice',
    'getGuestChecks',
    'getChargeBack',
    'getTransactions',
    'getCashManagementDetails',
  ];

  /**
   * @param {RawDataRepository} rawDataRepository - Repositório para ler dados brutos.
   * @param {ProcessedDataRepository} processedDataRepository - Repositório para salvar dados processados.
   */
  constructor(rawDataRepository, processedDataRepository) {
    if (!rawDataRepository || !processedDataRepository) {
      throw new Error(
        'ProcessDataUseCase requires RawDataRepository and ProcessedDataRepository instances.',
      );
    }
    this.rawDataRepository = rawDataRepository;
    this.processedDataRepository = processedDataRepository;
    this.rawZoneBasePath = path.join(process.cwd(), 'nodered_data', 'raw');
  }

  /**
   * Executa o processo de transformação de dados.
   * Pode processar todos os dados ou dados específicos com base em filtros.
   * @param {Object} [filters] - Filtros opcionais para processamento seletivo.
   * @param {string} [filters.busDt] - Data de negócio para processar (formato 'YYYY-MM-DD').
   * @param {string} [filters.busDtEnd] - Data de negócio final para processar (formato 'YYYY-MM-DD'). NOVO: Para range de datas.
   * @param {string} [filters.storeId] - ID da loja para processar.
   * @param {string} [filters.apiName] - Nome da API para processar.
   * @returns {Promise<{status: string, message: string, processedCount?: number}>} - Objeto com o resultado do processamento.
   */
  async execute(filters = {}) {
    console.log(
      `[INFO] ProcessDataUseCase: Iniciando processamento de dados com filtros:`,
      filters,
    );
    console.log(
      `[DEBUG] Filters received: apiName='${filters.apiName}', busDt='${filters.busDt}', storeId='${filters.storeId}'`,
    );

    const { busDt, busDtEnd, storeId, apiName } = filters;
    let totalProcessedCount = 0;
    const hasFiltersApplied =
      busDt !== undefined ||
      busDtEnd !== undefined ||
      storeId !== undefined ||
      apiName !== undefined;

    // **VALIDAÇÃO APRIMORADA: apiName**
    if (apiName !== undefined && apiName !== null) {
      if (typeof apiName !== 'string' || apiName.trim() === '') {
        throw new ValidationError(
          `Nome da API '${apiName}' inválido. Deve ser uma string não vazia.`,
        );
      }
      if (!ProcessDataUseCase.VALID_API_NAMES.includes(apiName)) {
        throw new ValidationError(
          `Nome da API '${apiName}' inválido. Nomes válidos são: ${ProcessDataUseCase.VALID_API_NAMES.join(', ')}.`,
        );
      }
    }

    // **VALIDAÇÃO APRIMORADA: busDt e busDtEnd**
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // Regex para formato YYYY-MM-DD
    if (busDt !== undefined && busDt !== null) {
      if (typeof busDt !== 'string' || !DATE_REGEX.test(busDt)) {
        throw new ValidationError(
          `Formato da data de negócio (busDt) '${busDt}' inválido. Use o formato YYYY-MM-DD.`,
        );
      }
    }
    if (busDtEnd !== undefined && busDtEnd !== null) {
      if (typeof busDtEnd !== 'string' || !DATE_REGEX.test(busDtEnd)) {
        throw new ValidationError(
          `Formato da data de negócio final (busDtEnd) '${busDtEnd}' inválido. Use o formato YYYY-MM-DD.`,
        );
      }
      if (busDt && busDtEnd < busDt) {
        throw new ValidationError(
          `A data final (busDtEnd) '${busDtEnd}' não pode ser anterior à data inicial (busDt) '${busDt}'.`,
        );
      }
    }

    // **VALIDAÇÃO APRIMORADA: storeId**
    if (storeId !== undefined && storeId !== null) {
      if (typeof storeId !== 'string' || storeId.trim() === '') {
        throw new ValidationError(
          `ID da loja (storeId) '${storeId}' inválido. Deve ser uma string não vazia.`,
        );
      }
    }
    // **FIM DAS VALIDAÇÕES APRIMORADAS**

    try {
      // Início do bloco try principal que captura erros fatais
      // 1. Verifica se a pasta rawZoneBasePath existe
      try {
        await fs.access(this.rawZoneBasePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.warn(
            `[WARN] ProcessDataUseCase: Raw Zone base path '${this.rawZoneBasePath}' não encontrada. Nenhuns dados para processar.`,
          );
          return {
            status: 'no_data_source',
            message: `Raw Zone base path '${this.rawZoneBasePath}' não encontrada.`,
          };
        }
        throw error;
      }

      // --- Lógica de Coleta de Caminhos para Processar ---
      const pathsToProcess = [];

      // Função auxiliar para listar diretórios de forma segura
      const listDirectories = async (currentPath) => {
        try {
          const entries = await fs.readdir(currentPath, {
            withFileTypes: true,
          });
          return entries.filter((e) => e.isDirectory()).map((e) => e.name);
        } catch (error) {
          if (error.code === 'ENOENT') {
            return []; // Retorna vazio se o diretório não existe (não é um erro fatal para listagem)
          }
          throw error; // Relança outros erros
        }
      };

      const apiFolders = apiName
        ? [apiName]
        : await listDirectories(this.rawZoneBasePath);
      let foundMatchingPathForFilters = false; // Flag para saber se os filtros apontam para caminhos existentes

      for (const currentApiName of apiFolders) {
        const apiPath = path.join(this.rawZoneBasePath, currentApiName);

        const yearFolders =
          busDt || busDtEnd
            ? [busDt ? busDt.substring(0, 4) : busDtEnd.substring(0, 4)]
            : await listDirectories(apiPath);

        for (const year of yearFolders) {
          const yearPath = path.join(apiPath, year);

          const monthFolders =
            busDt || busDtEnd
              ? [busDt ? busDt.substring(5, 7) : busDtEnd.substring(5, 7)]
              : await listDirectories(yearPath);

          for (const month of monthFolders) {
            const monthPath = path.join(yearPath, month);

            const dayFolders =
              busDt || busDtEnd
                ? [busDt ? busDt.substring(8, 10) : busDtEnd.substring(8, 10)]
                : await listDirectories(monthPath);

            for (const day of dayFolders) {
              const currentBusDt = `${year}-${month}-${day}`;

              // Filtragem de range de datas
              if (busDt && currentBusDt < busDt) continue;
              if (busDtEnd && currentBusDt > busDtEnd) continue;

              const dayPath = path.join(monthPath, day);

              const storeFolders = storeId
                ? [storeId]
                : await listDirectories(dayPath);

              for (const currentStoreId of storeFolders) {
                const fullStorePath = path.join(dayPath, currentStoreId);
                // Verifica se o caminho final da loja existe no disco
                try {
                  await fs.access(fullStorePath);
                  foundMatchingPathForFilters = true; // Pelo menos um caminho que corresponde aos filtros existe no disco
                  pathsToProcess.push({
                    apiName: currentApiName,
                    busDt: currentBusDt,
                    storeId: currentStoreId,
                  });
                } catch (error) {
                  if (error.code === 'ENOENT') {
                    // Caminho não encontrado, apenas ignora e continua
                    continue;
                  }
                  throw error; // Relança outros erros
                }
              }
            }
          }
        }
      }

      // --- Verificação de Caminhos Coletados ---
      if (pathsToProcess.length === 0) {
        if (hasFiltersApplied) {
          // Se filtros foram aplicados, mas nenhum caminho final com dados foi encontrado (diretórios vazios ou não correspondentes)
          // Usamos 'foundMatchingPathForFilters' para diferenciar entre filtro que não encontrou NENHUM caminho
          // e filtro que encontrou caminhos, mas eles estavam vazios.
          if (!foundMatchingPathForFilters) {
            return {
              status: 'filter_no_match',
              message:
                'Nenhum dado correspondente aos filtros fornecidos foi encontrado na Raw Zone.',
            };
          }
          // Se foundMatchingPathForFilters é true, mas pathsToProcess.length é 0, significa que os diretórios existiam, mas estavam vazios.
          return {
            status: 'success',
            message: `Processamento concluído. Total de 0 itens processados. Os diretórios existiam para os filtros, mas estavam vazios.`,
            processedCount: 0,
          };
        } else {
          // Se nenhum filtro e nenhuma pasta de API encontrada na Raw Zone
          console.log(
            '[INFO] ProcessDataUseCase: Nenhuma pasta de API encontrada na Raw Zone para processar.',
          );
          return {
            status: 'no_api_folders',
            message:
              'Nenhuma pasta de API encontrada na Raw Zone para processar.',
          };
        }
      }

      // --- Início do Loop de Processamento Real ---
      for (const pathInfo of pathsToProcess) {
        const {
          apiName: currentApiName,
          busDt: currentBusDt,
          storeId: currentStoreId,
        } = pathInfo;

        const rawData = await this.rawDataRepository.getByApiDateStore(
          currentApiName,
          currentBusDt,
          currentStoreId,
        );

        if (rawData.length === 0) {
          console.log(
            `[INFO] ProcessDataUseCase: Nenhuns dados brutos encontrados para ${currentApiName}/${currentBusDt}/${currentStoreId}.`,
          );
          continue;
        }

        let processedData = rawData.map((item) => {
          const newItem = { ...item };
          if (
            currentApiName === 'getGuestChecks' &&
            newItem.taxes !== undefined &&
            newItem.taxation === undefined
          ) {
            newItem.taxation = newItem.taxes;
            delete newItem.taxes;
          }
          return {
            ...newItem,
            _processedAt: new Date().toISOString(),
            _processorVersion: '1.0',
          };
        });
        totalProcessedCount += processedData.length;

        const outputPath =
          await this.processedDataRepository.saveToProcessedZone(
            currentApiName,
            currentBusDt,
            currentStoreId,
            processedData,
          );
        console.log(
          `[SUCCESS] ProcessDataUseCase: Dados processados e salvos em: ${outputPath}`,
        );
      }
      console.log(
        '[INFO] ProcessDataUseCase: Processamento de dados concluído.',
      );

      // Retorno final de sucesso
      return {
        status: 'success',
        message: `Processamento concluído. Total de ${totalProcessedCount} itens processados.`,
        processedCount: totalProcessedCount,
      };
    } catch (error) {
      // Este é o catch do try principal
      if (error instanceof ValidationError) {
        throw error; // Relança ValidationError para o Controller tratar
      }
      console.error(
        '[FATAL] ProcessDataUseCase: Ocorreu um erro durante o processamento de dados:',
        error,
      );
      throw new Error(`Falha no Use Case de Processamento: ${error.message}`);
    }
  }
}

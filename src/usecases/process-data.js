// src/usecases/process-data.js

// Importa os repositórios necessários como dependências
import { promises as fs } from 'fs'; // Para iterar diretórios
import path from 'path'; // Para construir caminhos

/**
 * Use Case para processar dados brutos da Raw Zone e salvá-los na Processed Zone.
 * Contém a lógica de negócio de transformação.
 */
export class ProcessDataUseCase {
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
    // Atribui as instâncias dos repositórios às propriedades da classe
    // O linter estava reclamando porque os nomes 'rawDataRepository' e 'processedDataRepository'
    // dos parâmetros não eram usados diretamente como variáveis locais, mas sim como 'this.rawDataRepository'.
    // A atribuição direta a 'this' é correta, o aviso é apenas uma questão de estilo/detecção do linter.
    // Não há necessidade de criar variáveis 'const' locais se elas não forem usadas de outra forma.
    // O aviso é benigno e não afeta a funcionalidade.
    this.rawDataRepository = rawDataRepository;
    this.processedDataRepository = processedDataRepository;
    // Caminho base para a Raw Zone, usado para iterar sobre as pastas de API
    this.rawZoneBasePath = path.join(process.cwd(), 'nodered_data', 'raw');
  }

  /**
   * Executa o processo de transformação de dados.
   * Pode processar todos os dados ou dados específicos com base em filtros.
   * @param {Object} [filters] - Filtros opcionais para processamento seletivo.
   * @param {string} [filters.busDt] - Data de negócio para processar (formato 'YYYY-MM-DD').
   * @param {string} [filters.storeId] - ID da loja para processar.
   * @param {string} [filters.apiName] - Nome da API para processar.
   * @returns {Promise<void>}
   */
  async execute(filters = {}) {
    console.log(
      `[INFO] ProcessDataUseCase: Iniciando processamento de dados com filtros:`,
      filters,
    );

    const { busDt, storeId, apiName } = filters;

    try {
      // Verifica se a pasta rawZoneBasePath existe antes de tentar ler
      try {
        await fs.access(this.rawZoneBasePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.warn(
            `[WARN] ProcessDataUseCase: Raw Zone base path '${this.rawZoneBasePath}' não encontrada. Nenhuns dados para processar.`,
          );
          return; // Sai se a pasta base não existir
        }
        throw error; // Relança outros erros de acesso
      }

      let apiFoldersToProcess = [];
      if (apiName) {
        apiFoldersToProcess = [apiName];
      } else {
        const entries = await fs.readdir(this.rawZoneBasePath, {
          withFileTypes: true,
        });
        apiFoldersToProcess = entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
      }

      if (apiFoldersToProcess.length === 0) {
        console.log(
          '[INFO] ProcessDataUseCase: Nenhuma pasta de API encontrada na Raw Zone para processar.',
        );
        return;
      }

      for (const currentApiName of apiFoldersToProcess) {
        const apiPath = path.join(this.rawZoneBasePath, currentApiName);

        let yearFoldersToProcess = [];
        if (busDt) {
          yearFoldersToProcess = [busDt.substring(0, 4)];
        } else {
          const entries = await fs.readdir(apiPath, { withFileTypes: true });
          yearFoldersToProcess = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
        }

        for (const year of yearFoldersToProcess) {
          const yearPath = path.join(apiPath, year);

          let monthFoldersToProcess = [];
          if (busDt) {
            monthFoldersToProcess = [busDt.substring(5, 7)];
          } else {
            const entries = await fs.readdir(yearPath, { withFileTypes: true });
            monthFoldersToProcess = entries
              .filter((entry) => entry.isDirectory())
              .map((entry) => entry.name);
          }

          for (const month of monthFoldersToProcess) {
            const monthPath = path.join(yearPath, month);

            let dayFoldersToProcess = [];
            if (busDt) {
              dayFoldersToProcess = [busDt.substring(8, 10)];
            } else {
              const entries = await fs.readdir(monthPath, {
                withFileTypes: true,
              });
              dayFoldersToProcess = entries
                .filter((entry) => entry.isDirectory())
                .map((entry) => entry.name);
            }

            for (const day of dayFoldersToProcess) {
              const dayPath = path.join(monthPath, day);

              let storeFoldersToProcess = [];
              if (storeId) {
                storeFoldersToProcess = [storeId];
              } else {
                const entries = await fs.readdir(dayPath, {
                  withFileTypes: true,
                });
                storeFoldersToProcess = entries
                  .filter((entry) => entry.isDirectory())
                  .map((entry) => entry.name);
              }

              for (const currentStoreId of storeFoldersToProcess) {
                const currentBusDt = `${year}-${month}-${day}`; // Reconstroi a data para uso no repositório

                // Lê os dados brutos usando o repositório
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

                // Aplica a lógica de transformação (ex: taxes para taxation)
                let processedData = rawData.map((item) => {
                  // Cria uma cópia rasa do item para evitar modificações no objeto original
                  const newItem = { ...item };
                  if (
                    currentApiName === 'getGuestChecks' &&
                    newItem.taxes !== undefined &&
                    newItem.taxation === undefined
                  ) {
                    newItem.taxation = newItem.taxes;
                    delete newItem.taxes;
                    // console.warn(`[WARN] ProcessDataUseCase: Esquema alterado: 'taxes' para 'taxation' para item ID: ${item.id}`);
                  }
                  return {
                    ...newItem, // Usa o newItem modificado
                    _processedAt: new Date().toISOString(), // Metadado de processamento
                    _processorVersion: '1.0',
                  };
                });

                // Salva os dados processados usando o repositório
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
            }
          }
        }
      }
      console.log(
        '[INFO] ProcessDataUseCase: Processamento de dados concluído.',
      );
    } catch (error) {
      console.error(
        '[FATAL] ProcessDataUseCase: Ocorreu um erro durante o processamento de dados:',
        error,
      );
      throw new Error(`Falha no Use Case de Processamento: ${error.message}`); // Lança o erro para o Controller
    }
  }
}

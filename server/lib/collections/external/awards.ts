import type PlexAPI from '@server/api/plexapi';
import TmdbAPI from '@server/api/themoviedb';
import { BaseCollectionSync } from '@server/lib/collections/core/BaseCollectionSync';
import {
  findPlexItemsByTmdbIds,
  processMissingItemsWithMode,
  getCollectionMediaType,
  type LibraryItemsCache,
} from '@server/lib/collections/core/CollectionUtilities';
import type {
  AwardsSourceData,
  AwardsTemplateContext,
  CollectionItem,
  CollectionSourceData,
  CollectionSyncOptions,
  CollectionOperationResult,
  FilteringStats,
  MissingItem,
  PlexCollection,
  SyncResult,
} from '@server/lib/collections/core/types';
import { CollectionSyncErrorType } from '@server/lib/collections/core/types';
import type { CollectionConfig } from '@server/lib/settings';
import logger from '@server/logger';
import axios from 'axios';
import YAML from 'yamljs';

interface AwardsCollectionItem extends CollectionItem {
  tmdbId: number;
  director?: string;
  awardYear?: number;
}

/**
 * Awards Collection Sync
 *
 * Fetches awards winners from Kometa's IMDb Awards lists.
 */
export class AwardsCollectionSync extends BaseCollectionSync<'awards'> {
  private tmdbClient: TmdbAPI;
  private static readonly BASE_AWARDS_URL =
    'https://raw.githubusercontent.com/Kometa-Team/IMDb-Awards/refs/heads/master/events/';

  private static readonly AWARD_EVENTS: Record<
    string,
    { id: string; name: string; categories: string[] }
  > = {
    academy_awards_best_picture: {
      id: 'ev0000003',
      name: 'Academy Awards Best Picture',
      categories: ['best motion picture of the year', 'best picture'],
    },
    academy_awards_best_director: {
      id: 'ev0000003',
      name: 'Academy Awards Best Director',
      categories: ['best achievement in directing', 'best director'],
    },
    cannes_palme_dor: {
      id: 'ev0000147',
      name: "Cannes Palme D'or",
      categories: ["palme d'or"],
    },
    berlin_golden_bear: {
      id: 'ev0000091',
      name: 'Berlin Golden Bear',
      categories: ['golden bear'],
    },
    bafta_best_film: {
      id: 'ev0000123',
      name: 'BAFTA Best Film',
      categories: ['best film'],
    },
    critics_choice_best_picture: {
      id: 'ev0000133',
      name: 'Critics Choice Best Picture',
      categories: ['best picture'],
    },
    cesar_best_film: {
      id: 'ev0000157',
      name: 'César Awards Best Film',
      categories: ['best film', 'meilleur film'],
    },
    emmy_outstanding_drama: {
      id: 'ev0000223',
      name: 'Primetime Emmy Outstanding Drama',
      categories: ['outstanding drama series'],
    },
    filmfare_best_film: {
      id: 'ev0000245',
      name: 'Filmfare Awards Best Film',
      categories: ['best film'],
    },
    german_film_award_best_feature: {
      id: 'ev0000280',
      name: 'German Film Awards Best Feature',
      categories: ['best feature film', 'bester spielfilm'],
    },
    golden_globes_best_motion_picture: {
      id: 'ev0000292',
      name: 'Golden Globes Best Motion Picture',
      categories: [
        'best motion picture - drama',
        'best motion picture - musical or comedy',
      ],
    },
    independent_spirit_best_feature: {
      id: 'ev0000349',
      name: 'Independent Spirit Best Feature',
      categories: ['best feature'],
    },
    iifa_best_picture: {
      id: 'ev0000361',
      name: 'IIFA Best Picture',
      categories: ['best picture', 'best film'],
    },
    zee_cine_best_film: {
      id: 'ev0000415',
      name: 'Zee Cine Awards Best Film',
      categories: ['best film'],
    },
    national_film_awards_india_best_feature: {
      id: 'ev0000467',
      name: 'National Film Awards India Best Feature',
      categories: ['best feature film'],
    },
    national_film_preservation_board_usa: {
      id: 'ev0000468',
      name: 'National Film Registry',
      categories: ['national film registry'],
    },
    peoples_choice_favorite_movie: {
      id: 'ev0000530',
      name: "People's Choice Favorite Movie",
      categories: ['favorite movie'],
    },
    razzie_worst_picture: {
      id: 'ev0000558',
      name: 'Razzie Worst Picture',
      categories: ['worst picture'],
    },
    screen_actors_guild_outstanding_cast: {
      id: 'ev0000598',
      name: 'SAG Awards Outstanding Cast',
      categories: ['outstanding performance by a cast in a motion picture'],
    },
    sundance_grand_jury_prize: {
      id: 'ev0000631',
      name: 'Sundance Grand Jury Prize',
      categories: [
        'grand jury prize',
        'grand jury prize: dramatic',
        'u.s. dramatic',
      ],
    },
    tiff_peoples_choice: {
      id: 'ev0000659',
      name: "TIFF People's Choice",
      categories: ["people's choice award"],
    },
    venice_golden_lion: {
      id: 'ev0000681',
      name: 'Venice Golden Lion',
      categories: ['golden lion'],
    },
    indian_television_academy_best_show: {
      id: 'ev0001931',
      name: 'ITA Best Show',
      categories: ['best show', 'best serial'],
    },
    zee_rishtey_best_show: {
      id: 'ev0005699',
      name: 'Zee Rishtey Best Show',
      categories: ['favorite show', 'best show'],
    },
    nickelodeon_kids_choice_india_favorite_film: {
      id: 'ev0005770',
      name: "Nickelodeon Kids' Choice India Favorite Film",
      categories: ['favorite film', 'favorite movie'],
    },
    indian_film_festival_melbourne_best_film: {
      id: 'ev0011808',
      name: 'IFFM Best Film',
      categories: ['best film'],
    },
    filmfare_ott_best_series: {
      id: 'ev0035513',
      name: 'Filmfare OTT Best Series',
      categories: ['best series', 'best original series'],
    },
    critics_choice_india_best_series: {
      id: 'ev0036701',
      name: 'Critics Choice India Best Series',
      categories: ['best series'],
    },
    iconic_gold_best_film: {
      id: 'ev0057191',
      name: 'Iconic Gold Best Film',
      categories: ['best film'],
    },
    bollywood_film_journalist_best_film: {
      id: 'ev0060658',
      name: 'Bollywood Film Journalist Best Film',
      categories: ['best film'],
    },
    international_iconic_best_film: {
      id: 'ev0073358',
      name: 'International Iconic Best Film',
      categories: ['best film'],
    },
  };

  constructor() {
    super('awards');
    this.tmdbClient = new TmdbAPI();
  }

  protected async validateConfiguration(): Promise<void> {
    // No external API keys required; TMDB client is bundled.
    return;
  }

  // Include awards list URL in cache key to keep entries distinct per subtype/source
  protected generateCacheKey(config: CollectionConfig): string {
    const baseKey = super.generateCacheKey(config);
    const awardsUrl = this.getAwardsUrl(config.subtype);
    return awardsUrl ? `${baseKey}:${encodeURIComponent(awardsUrl)}` : baseKey;
  }

  private isValidAwardsSubtype(subtype?: string): boolean {
    return !!subtype && subtype in AwardsCollectionSync.AWARD_EVENTS;
  }

  private getAwardsUrl(subtype?: string): string {
    if (!subtype || !AwardsCollectionSync.AWARD_EVENTS[subtype]) {
      return `${AwardsCollectionSync.BASE_AWARDS_URL}ev0000003.yml`;
    }
    const eventId = AwardsCollectionSync.AWARD_EVENTS[subtype].id;
    return `${AwardsCollectionSync.BASE_AWARDS_URL}${eventId}.yml`;
  }

  protected async processConfiguration(
    config: CollectionConfig,
    plexClient: PlexAPI,
    allCollections: PlexCollection[],
    processedCollectionKeys?: Set<string>,
    libraryCache?: LibraryItemsCache,
    options?: CollectionSyncOptions
  ): Promise<SyncResult> {
    try {
      if (!this.isValidAwardsSubtype(config.subtype)) {
        throw this.createSyncError(
          CollectionSyncErrorType.CONFIGURATION_ERROR,
          `Invalid Awards subtype: ${config.subtype}`
        );
      }

      const sourceData = await this.fetchSourceDataWithCache(
        config,
        { ...options, useCache: options?.useCache ?? true },
        libraryCache
      );

      const mappedResult = await this.mapSourceDataToItems(
        sourceData,
        config,
        plexClient,
        libraryCache
      );

      const { items, missingItems, mappingStats, filteringStats } =
        await this.applyFilteringToMappedItems(mappedResult, config);

      if (config.createPlaceholdersForMissing) {
        const { cleanupPlaceholdersForConfig } = await import(
          '@server/lib/collections/services/PlaceholderService'
        );
        const sourceTmdbIds = new Set([
          ...items
            .map((item) => (item as AwardsCollectionItem).tmdbId)
            .filter((id): id is number => typeof id === 'number'),
          ...(missingItems
            ?.map((item) => item.tmdbId)
            .filter((id): id is number => typeof id === 'number') || []),
        ]);
        await cleanupPlaceholdersForConfig(
          config,
          plexClient,
          libraryCache,
          sourceTmdbIds
        );
      }

      let finalItems = items;
      if (missingItems && missingItems.length > 0) {
        const placeholderItems = await this.processMissingItems(
          missingItems,
          config,
          plexClient,
          () => this.handleAutoRequests(missingItems, config)
        );
        if (placeholderItems.length > 0) {
          finalItems = [...items, ...placeholderItems];
        }
      }

      if (finalItems.length === 0) {
        logger.warn('No items to create awards collection from', {
          label: 'Awards Collections',
          configName: config.name,
          originalStatsCount: mappingStats?.original || 0,
          mappedCount: mappingStats?.filtered || 0,
          filteredCount: filteringStats?.filtered || 0,
          removedCount:
            (mappingStats?.removed || 0) + (filteringStats?.removed || 0),
        });
        return { created: 0, updated: 0 };
      }

    const mediaType = getCollectionMediaType(config);

    // Note: applyCollectionExclusions is private in BaseCollectionSync, skipping for Awards.
    // If exclusions are critical, we might need to expose it or reimplement.
    const filteredItems = finalItems;

    const collectionName = config.template || config.name;

    const result = await this.createCollection(
      filteredItems,
      mediaType,
      collectionName,
      plexClient,
      allCollections,
      config,
      processedCollectionKeys,
      // Pass original missingItems (not placeholders) to createCollection
      missingItems || []
    );

    return {
      created: result.created,
      updated: result.updated,
      details: {
        itemCount: result.itemCount,
        collectionKeys: result.collectionRatingKey ? [result.collectionRatingKey] : [],
      },
      error: result.error,
    };
    } catch (error) {
      logger.error(
        `Failed to process Awards collection ${config.name}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          label: 'Awards Collections',
          configName: config.name,
          errorStack: error instanceof Error ? error.stack : undefined,
        }
      );

      throw this.createSyncError(
        CollectionSyncErrorType.COLLECTION_ERROR,
        `Failed to process Awards collection ${config.name}`,
        { configId: config.id, configName: config.name },
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  protected async createTemplateContext(
    config: CollectionConfig,
    mediaType: 'movie' | 'tv'
  ): Promise<AwardsTemplateContext> {
    const configDisplayName =
      config.subtype && AwardsCollectionSync.AWARD_EVENTS[config.subtype]
        ? AwardsCollectionSync.AWARD_EVENTS[config.subtype].name
        : 'Awards Collection';

    return this.templateEngine.createAwardsContext(
      mediaType,
      configDisplayName
    ) as AwardsTemplateContext;
  }

  public async fetchSourceData(
    config: CollectionConfig,
    options?: CollectionSyncOptions,
    libraryCache?: LibraryItemsCache // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<AwardsSourceData[]> {
    try {
      const awardsUrl = this.getAwardsUrl(config.subtype);
      const response = await axios.get(awardsUrl, {
        timeout: options?.apiTimeout ?? 15000,
      });
      const awardsData = YAML.parse(response.data);

      if (!awardsData || typeof awardsData !== 'object') {
        throw this.createSyncError(
          CollectionSyncErrorType.API_ERROR,
          'Unexpected awards data format'
        );
      }

      // Sort years descending so newest winners appear first
      const years = Object.keys(awardsData)
        .filter((year) => /^\d{4}$/.test(year))
        .sort((a, b) => Number(b) - Number(a));

      const winners: { imdbId: string; year?: number }[] = [];
      const seen = new Set<string>();

      for (const yearKey of years) {
        const yearData = awardsData[yearKey];
        if (!yearData || typeof yearData !== 'object') continue;

        const targetCategories = this.getTargetCategories(config.subtype);
        const yearWinnerIds = this.findWinnersRecursively(
          yearData,
          targetCategories
        );

        for (const imdbId of yearWinnerIds) {
          if (!imdbId || seen.has(imdbId)) continue;
          seen.add(imdbId);
          const numericYear = Number.parseInt(yearKey, 10);
          winners.push({
            imdbId,
            year: Number.isNaN(numericYear) ? undefined : numericYear,
          });
        }
      }

      if (winners.length === 0) {
        throw this.createSyncError(
          CollectionSyncErrorType.API_ERROR,
          'No winners found in awards data'
        );
      }

      logger.info(`Found ${winners.length} winners`, {
        label: 'Awards Collections',
        configName: config.name,
      });

      // Resolve TMDB IDs in small batches
      const resolvedData: AwardsSourceData[] = [];
      const batchSize = 20;

      for (let i = 0; i < winners.length; i += batchSize) {
        const batch = winners.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (winner, batchIndex) => {
            const originalPosition = i + batchIndex + 1;
            try {
              const resolved = await this.resolveTmdbId(winner.imdbId);
              return {
                imdbId: winner.imdbId,
                tmdbId: resolved.tmdbId,
                title: resolved.title,
                year: resolved.year ?? winner.year,
                awardYear: winner.year,
                type: 'movie' as const,
                originalPosition,
              };
            } catch (error) {
              logger.warn(
                `Failed to resolve TMDB ID for IMDb ${winner.imdbId}`,
                {
                  label: 'Awards Collections',
                  error: error instanceof Error ? error.message : String(error),
                }
              );
              return {
                imdbId: winner.imdbId,
                type: 'movie' as const,
                year: winner.year,
                originalPosition,
              };
            }
          })
        );

        resolvedData.push(...batchResults);
      }

      return resolvedData;
    } catch (error) {
      throw this.createSyncError(
        CollectionSyncErrorType.API_ERROR,
        'Failed to fetch awards data',
        undefined,
    error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  protected getTargetCategories(subtype?: string): string[] {
    if (subtype && AwardsCollectionSync.AWARD_EVENTS[subtype]) {
      return AwardsCollectionSync.AWARD_EVENTS[subtype].categories;
    }
    // Default fallback
    return ['best motion picture of the year', 'best picture'];
  }

  private findWinnersRecursively(
    data: unknown,
    targetCategories: string[]
  ): string[] {
    const winners: string[] = [];

    if (!data || typeof data !== 'object') {
      return winners;
    }

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;

      const normalizedKey = key.toLowerCase().replace(':', '');
      const isTargetCategory = targetCategories.includes(normalizedKey);
      const hasWinner = 'winner' in value;

      // If this node is a target category AND contains a winner, extract it
      if (isTargetCategory && hasWinner) {
        const winnerField = (value as { winner?: unknown }).winner;
        const winnerIds = Array.isArray(winnerField)
          ? winnerField
          : winnerField
          ? [winnerField]
          : [];

        for (const id of winnerIds) {
          if (typeof id === 'string') {
            winners.push(id.trim());
          }
        }
      }

      // Always recurse to find nested categories (e.g., inside 'oscar' or split 'palme d'or' groups)
      // Exception: If we just found a winner in this node, and we don't expect nested categories *inside* a category,
      // we could skip. But purely safe to just recurse.
      winners.push(...this.findWinnersRecursively(value, targetCategories));
    }

    return winners;
  }

  private async resolveTmdbId(
    imdbId: string
  ): Promise<{ tmdbId?: number; title?: string; year?: number }> {
    const response = await this.tmdbClient.getByExternalId({
      externalId: imdbId,
      type: 'imdb',
    });

    if (response.movie_results && response.movie_results.length > 0) {
      const movie = response.movie_results[0];
      return {
        tmdbId: movie.id,
        title: movie.title || movie.original_title,
        year: movie.release_date
          ? Number.parseInt(movie.release_date.substring(0, 4))
          : undefined,
      };
    }

    if (response.tv_results && response.tv_results.length > 0) {
      const show = response.tv_results[0];
      return {
        tmdbId: show.id,
        title: show.name || show.original_name,
        year: show.first_air_date
          ? Number.parseInt(show.first_air_date.substring(0, 4))
          : undefined,
      };
    }

    return {};
  }

  public async mapSourceDataToItems(
    _sourceData: CollectionSourceData[],
    config: CollectionConfig,
    plexClient?: PlexAPI,
    libraryCache?: LibraryItemsCache
  ): Promise<{
    items: AwardsCollectionItem[];
    missingItems?: MissingItem[];
    stats?: FilteringStats;
  }> {
    const sourceData = _sourceData as AwardsSourceData[];
    const mappedItems: AwardsCollectionItem[] = [];
    const missingItems: MissingItem[] = [];
    const tmdbLookups: {
      tmdbId: number;
      imdbId: string;
      title: string;
      year?: number;
      awardYear?: number;
      originalPosition: number;
      mediaType: 'movie';
    }[] = [];
    const skipped: string[] = [];

    for (let index = 0; index < sourceData.length; index++) {
      const item = sourceData[index];
      if (!item.tmdbId) {
        skipped.push(item.imdbId);
        continue;
      }

      tmdbLookups.push({
        tmdbId: item.tmdbId,
        imdbId: item.imdbId,
        title: item.title || item.imdbId,
        year: item.year,
        awardYear: item.awardYear,
        originalPosition: item.originalPosition ?? index + 1,
        mediaType: 'movie',
      });
    }

    if (skipped.length > 0) {
      logger.info(`Awards items skipped due to missing TMDB IDs`, {
        label: 'Awards Collections',
        configName: config.name,
        count: skipped.length,
        items: skipped.slice(0, 5),
      });
    }

    if (tmdbLookups.length === 0) {
      const stats = this.createFilteringStats(sourceData.length, 0, {
        'no tmdb id': sourceData.length,
      });
      return { items: mappedItems, missingItems, stats };
    }

    let plexLookup: Map<
      string,
      { ratingKey: string; title: string; libraryKey: string }
    > = new Map();

    if (plexClient) {
      const targetLibraryId = Array.isArray(config.libraryId)
        ? config.libraryId[0]
        : config.libraryId;
      plexLookup = await findPlexItemsByTmdbIds(
        plexClient,
        tmdbLookups,
        targetLibraryId,
        libraryCache,
        false
      );
    } else {
      logger.warn('No Plex client provided to map awards items', {
        label: 'Awards Collections',
      });
    }

    for (const lookup of tmdbLookups) {
      const key = `${lookup.tmdbId}-${lookup.mediaType}`;
      const plexItem = plexLookup.get(key);

      if (plexItem) {
        mappedItems.push({
          ratingKey: plexItem.ratingKey,
          title: lookup.title,
          type: 'movie',
          tmdbId: lookup.tmdbId,
          imdbId: lookup.imdbId,
          year: lookup.year,
          awardYear: lookup.awardYear,
          metadata: {
            libraryKey: plexItem.libraryKey,
          },
        });
      } else {
        missingItems.push({
          tmdbId: lookup.tmdbId,
          mediaType: 'movie',
          title: lookup.title,
          year: lookup.year,
          awardYear: lookup.awardYear,
          originalPosition: lookup.originalPosition,
          source: 'awards',
        });
      }
    }

    const stats = this.createFilteringStats(
      sourceData.length,
      mappedItems.length,
      {
        'missing from plex': missingItems.length,
        'no tmdb id': sourceData.length - tmdbLookups.length,
      }
    );

    return {
      items: mappedItems,
      missingItems,
      stats,
    };
  }

  private async handleAutoRequests(
    missingItems: MissingItem[],
    config: CollectionConfig
  ): Promise<void> {
    await processMissingItemsWithMode(missingItems, config, 'awards');
  }

  /**
   * Create collection in Plex
   */
  protected async createCollection(
    items: CollectionItem[],
    mediaType: 'movie' | 'tv',
    collectionName: string,
    plexClient: PlexAPI,
    allCollections: PlexCollection[],
    config: CollectionConfig,
    processedCollectionKeys?: Set<string>,
    missingItems: MissingItem[] = []
  ): Promise<CollectionOperationResult> {
    logger.info(`Starting createCollection for ${collectionName}`, {
      label: 'Awards Collections',
      itemCount: items.length,
      missingItemCount: missingItems.length,
      hasCustomSummary: !!config.customSummary,
      customSummaryValue: config.customSummary ? `'${config.customSummary}'` : 'undefined',
      mediaType,
    });

    // Generate dynamic summary if no custom summary is provided (or if it's empty/whitespace)
    let collectionConfig = { ...config };
    let dynamicSummaryString: string | undefined;

    const shouldGenerateSummary =
      !config.enableCustomSummary ||
      !config.customSummary ||
      config.customSummary.trim() === '';

    if (shouldGenerateSummary && (items.length > 0 || missingItems.length > 0)) {
      try {
        const ratingKeys = items
          .map((i) => i.ratingKey)
          .filter((k): k is string => !!k);

        logger.info(
          `Generating dynamic summary for awards collection: ${ratingKeys.length} items`,
          {
            label: 'Awards Collections',
            collectionName,
          }
        );

        let itemsForSummary = items;
        if (ratingKeys.length > 0) {
          try {
            const plexItems = await plexClient.getItemsByRatingKeys(ratingKeys);

            if (plexItems && plexItems.length > 0) {
               // Map director info to items
               itemsForSummary = items.map((item) => {
                const plexItem = plexItems.find(
                  (p) => p.ratingKey === item.ratingKey
                );
                const director = plexItem?.Director?.[0]?.tag;
                return {
                  ...item,
                  director: (item as AwardsCollectionItem).director || director,
                } as AwardsCollectionItem;
              });
            } else {
               logger.warn('Plex returned no items for metadata fetch, using basic summary', {
                 label: 'Awards Collections',
                 ratingKeysCount: ratingKeys.length,
               });
            }
          } catch (err) {
            logger.error('Failed to fetch Plex metadata for summary, using basic summary', {
               label: 'Awards Collections',
               error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        // Generate summary
        // Combine matched items and missing items for the summary
        const allItemsForSummary = [
          ...(itemsForSummary as (AwardsCollectionItem & { ratingKey?: string })[]),
          ...missingItems.map(i => ({
             ...i,
             director: undefined as string | undefined,
             ratingKey: undefined as string | undefined
          }))
        ];

        const summaryLines = allItemsForSummary
          .filter((i) => (i.awardYear || i.year) && i.title)
          .sort((a, b) => ((b.awardYear || b.year || 0) - (a.awardYear || a.year || 0)))
          .map((i) => {
             const year = i.awardYear || i.year;
             // Check if it's a MissingItem (doesn't have a ratingKey)
             const isMissing = !i.ratingKey;

             const directorPart = !isMissing && i.director
                ? ` (${i.director})`
                : isMissing
                  ? ' (missing)'
                  : '';

             // Wrap title in asterisks for missing items (markdown italic)
             const titlePart = isMissing ? `*${i.title}*` : i.title;

             // Plain text year
             const yearPart = `${year}:`;

             return `${yearPart} ${titlePart}${directorPart}`;
          });

        // Limit summary length to avoid API errors (safe limit ~2000 chars)
        let dynamicSummary = summaryLines.join(', ');
        if (dynamicSummary.length > 2000) {
           dynamicSummary = dynamicSummary.substring(0, 1997) + '...';
           logger.warn('Dynamic summary truncated due to length', {
             label: 'Awards Collections',
             originalLength: summaryLines.join(', ').length,
           });
        }
          logger.info(`Generated dynamic summary length: ${dynamicSummary.length}`, {
            label: 'Awards Collections',
            summaryPreview: dynamicSummary.substring(0, 100),
          });

          dynamicSummaryString = dynamicSummary;

          // Enable custom summary to ensure it syncs (via BaseCollectionSync if working)
          collectionConfig = {
            ...config,
            customSummary: dynamicSummary,
            enableCustomSummary: true,
          };
      } catch (e) {
        logger.warn('Failed to generate dynamic summary for awards collection', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const result = await this.createOrUpdateCollectionStandardized(
      items,
      collectionName,
      mediaType,
      collectionConfig,
      plexClient,
      allCollections,
      processedCollectionKeys
    );

    // Force update summary if we generated one, to ensure it applies
    if (dynamicSummaryString && result.collectionRatingKey) {
      try {
        await plexClient.updateSummary(result.collectionRatingKey, dynamicSummaryString);
        logger.info(`Forced update of dynamic summary for ${collectionName}`, {
          label: 'Awards Collections',
          collectionRatingKey: result.collectionRatingKey,
        });
      } catch (error) {
         logger.warn(`Failed to force update summary for ${collectionName}`, {
            label: 'Awards Collections',
            error: error instanceof Error ? error.message : String(error),
         });
      }
    }

    this.updateConfigWithRatingKey(config, result.collectionRatingKey);

    return {
      created: result.created,
      updated: result.updated,
      collectionRatingKey: result.collectionRatingKey,
      itemCount: result.itemCount,
      stats: result.stats,
    };
  }
}

export default AwardsCollectionSync;

/**
 * Plex Library Collection Sync
 *
 * Creates smart collections based on Plex library metadata (e.g., directors, actors, genres).
 *
 * Currently supports:
 * - directors: Creates collections for top directors in the library
 *
 * This is useful for creating curated collections based on library content without
 * relying on external data sources, similar to Kometa's library-based features.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */


import type PlexAPI from '@server/api/plexapi';
import { BaseCollectionSync } from '@server/lib/collections/core/BaseCollectionSync';
import {
  getCollectionMediaType,
  type LibraryItemsCache,
} from '@server/lib/collections/core/CollectionUtilities';
import type {
  CollectionItem,
  CollectionOperationResult,
  CollectionSourceData,
  CollectionSyncOptions,
  CollectionVisibilityConfig,
  FilteringStats,
  MissingItem,
  PlexCollection,
  SyncResult,
} from '@server/lib/collections/core/types';
import { CollectionSyncErrorType } from '@server/lib/collections/core/types';
import type { CollectionConfig } from '@server/lib/settings';
import logger from '@server/logger';

export class PlexLibraryCollectionSync extends BaseCollectionSync {
  constructor() {
    super('plex_library');
  }

  /**
   * Validate that configuration is valid for plex_library collections
   */
  protected async validateConfiguration(): Promise<void> {
    // No external API dependencies - just needs Plex
  }

  /**
   * Create template context for name generation
   */
  protected async createTemplateContext(
    config: CollectionConfig,
    _mediaType: 'movie' | 'tv'
  ): Promise<Record<string, unknown>> {
    return {
      source: 'plex_library',
      subtype: config.subtype,
    };
  }

  /**
   * Plex Library doesn't fetch external data - it uses Plex library metadata
   */
  public async fetchSourceData(
    _config: CollectionConfig,
    _options?: CollectionSyncOptions,
    _libraryCache?: LibraryItemsCache
  ): Promise<CollectionSourceData[]> {
    return [];
  }

  /**
   * Not used for this collection type
   */
  public async mapSourceDataToItems(
    _sourceData: CollectionSourceData[],
    _config: CollectionConfig,
    _plexClient?: PlexAPI,
    _libraryCache?: LibraryItemsCache
  ): Promise<{
    items: CollectionItem[];
    missingItems?: MissingItem[];
    stats?: FilteringStats;
  }> {
    return {
      items: [],
      missingItems: [],
      stats: { original: 0, filtered: 0, removed: 0 },
    };
  }

  /**
   * Not used for this collection type - we use processConfiguration directly
   */
  protected async createCollection(
    _items: CollectionItem[],
    _mediaType: 'movie' | 'tv',
    _collectionName: string,
    _plexClient: PlexAPI,
    _allCollections: PlexCollection[],
    _config: CollectionConfig,
    _processedCollectionKeys?: Set<string>
  ): Promise<CollectionOperationResult> {
    return {
      created: 0,
      updated: 0,
      itemCount: 0,
    };
  }

  /**
   * Process a single Plex Library collection configuration
   */
  protected async processConfiguration(
    config: CollectionConfig,
    plexClient: PlexAPI,
    allCollections: PlexCollection[],
    processedCollectionKeys?: Set<string>,
    _libraryCache?: LibraryItemsCache,
    _options?: CollectionSyncOptions
  ): Promise<SyncResult> {
    const mediaType = getCollectionMediaType(config);

    // Validate subtype
    const subtype = config.subtype;
    if (!subtype || subtype !== 'directors') {
      throw this.createSyncError(
        CollectionSyncErrorType.CONFIGURATION_ERROR,
        `Invalid plex_library subtype: ${subtype}. Currently only 'directors' is supported.`
      );
    }

    logger.info('Syncing plex library collection', {
      label: 'Plex Library Collections',
      configName: config.name,
      libraryId: config.libraryId,
      mediaType,
      subtype,
    });

    // Process directors subtype
    if (subtype === 'directors') {
      return await this.processDirectorsCollection(
        config,
        plexClient,
        mediaType,
        allCollections,
        processedCollectionKeys
      );
    }

    throw this.createSyncError(
      CollectionSyncErrorType.CONFIGURATION_ERROR,
      `Unsupported plex_library subtype: ${subtype}`
    );
  }

  /**
   * Process directors collection - creates collections for top directors
   */
  private async processDirectorsCollection(
    config: CollectionConfig,
    plexClient: PlexAPI,
    mediaType: 'movie' | 'tv',
    allCollections: PlexCollection[],
    processedCollectionKeys?: Set<string>
  ): Promise<SyncResult> {
    // Get configuration parameters with defaults
    const depth = config.directorDepth || 5; // Top N directors
    const limit = config.directorLimit || 30; // Max items per director
    const minimumItems = config.directorMinimumItems || 3; // Minimum threshold

    logger.info('Processing directors collection', {
      label: 'Plex Library Collections',
      configName: config.name,
      libraryId: config.libraryId,
      depth,
      limit,
      minimumItems,
    });

    try {
      // Fetch top directors from  library
      const directors = await plexClient.getLibraryDirectors(
        config.libraryId,
        depth * 2 // Fetch extra in case some don't meet minimum threshold
      );

      logger.debug(`Retrieved ${directors.length} directors from library`, {
        label: 'Plex Library Collections',
        configName: config.name,
        directorsCount: directors.length,
      });

      // Filter directors by minimum items threshold
      const qualifyingDirectors = directors.filter((d) => d.count >= minimumItems);

      // Limit to depth
      const topDirectors = qualifyingDirectors.slice(0, depth);

      logger.info(
        `Creating collections for ${topDirectors.length} directors (${qualifyingDirectors.length} qualified, ${directors.length} total)`,
        {
          label: 'Plex Library Collections',
          configName: config.name,
          topDirectors: topDirectors.map((d) => `${d.name} (${d.count} items)`),
        }
      );

      let created = 0;
      let updated = 0;

      // Create collection for each director
      for (const director of topDirectors) {
        try {
          // Generate collection name from template (e.g., "Christopher Nolan")
          const collectionName = director.name;

          // Check if collection already exists
          const existingCollection = allCollections.find(
            (c) =>
              c.title === collectionName &&
              c.libraryKey === config.libraryId
          );

          const collectionKey = `${config.libraryId}-${collectionName}`;

          if (existingCollection) {
            logger.debug(`Director collection already exists: ${collectionName}`, {
              label: 'Plex Library Collections',
              collectionName,
              ratingKey: existingCollection.ratingKey,
            });

            // Mark as processed
            processedCollectionKeys?.add(collectionKey);
            updated++;
          } else {
            // Create new smart collection for this director
            const smartCollectionRatingKey =
              await plexClient['smartCollectionManager'].createDirectorCollection(
                collectionName,
                config.libraryId,
                mediaType,
                director.name,
                limit
              );

            if (smartCollectionRatingKey) {
              logger.info(`Created director collection: ${collectionName}`, {
                label: 'Plex Library Collections',
                collectionName,
                director: director.name,
                itemCount: director.count,
                limit,
                ratingKey: smartCollectionRatingKey,
              });

              // Mark as processed
              processedCollectionKeys?.add(collectionKey);
              created++;
            } else {
              logger.warn(`Failed to create collection for director: ${director.name}`, {
                label: 'Plex Library Collections',
                directorName: director.name,
              });
            }
          }
        } catch (error) {
          logger.error(`Error creating collection for director ${director.name}`, {
            label: 'Plex Library Collections',
            directorName: director.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info('Directors collection sync completed', {
        label: 'Plex Library Collections',
        configName: config.name,
        created,
        updated,
        total: topDirectors.length,
      });

      return {
        created,
        updated,
      };
    } catch (error) {
      logger.error('Failed to process directors collection', {
        label: 'Plex Library Collections',
        configName: config.name,
        error: error instanceof Error ? error.message : String(error),
      });

      throw this.createSyncError(
        CollectionSyncErrorType.API_ERROR,
        `Failed to fetch directors from library: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

// Export singleton instance
export const plexLibraryCollectionSync = new PlexLibraryCollectionSync();
export default plexLibraryCollectionSync;

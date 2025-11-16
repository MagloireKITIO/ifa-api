import {
  Injectable,
  BadRequestException,
  Logger,
  HttpException,
} from '@nestjs/common';

/**
 * Service for managing verses with Bible API integration
 * 100% automatic - no database, no admin management
 */
@Injectable()
export class VersesService {
  private readonly logger = new Logger(VersesService.name);
  private readonly BIBLE_API_BASE_URL = 'https://api.biblesupersearch.com/api';

  // Fixed Bible versions (no admin configuration needed)
  private readonly BIBLE_VERSIONS = {
    fr: 'segond_1910', // Louis Segond 1910
    en: 'kjv',         // King James Version
  };

  /**
   * Predefined list of popular Bible verses for daily rotation
   * Format: English for Bible SuperSearch API compatibility
   */
  private readonly VERSE_REFERENCES = [
    'John 3:16',
    'Philippians 4:13',
    'Psalm 23:1',
    'Romans 8:28',
    'Jeremiah 29:11',
    'Matthew 28:20',
    'Proverbs 3:5-6',
    'Isaiah 41:10',
    'John 14:6',
    'Psalm 46:1',
    'Matthew 11:28',
    '2 Corinthians 5:17',
    'Joshua 1:9',
    'Romans 12:2',
    'Galatians 5:22-23',
    'Ephesians 2:8-9',
    'Psalm 119:105',
    'John 1:1',
    'Matthew 6:33',
    'Proverbs 16:3',
  ];

  /**
   * Fetch verse from Bible SuperSearch API
   * @param reference - Bible reference (e.g., "John 3:16")
   * @returns Verse text in both French and English
   */
  private async fetchVerseFromAPI(
    reference: string
  ): Promise<{ textFr: string; textEn: string; reference: string }> {
    try {
      // Fetch French version (Louis Segond 1910)
      const frUrl = `${this.BIBLE_API_BASE_URL}?bible=${this.BIBLE_VERSIONS.fr}&reference=${encodeURIComponent(reference)}&data_format=minimal`;
      const frResponse = await fetch(frUrl);

      if (!frResponse.ok) {
        throw new HttpException('Failed to fetch French verse from Bible API', frResponse.status);
      }

      const frData = await frResponse.json();
      const frResults = Object.values(frData.results || {})[0] as any[];
      const textFr = frResults?.[0]?.text?.trim() || '';

      // Fetch English version (King James Version)
      const enUrl = `${this.BIBLE_API_BASE_URL}?bible=${this.BIBLE_VERSIONS.en}&reference=${encodeURIComponent(reference)}&data_format=minimal`;
      const enResponse = await fetch(enUrl);

      if (!enResponse.ok) {
        throw new HttpException('Failed to fetch English verse from Bible API', enResponse.status);
      }

      const enData = await enResponse.json();
      const enResults = Object.values(enData.results || {})[0] as any[];
      const textEn = enResults?.[0]?.text?.trim() || '';

      if (!textFr && !textEn) {
        throw new BadRequestException('No verse text found for reference: ' + reference);
      }

      return {
        textFr,
        textEn,
        reference,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch verse from API: ${reference}`, error);
      throw new BadRequestException('Could not fetch verse from Bible API');
    }
  }

  /**
   * Get verse of the day
   * Public endpoint for mobile app
   * 100% automatic - selects verse based on date hash
   */
  async getVerseOfTheDay(): Promise<any> {
    try {
      // Generate deterministic index based on current date
      // Same verse for the entire day
      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Simple hash function
      let hash = 0;
      for (let i = 0; i < dateString.length; i++) {
        hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
        hash = hash & hash;
      }

      const verseIndex = Math.abs(hash) % this.VERSE_REFERENCES.length;
      const reference = this.VERSE_REFERENCES[verseIndex];

      this.logger.log(`📖 Verse of the day: ${reference} (index: ${verseIndex}/${this.VERSE_REFERENCES.length})`);

      // Fetch verse text from Bible API
      const verseData = await this.fetchVerseFromAPI(reference);

      // Return verse object
      return {
        id: `daily-${dateString}`,
        reference: verseData.reference,
        textFr: verseData.textFr,
        textEn: verseData.textEn,
        source: 'api',
        season: 'default',
        isActive: true,
        isOverride: false,
        priority: 0,
        lastDisplayedAt: new Date(),
        displayCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch verse of the day from API', error);

      // Fallback verse if API fails
      return {
        id: 'fallback',
        reference: 'John 3:16',
        textFr: 'Car Dieu a tant aimé le monde qu\'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu\'il ait la vie éternelle.',
        textEn: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
        source: 'manual',
        season: 'default',
        isActive: true,
        isOverride: false,
        priority: 0,
        lastDisplayedAt: new Date(),
        displayCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }
}

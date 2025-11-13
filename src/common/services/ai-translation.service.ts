import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigurationService } from '../../settings/services';

export interface TranslateTextDto {
  text: string;
  fromLanguage: 'fr' | 'en';
  toLanguage: 'fr' | 'en';
  context?: string;
}

export interface TranslationResponse {
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
    tokenizer: string;
  };
}

@Injectable()
export class AiTranslationService {
  private readonly logger = new Logger(AiTranslationService.name);

  constructor(private readonly configService: ConfigurationService) {}

  /**
   * Translate text using OpenRouter AI
   */
  async translateText(dto: TranslateTextDto): Promise<TranslationResponse> {
    const { text, fromLanguage, toLanguage, context } = dto;

    // Validation
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Text to translate cannot be empty');
    }

    if (fromLanguage === toLanguage) {
      return {
        translatedText: text,
        fromLanguage,
        toLanguage,
      };
    }

    try {
      // Get OpenRouter settings
      const openRouterSettings = await this.configService.get<{
        apiKey: string;
        model?: string;
        enableAutoTranslation?: boolean;
      }>('openrouter_config');

      if (!openRouterSettings?.apiKey) {
        throw new BadRequestException(
          'OpenRouter API key not configured. Please configure it in settings.',
        );
      }

      if (openRouterSettings.enableAutoTranslation === false) {
        throw new BadRequestException('Auto-translation is disabled in settings');
      }

      const model = openRouterSettings.model || 'anthropic/claude-3.5-sonnet';

      // Build prompt based on context
      const languageNames = {
        fr: 'French',
        en: 'English',
      };

      let systemPrompt = `You are a professional translator. Translate the following text from ${languageNames[fromLanguage]} to ${languageNames[toLanguage]}.`;

      if (context) {
        systemPrompt += ` Context: This is a ${context}. Maintain the appropriate tone and style.`;
      }

      systemPrompt += ` Only return the translated text without any additional explanation or formatting.`;

      // Call OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterSettings.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'IFA Church Admin',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent translations
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error('OpenRouter API error', errorData);
        throw new BadRequestException(
          `Translation failed: ${errorData.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      const translatedText = data.choices?.[0]?.message?.content?.trim();

      if (!translatedText) {
        throw new BadRequestException('Translation failed: No response from AI');
      }

      this.logger.log(
        `Translation completed: ${fromLanguage} -> ${toLanguage} (${text.length} chars)`,
      );

      return {
        translatedText,
        fromLanguage,
        toLanguage,
      };
    } catch (error) {
      this.logger.error('Translation error', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Translation failed: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Translate multiple fields at once
   */
  async translateFields(
    fields: Array<{ key: string; text: string }>,
    fromLanguage: 'fr' | 'en',
    toLanguage: 'fr' | 'en',
    context?: string,
  ): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};

    for (const field of fields) {
      if (field.text && field.text.trim().length > 0) {
        const result = await this.translateText({
          text: field.text,
          fromLanguage,
          toLanguage,
          context,
        });
        translations[field.key] = result.translatedText;
      } else {
        translations[field.key] = '';
      }
    }

    return translations;
  }

  /**
   * Get available OpenRouter models
   */
  async getAvailableModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');

      if (!response.ok) {
        this.logger.error('Failed to fetch OpenRouter models');
        return [];
      }

      const data = await response.json();

      // Filter for translation-friendly models (text models)
      const models = data.data || [];
      return models
        .filter((model: any) => {
          const modality = model.architecture?.modality || '';
          return modality.includes('text') || modality === 'text->text';
        })
        .map((model: any) => ({
          id: model.id,
          name: model.name,
          description: model.description,
          pricing: model.pricing,
          context_length: model.context_length,
          architecture: model.architecture,
        }));
    } catch (error) {
      this.logger.error('Error fetching OpenRouter models', error);
      return [];
    }
  }
}

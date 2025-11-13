import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigurationService } from '../../settings/services';

export interface ModerationResult {
  decision: 'APPROVE' | 'REJECT';
  confidence: number; // 0-100
  reason: string;
  categories: {
    isAppropriate: boolean;
    isRelevant: boolean;
    isCoherent: boolean;
    isSpam: boolean;
    hasInappropriateContent: boolean;
  };
  analyzedAt: Date;
  model: string;
}

export interface ModerateTestimonyDto {
  content: string;
  language: 'fr' | 'en';
}

@Injectable()
export class AiModerationService {
  private readonly logger = new Logger(AiModerationService.name);

  constructor(private readonly configService: ConfigurationService) {}

  /**
   * Moderate testimony content using AI
   * Analyzes the testimony and decides whether to approve or reject it
   */
  async moderateTestimony(
    dto: ModerateTestimonyDto,
  ): Promise<ModerationResult> {
    const { content, language } = dto;

    // Validation
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Content to moderate cannot be empty');
    }

    try {
      // Get OpenRouter settings (same as translation service)
      const openRouterSettings = await this.configService.get<{
        apiKey: string;
        model?: string;
        enableAutoModeration?: boolean;
      }>('openrouter_config');

      if (!openRouterSettings?.apiKey) {
        this.logger.warn('OpenRouter API key not configured. Skipping AI moderation.');
        // Fallback: approve by default if AI is not configured
        return this.createFallbackResult(content);
      }

      if (openRouterSettings.enableAutoModeration === false) {
        this.logger.warn('Auto-moderation is disabled. Skipping AI moderation.');
        return this.createFallbackResult(content);
      }

      const model = openRouterSettings.model || 'anthropic/claude-3.5-sonnet';

      // Build moderation prompt
      const systemPrompt = this.buildModerationPrompt(language);

      // Call OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterSettings.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'IFA Church Admin - Testimony Moderation',
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
              content: `Analyze this testimony:\n\n${content}`,
            },
          ],
          temperature: 0.2, // Lower temperature for consistent moderation
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error('OpenRouter API error during moderation', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        // Fallback on error
        return this.createFallbackResult(content);
      }

      const data = await response.json();
      this.logger.debug('OpenRouter API response:', JSON.stringify(data));

      const aiResponse = data.choices?.[0]?.message?.content?.trim();

      if (!aiResponse) {
        this.logger.error('No response from AI moderation', {
          hasChoices: !!data.choices,
          choicesLength: data.choices?.length,
          firstChoice: data.choices?.[0],
          fullResponse: JSON.stringify(data),
        });
        return this.createFallbackResult(content);
      }

      // Parse AI response (expecting JSON format)
      const result = this.parseAIResponse(aiResponse, model);

      this.logger.log(
        `Moderation completed: Decision=${result.decision}, Confidence=${result.confidence}%`,
      );

      return result;
    } catch (error) {
      this.logger.error('Moderation error', error);
      // Fallback: approve by default on error (to avoid blocking users)
      return this.createFallbackResult(content);
    }
  }

  /**
   * Build the moderation system prompt
   */
  private buildModerationPrompt(language: 'fr' | 'en'): string {
    const languageName = language === 'fr' ? 'French' : 'English';

    return `You are a content moderator for a Christian church mobile application. Your role is to analyze testimonies submitted by users and determine if they should be approved or rejected.

A testimony is a personal story about faith, answered prayers, spiritual experiences, or God's intervention in someone's life.

Analyze the testimony based on these criteria:

1. **Appropriate Content**: No hate speech, violence, sexual content, or offensive language
2. **Relevant to Faith**: Related to Christian faith, prayer, spiritual experience, or testimony
3. **Coherent**: Makes sense, is understandable, and properly written
4. **Not Spam**: Not advertising, promotional content, or repetitive meaningless text
5. **Sufficient Length**: At least 10 words

Language: ${languageName}

You MUST respond with a valid JSON object in this exact format:
{
  "decision": "APPROVE" or "REJECT",
  "confidence": <number from 0 to 100>,
  "reason": "<brief explanation in ${languageName}>",
  "categories": {
    "isAppropriate": <boolean>,
    "isRelevant": <boolean>,
    "isCoherent": <boolean>,
    "isSpam": <boolean>,
    "hasInappropriateContent": <boolean>
  }
}

Decision Rules:
- APPROVE: If the testimony meets all criteria (appropriate, relevant, coherent, not spam)
- REJECT: If the testimony fails any critical criterion (inappropriate content, spam, incoherent, too short, not relevant)

Be fair but firm. The goal is to maintain a positive, safe, and faith-focused environment.`;
  }

  /**
   * Parse AI response and extract moderation result
   */
  private parseAIResponse(aiResponse: string, model: string): ModerationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate response structure
      if (!parsed.decision || !parsed.categories) {
        throw new Error('Invalid AI response structure');
      }

      // Ensure decision is valid
      const decision = parsed.decision.toUpperCase();
      if (decision !== 'APPROVE' && decision !== 'REJECT') {
        throw new Error(`Invalid decision: ${decision}`);
      }

      return {
        decision: decision as 'APPROVE' | 'REJECT',
        confidence: Math.max(0, Math.min(100, parsed.confidence || 50)),
        reason: parsed.reason || 'No reason provided',
        categories: {
          isAppropriate: parsed.categories.isAppropriate ?? true,
          isRelevant: parsed.categories.isRelevant ?? true,
          isCoherent: parsed.categories.isCoherent ?? true,
          isSpam: parsed.categories.isSpam ?? false,
          hasInappropriateContent: parsed.categories.hasInappropriateContent ?? false,
        },
        analyzedAt: new Date(),
        model,
      };
    } catch (error) {
      this.logger.error('Failed to parse AI response', error);
      this.logger.debug('AI Response:', aiResponse);
      // Fallback: approve by default if parsing fails
      return this.createFallbackResult('');
    }
  }

  /**
   * Create a fallback result when AI moderation is not available
   */
  private createFallbackResult(content: string): ModerationResult {
    // Simple heuristic fallback
    const isTooShort = content.trim().split(/\s+/).length < 10;

    return {
      decision: isTooShort ? 'REJECT' : 'APPROVE',
      confidence: 50, // Low confidence for fallback
      reason: isTooShort
        ? 'Content too short (fallback moderation)'
        : 'AI moderation unavailable - approved by default',
      categories: {
        isAppropriate: true,
        isRelevant: true,
        isCoherent: !isTooShort,
        isSpam: false,
        hasInappropriateContent: false,
      },
      analyzedAt: new Date(),
      model: 'fallback',
    };
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de réponse pour les settings publics (mobile app)
 *
 * LOGIQUE :
 * - Contient uniquement les settings NON sensibles
 * - Exclut les clés API, secrets, credentials
 * - Permet au mobile de configurer l'app sans authentification
 */
export class PublicSettingsResponseDto {
  @ApiPropertyOptional({
    description: 'Configuration Firebase publique (apiKey, authDomain, projectId, etc.)',
    example: {
      apiKey: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      authDomain: 'ifa-app.firebaseapp.com',
      projectId: 'ifa-app',
      storageBucket: 'ifa-app.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:xxxxxxxxxxxxx',
    },
    nullable: true,
  })
  firebase?: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Configuration des couleurs de l\'app',
    example: {
      primary: '#1E40AF',
      secondary: '#10B981',
      accent: '#F59E0B',
    },
    nullable: true,
  })
  colors?: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Textes et labels personnalisables',
    example: {
      welcomeMessageFr: 'Bienvenue dans l\'application IFA',
      welcomeMessageEn: 'Welcome to IFA app',
    },
    nullable: true,
  })
  labels?: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Langues disponibles',
    example: {
      availableLanguages: ['fr', 'en'],
      defaultLanguage: 'fr',
    },
    nullable: true,
  })
  i18n?: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Configuration générale de l\'app',
    example: {
      appName: 'IFA',
      appVersion: '1.0.0',
      supportEmail: 'support@ifa.com',
      supportPhone: '+237670000000',
    },
    nullable: true,
  })
  general?: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'URLs et liens utiles',
    example: {
      termsOfServiceUrl: 'https://ifa.com/terms',
      privacyPolicyUrl: 'https://ifa.com/privacy',
      websiteUrl: 'https://ifa.com',
    },
    nullable: true,
  })
  links?: Record<string, any> | null;
}

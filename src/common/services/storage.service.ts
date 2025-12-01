import { Injectable, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigurationService } from '../../settings/services/configuration.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service pour gérer le stockage de fichiers via Supabase Storage
 * Utilisé pour les audios de témoignages, images, etc.
 */
@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private bucketName = 'ifa-testimonies'; // Bucket pour les témoignages audio

  // Configurations
  private readonly MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB max pour audio
  private readonly MAX_AUDIO_DURATION = 300; // 5 minutes max (300 secondes)
  private readonly ALLOWED_AUDIO_TYPES = [
    'audio/mpeg', // mp3
    'audio/mp4', // m4a
    'audio/x-m4a', // m4a
    'audio/wav', // wav
    'audio/webm', // webm
  ];

  constructor(private readonly configurationService: ConfigurationService) {
    this.initializeSupabase();
  }

  /**
   * Initialiser le client Supabase depuis la configuration
   */
  private async initializeSupabase(): Promise<void> {
    try {
      const supabaseConfig = await this.configurationService.get<{
        url: string;
        serviceRoleKey: string; // On utilise serviceRoleKey pour bypasser RLS
      }>('supabase_config');

      if (!supabaseConfig || !supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
        console.warn('⚠️ Supabase credentials not configured in app_settings');
        return;
      }

      this.supabase = createClient(
        supabaseConfig.url,
        supabaseConfig.serviceRoleKey, // Service role pour upload côté serveur
      );

      // Vérifier/créer le bucket si nécessaire
      await this.ensureBucketExists();
    } catch (error) {
      console.error('Failed to initialize Supabase Storage:', error);
    }
  }

  /**
   * Vérifier que le bucket existe, sinon le créer
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      const { data: buckets } = await this.supabase.storage.listBuckets();

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        const { error } = await this.supabase.storage.createBucket(this.bucketName, {
          public: true, // Les audios sont publiquement accessibles
          fileSizeLimit: this.MAX_AUDIO_SIZE,
        });

        if (error) {
          console.error('Failed to create Supabase bucket:', error);
        } else {
          console.log(`✅ Created Supabase bucket: ${this.bucketName}`);
        }
      }
    } catch (error) {
      console.error('Failed to ensure bucket exists:', error);
    }
  }

  /**
   * Uploader un fichier audio vers Supabase Storage
   * @param file - Buffer du fichier audio
   * @param mimetype - Type MIME du fichier
   * @param duration - Durée de l'audio en secondes
   * @returns URL publique du fichier uploadé
   */
  async uploadAudio(
    file: Buffer,
    mimetype: string,
    duration?: number,
  ): Promise<string> {
    if (!this.supabase) {
      throw new BadRequestException('Supabase storage not configured');
    }

    // Valider le type de fichier
    if (!this.ALLOWED_AUDIO_TYPES.includes(mimetype)) {
      throw new BadRequestException(
        `Invalid audio type. Allowed types: ${this.ALLOWED_AUDIO_TYPES.join(', ')}`,
      );
    }

    // Valider la taille
    if (file.length > this.MAX_AUDIO_SIZE) {
      throw new BadRequestException(
        `File too large. Max size: ${this.MAX_AUDIO_SIZE / (1024 * 1024)} MB`,
      );
    }

    // Valider la durée
    if (duration && duration > this.MAX_AUDIO_DURATION) {
      throw new BadRequestException(
        `Audio too long. Max duration: ${this.MAX_AUDIO_DURATION} seconds (5 minutes)`,
      );
    }

    // Générer un nom de fichier unique
    const fileExtension = this.getFileExtension(mimetype);
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `testimonies/${fileName}`;

    // Uploader vers Supabase Storage
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, file, {
        contentType: mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new BadRequestException('Failed to upload audio file');
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  }

  /**
   * Supprimer un fichier audio de Supabase Storage
   * @param audioUrl - URL du fichier à supprimer
   */
  async deleteAudio(audioUrl: string): Promise<void> {
    if (!this.supabase || !audioUrl) {
      return;
    }

    try {
      // Extraire le chemin du fichier depuis l'URL
      const filePath = this.extractFilePathFromUrl(audioUrl);

      if (!filePath) {
        console.warn('Invalid audio URL, cannot extract file path:', audioUrl);
        return;
      }

      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Failed to delete audio file from Supabase:', error);
      }
    } catch (error) {
      console.error('Error deleting audio file:', error);
    }
  }

  /**
   * Extraire le chemin du fichier depuis l'URL Supabase
   * Ex: https://xxx.supabase.co/storage/v1/object/public/ifa-testimonies/testimonies/abc.mp3
   * -> testimonies/abc.mp3
   */
  private extractFilePathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');

      // Format: /storage/v1/object/public/{bucket}/{path}
      const bucketIndex = pathParts.indexOf(this.bucketName);
      if (bucketIndex === -1) {
        return null;
      }

      return pathParts.slice(bucketIndex + 1).join('/');
    } catch {
      return null;
    }
  }

  /**
   * Obtenir l'extension du fichier selon le MIME type
   */
  private getFileExtension(mimetype: string): string {
    const extensions: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
    };

    return extensions[mimetype] || 'mp3';
  }
}

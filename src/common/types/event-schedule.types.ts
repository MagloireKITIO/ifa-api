/**
 * 📅 TYPES POUR LE PROGRAMME D'ÉVÉNEMENTS
 *
 * Structure pour gérer les événements multi-jours avec programme détaillé
 * Utilisé principalement pour les croisades qui durent plusieurs jours
 */

/**
 * Une session individuelle dans une journée
 * Ex: "Session d'adoration" de 18h à 19h
 */
export interface EventSession {
  /**
   * ID unique de la session
   */
  id: string;

  /**
   * Titre de la session en français
   * Ex: "Adoration et louange"
   */
  titleFr: string;

  /**
   * Titre de la session en anglais
   * Ex: "Worship and Praise"
   */
  titleEn: string;

  /**
   * Heure de début (format HH:mm)
   * Ex: "18:00"
   */
  startTime: string;

  /**
   * Heure de fin (format HH:mm)
   * Ex: "21:00"
   */
  endTime: string;

  /**
   * Description optionnelle en français
   */
  descriptionFr?: string;

  /**
   * Description optionnelle en anglais
   */
  descriptionEn?: string;

  /**
   * Nom de l'intervenant/orateur
   * Ex: "Pasteur Jean Dupont"
   */
  speaker?: string;

  /**
   * Type de session
   */
  type?: SessionType;
}

/**
 * Types de sessions possibles
 */
export enum SessionType {
  WORSHIP = 'worship',
  PREACHING = 'preaching',
  PRAYER = 'prayer',
  TESTIMONY = 'testimony',
  BREAK = 'break',
  OTHER = 'other',
}

/**
 * Programme d'une journée complète
 * Ex: Jour 1 de la croisade - 15 janvier 2025
 */
export interface EventScheduleDay {
  /**
   * ID unique du jour
   */
  id: string;

  /**
   * Numéro du jour (1, 2, 3...)
   * Ex: Jour 1, Jour 2, Jour 3
   */
  day: number;

  /**
   * Date complète du jour (YYYY-MM-DD)
   * Ex: "2025-01-15"
   */
  date: string;

  /**
   * Titre optionnel du jour en français
   * Ex: "Journée de guérison"
   */
  titleFr?: string;

  /**
   * Titre optionnel du jour en anglais
   * Ex: "Healing day"
   */
  titleEn?: string;

  /**
   * Liste des sessions de la journée
   */
  sessions: EventSession[];
}

/**
 * Programme complet de l'événement
 * Tableau de jours pour les événements multi-jours
 */
export type EventSchedule = EventScheduleDay[];

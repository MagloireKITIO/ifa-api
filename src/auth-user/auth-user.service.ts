import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '../entities/user.entity';
import { FCMToken } from '../entities/fcm-token.entity';
import { ConfigurationService } from '../settings/services/configuration.service';
import {
  GoogleAuthDto,
  PhoneSendOtpDto,
  PhoneVerifyOtpDto,
  CompleteProfileDto,
  UpdateProfileDto,
  AuthUserResponseDto,
} from './dto';
import { JwtUserPayload } from './interfaces';
import { Language } from '../common/enums';

@Injectable()
export class AuthUserService {
  private supabase: SupabaseClient;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly configurationService: ConfigurationService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FCMToken)
    private readonly fcmTokenRepository: Repository<FCMToken>,
  ) {
    // Initialiser Supabase client - sera chargé depuis app_settings
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase client from database settings
   */
  private async initializeSupabase(): Promise<void> {
    try {
      const supabaseConfig = await this.configurationService.get<{
        url: string;
        anonKey: string;
      }>('supabase_config');

      if (!supabaseConfig || !supabaseConfig.url || !supabaseConfig.anonKey) {
        console.warn('⚠️ Supabase credentials not configured in app_settings');
        return;
      }

      this.supabase = createClient(
        supabaseConfig.url,
        supabaseConfig.anonKey,
      );
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
    }
  }

  /**
   * Google OAuth Authentication
   * Authentifie un user via Google OAuth (Supabase)
   */
  async googleAuth(
    googleAuthDto: GoogleAuthDto,
  ): Promise<AuthUserResponseDto> {
    const { idToken } = googleAuthDto;

    // Vérifier le token Google via Supabase
    const { data: supabaseData, error } = await this.supabase.auth.getUser(
      idToken,
    );

    if (error || !supabaseData?.user) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const supabaseUser = supabaseData.user;

    // Chercher ou créer l'utilisateur dans notre DB
    let user = await this.userRepository.findOne({
      where: [
        { email: supabaseUser.email },
        { supabaseUserId: supabaseUser.id },
      ],
      relations: ['center'],
    });

    const isNewUser = !user;

    if (!user) {
      // Créer un nouvel utilisateur
      user = this.userRepository.create({
        email: supabaseUser.email,
        supabaseUserId: supabaseUser.id,
        displayName: supabaseUser.user_metadata?.full_name || supabaseUser.email,
        photoURL: supabaseUser.user_metadata?.avatar_url,
        emailVerified: true,
        preferredLanguage: Language.FR, // Par défaut
        isFirstTimer: true, // Par défaut
      });

      user = await this.userRepository.save(user);
    } else {
      // Mettre à jour les infos si nécessaire
      if (!user.supabaseUserId) {
        user.supabaseUserId = supabaseUser.id;
        await this.userRepository.save(user);
      }
    }

    // Générer les tokens JWT
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Vérifier si le profil est complet
    // Un utilisateur doit compléter son profil s'il est nouveau OU si les informations essentielles manquent
    const needsProfileCompletion = isNewUser || !user.displayName || !user.city || !user.country;

    return {
      user,
      accessToken,
      refreshToken,
      needsProfileCompletion,
    };
  }

  /**
   * Phone OTP - Send OTP
   * Envoie un OTP par SMS via Supabase
   */
  async sendPhoneOtp(
    phoneSendOtpDto: PhoneSendOtpDto,
  ): Promise<{ message: string }> {
    const { phoneNumber } = phoneSendOtpDto;

    // Envoyer OTP via Supabase
    const { error } = await this.supabase.auth.signInWithOtp({
      phone: phoneNumber,
    });

    if (error) {
      throw new BadRequestException(`Failed to send OTP: ${error.message}`);
    }

    return {
      message: 'OTP sent successfully',
    };
  }

  /**
   * Phone OTP - Verify OTP
   * Vérifie l'OTP et authentifie l'utilisateur
   */
  async verifyPhoneOtp(
    phoneVerifyOtpDto: PhoneVerifyOtpDto,
  ): Promise<AuthUserResponseDto> {
    const { phoneNumber, otp } = phoneVerifyOtpDto;

    // Vérifier l'OTP via Supabase
    const { data, error } = await this.supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: otp,
      type: 'sms',
    });

    if (error || !data?.user) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const supabaseUser = data.user;

    // Chercher ou créer l'utilisateur dans notre DB
    let user = await this.userRepository.findOne({
      where: [
        { phoneNumber },
        { supabaseUserId: supabaseUser.id },
      ],
      relations: ['center'],
    });

    const isNewUser = !user;

    if (!user) {
      // Créer un nouvel utilisateur
      user = this.userRepository.create({
        phoneNumber,
        supabaseUserId: supabaseUser.id,
        displayName: phoneNumber, // Par défaut, sera mis à jour lors du complete-profile
        phoneVerified: true,
        preferredLanguage: Language.FR,
        isFirstTimer: true,
      });

      user = await this.userRepository.save(user);
    } else {
      // Mettre à jour les infos si nécessaire
      if (!user.supabaseUserId) {
        user.supabaseUserId = supabaseUser.id;
        user.phoneVerified = true;
        await this.userRepository.save(user);
      }
    }

    // Générer les tokens JWT
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Vérifier si le profil est complet
    // Un utilisateur doit compléter son profil s'il est nouveau OU si les informations essentielles manquent
    // Pour phone auth, displayName = phoneNumber par défaut, donc on vérifie aussi ça
    const needsProfileCompletion = isNewUser || !user.displayName || user.displayName === phoneNumber || !user.city || !user.country;

    return {
      user,
      accessToken,
      refreshToken,
      needsProfileCompletion,
    };
  }

  /**
   * Complete Profile
   * Compléter le profil de l'utilisateur après la première connexion
   */
  async completeProfile(
    userId: string,
    completeProfileDto: CompleteProfileDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Mettre à jour le profil
    Object.assign(user, completeProfileDto);

    return this.userRepository.save(user);
  }

  /**
   * Refresh Token
   * Rafraîchir l'access token avec le refresh token
   */
  async refresh(user: User): Promise<Omit<AuthUserResponseDto, 'user' | 'needsProfileCompletion'>> {
    // Générer de nouveaux tokens (rotation des tokens pour la sécurité)
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logout
   * Déconnexion de l'utilisateur (supprimer son FCM token)
   */
  async logout(
    userId: string,
    fcmToken?: string,
  ): Promise<{ message: string }> {
    // Si un FCM token est fourni, le supprimer
    if (fcmToken) {
      await this.fcmTokenRepository.delete({
        userId,
        token: fcmToken,
      });
    }

    return { message: 'Logout successful' };
  }

  /**
   * Get Current User
   * Récupérer le profil de l'utilisateur connecté
   */
  async getMe(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update Profile
   * Mettre à jour le profil de l'utilisateur connecté
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Mettre à jour les champs fournis
    Object.assign(user, updateProfileDto);

    return this.userRepository.save(user);
  }

  /**
   * Generate Access Token
   * Générer un access token JWT (expire dans 7 jours)
   */
  private generateAccessToken(user: User): string {
    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      preferredLanguage: user.preferredLanguage,
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_USER_SECRET'),
      expiresIn: '7d', // 7 jours
    });
  }

  /**
   * Generate Refresh Token
   * Générer un refresh token JWT (expire dans 30 jours)
   */
  private generateRefreshToken(user: User): string {
    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      preferredLanguage: user.preferredLanguage,
      type: 'refresh',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_USER_REFRESH_SECRET'),
      expiresIn: '30d', // 30 jours
    });
  }
}

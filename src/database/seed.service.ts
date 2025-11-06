import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminsService } from '../admins/admins.service';
import { AdminRole } from '../common/enums';
import {
  NotificationTemplate,
  NotificationTemplateTrigger,
  NotificationTemplateCategory,
} from '../entities/notification-template.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly adminsService: AdminsService,
    private readonly configService: ConfigService,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
  ) {}

  /**
   * This method is called when the module is initialized
   * It seeds the super admin and notification templates if they don't exist
   */
  async onModuleInit() {
    await this.seedSuperAdmin();
    await this.seedNotificationTemplates();
  }

  /**
   * Seed the super admin account from environment variables
   */
  private async seedSuperAdmin(): Promise<void> {
    try {
      const superAdminEmail = this.configService.get<string>(
        'SUPER_ADMIN_EMAIL',
      );

      if (!superAdminEmail) {
        this.logger.warn(
          'SUPER_ADMIN_EMAIL not found in environment variables. Skipping super admin seeding.',
        );
        return;
      }

      // Check if super admin already exists
      const existingAdmin =
        await this.adminsService.findByEmail(superAdminEmail);

      if (existingAdmin) {
        this.logger.log(
          `Super admin already exists with email: ${superAdminEmail}`,
        );
        return;
      }

      // Get super admin credentials from environment
      const password = this.configService.get<string>('SUPER_ADMIN_PASSWORD');
      const firstName = this.configService.get<string>(
        'SUPER_ADMIN_FIRST_NAME',
      );
      const lastName = this.configService.get<string>('SUPER_ADMIN_LAST_NAME');

      if (!password || !firstName || !lastName) {
        this.logger.error(
          'Super admin credentials incomplete in environment variables. Required: SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_FIRST_NAME, SUPER_ADMIN_LAST_NAME',
        );
        return;
      }

      // Create super admin
      const superAdmin = await this.adminsService.create({
        email: superAdminEmail,
        password,
        firstName,
        lastName,
        role: AdminRole.SUPER_ADMIN,
        permissions: ['*'], // All permissions
      });

      this.logger.log(
        `✅ Super admin created successfully with email: ${superAdmin.email}`,
      );
      this.logger.log(
        `   Name: ${superAdmin.firstName} ${superAdmin.lastName}`,
      );
      this.logger.log(`   Role: ${superAdmin.role}`);
      this.logger.log(
        `   Please change the default password after first login!`,
      );
    } catch (error) {
      this.logger.error('Failed to seed super admin:', error.message);
      // Don't throw error to prevent app from crashing during startup
    }
  }

  /**
   * Seed default notification templates (system templates)
   */
  private async seedNotificationTemplates(): Promise<void> {
    try {
      // Check if templates already exist
      const existingCount = await this.templateRepository.count();

      if (existingCount > 0) {
        this.logger.log(
          `Notification templates already exist (${existingCount} templates). Skipping seeding.`,
        );
        return;
      }

      this.logger.log('Seeding notification templates...');

      const templates = [
        // ==================== DONATION TEMPLATES ====================
        {
          trigger: NotificationTemplateTrigger.DONATION_CONFIRMED,
          category: NotificationTemplateCategory.DONATION,
          name: 'Don confirmé',
          description:
            'Notification générique envoyée lors de la confirmation d\'un don',
          titleFr: 'Merci {firstName} pour votre don ! 🙏',
          titleEn: 'Thank you {firstName} for your donation! 🙏',
          bodyFr:
            'Nous avons bien reçu votre don de {amount} XAF pour {fundName}. Que Dieu vous bénisse pour votre générosité.',
          bodyEn:
            'We have received your donation of {amount} XAF for {fundName}. May God bless you for your generosity.',
          bibleVerseFr:
            '« Chacun donne comme il a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie. » - 2 Corinthiens 9:7',
          bibleVerseEn:
            '« Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver. » - 2 Corinthians 9:7',
          variables: ['firstName', 'amount', 'currency', 'fundName'],
          exampleValues: {
            firstName: 'Jean',
            amount: '10000',
            currency: 'XAF',
            fundName: 'Construction église',
          },
          isSystem: true,
          isActive: true,
          priority: 0,
        },
        {
          trigger: NotificationTemplateTrigger.DONATION_FIRST,
          category: NotificationTemplateCategory.DONATION,
          name: 'Premier don',
          description: 'Message spécial pour le tout premier don d\'un utilisateur',
          titleFr: '🎉 Félicitations {firstName} pour votre premier don !',
          titleEn: '🎉 Congratulations {firstName} on your first donation!',
          bodyFr:
            'Bienvenue dans la famille des donateurs ! Votre premier don de {amount} XAF pour {fundName} est un pas de foi important. Que Dieu multiplie votre semence.',
          bodyEn:
            'Welcome to the donors family! Your first donation of {amount} XAF for {fundName} is an important step of faith. May God multiply your seed.',
          bibleVerseFr:
            '« Donnez, et il vous sera donné : on versera dans votre sein une bonne mesure, serrée, secouée et qui déborde. » - Luc 6:38',
          bibleVerseEn:
            '« Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap. » - Luke 6:38',
          variables: ['firstName', 'amount', 'currency', 'fundName'],
          exampleValues: {
            firstName: 'Marie',
            amount: '5000',
            currency: 'XAF',
            fundName: 'Offrande du dimanche',
          },
          isSystem: true,
          isActive: true,
          priority: 10,
        },
        {
          trigger: NotificationTemplateTrigger.DONATION_MILESTONE,
          category: NotificationTemplateCategory.DONATION,
          name: 'Jalon de don atteint',
          description:
            'Envoyé lors d\'un jalon significatif (5ème, 10ème, 25ème, 50ème, 100ème don)',
          titleFr: '🎊 Votre {donationCount}ème don, {firstName} !',
          titleEn: '🎊 Your {donationCount}th donation, {firstName}!',
          bodyFr:
            'Quel fidélité remarquable ! C\'est votre {donationCount}ème don pour un total de {totalAmount} XAF. Vous êtes une bénédiction pour l\'église.',
          bodyEn:
            'What remarkable faithfulness! This is your {donationCount}th donation for a total of {totalAmount} XAF. You are a blessing to the church.',
          bibleVerseFr:
            '« Soyez fermes, inébranlables, travaillant de mieux en mieux à l\'œuvre du Seigneur, sachant que votre travail ne sera pas vain dans le Seigneur. » - 1 Corinthiens 15:58',
          bibleVerseEn:
            '« Stand firm. Let nothing move you. Always give yourselves fully to the work of the Lord, because you know that your labor in the Lord is not in vain. » - 1 Corinthians 15:58',
          variables: [
            'firstName',
            'amount',
            'donationCount',
            'totalAmount',
            'currency',
          ],
          exampleValues: {
            firstName: 'Paul',
            amount: '15000',
            donationCount: '10',
            totalAmount: '150000',
            currency: 'XAF',
          },
          isSystem: true,
          isActive: true,
          priority: 15,
        },
        {
          trigger: NotificationTemplateTrigger.DONATION_TITHE,
          category: NotificationTemplateCategory.DONATION,
          name: 'Don de dîme',
          description: 'Notification spécifique pour les dons de dîme',
          titleFr: 'Merci {firstName} pour votre dîme 🙏',
          titleEn: 'Thank you {firstName} for your tithe 🙏',
          bodyFr:
            'Votre dîme de {amount} XAF a été reçue avec gratitude. En honorant Dieu avec vos prémices, vous ouvrez les écluses des cieux.',
          bodyEn:
            'Your tithe of {amount} XAF has been received with gratitude. By honoring God with your firstfruits, you open the floodgates of heaven.',
          bibleVerseFr:
            '« Apportez à la maison du trésor toutes les dîmes, afin qu\'il y ait de la nourriture dans ma maison ; mettez-moi de la sorte à l\'épreuve, dit l\'Éternel des armées. Et vous verrez si je n\'ouvre pas pour vous les écluses des cieux. » - Malachie 3:10',
          bibleVerseEn:
            '« Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this, says the LORD Almighty, and see if I will not throw open the floodgates of heaven. » - Malachi 3:10',
          variables: ['firstName', 'amount', 'currency'],
          exampleValues: {
            firstName: 'Sarah',
            amount: '25000',
            currency: 'XAF',
          },
          isSystem: true,
          isActive: true,
          priority: 5,
        },
        {
          trigger: NotificationTemplateTrigger.DONATION_OFFERING,
          category: NotificationTemplateCategory.DONATION,
          name: 'Don d\'offrande',
          description: 'Notification spécifique pour les offrandes',
          titleFr: 'Merci {firstName} pour votre offrande ! 💝',
          titleEn: 'Thank you {firstName} for your offering! 💝',
          bodyFr:
            'Votre offrande de {amount} XAF a été reçue avec joie. Que Dieu vous rende au centuple selon sa richesse et sa gloire.',
          bodyEn:
            'Your offering of {amount} XAF has been received with joy. May God return it to you a hundredfold according to His riches and glory.',
          bibleVerseFr:
            '« Et mon Dieu pourvoira à tous vos besoins selon sa richesse, avec gloire, en Jésus Christ. » - Philippiens 4:19',
          bibleVerseEn:
            '« And my God will meet all your needs according to the riches of his glory in Christ Jesus. » - Philippians 4:19',
          variables: ['firstName', 'amount', 'currency'],
          exampleValues: {
            firstName: 'David',
            amount: '8000',
            currency: 'XAF',
          },
          isSystem: true,
          isActive: true,
          priority: 5,
        },
        {
          trigger: NotificationTemplateTrigger.DONATION_CAMPAIGN,
          category: NotificationTemplateCategory.DONATION,
          name: 'Don à une campagne',
          description:
            'Notification pour les dons à une campagne de financement spécifique',
          titleFr: 'Merci {firstName} pour votre soutien ! 🎯',
          titleEn: 'Thank you {firstName} for your support! 🎯',
          bodyFr:
            'Votre don de {amount} XAF pour la campagne "{fundName}" nous rapproche de l\'objectif ! Progression : {fundProgress}%. Ensemble, nous bâtissons le royaume.',
          bodyEn:
            'Your donation of {amount} XAF for the "{fundName}" campaign brings us closer to the goal! Progress: {fundProgress}%. Together, we build the kingdom.',
          bibleVerseFr:
            '« Ainsi donc, pendant que nous en avons l\'occasion, pratiquons le bien envers tous. » - Galates 6:10',
          bibleVerseEn:
            '« Therefore, as we have opportunity, let us do good to all people. » - Galatians 6:10',
          variables: ['firstName', 'amount', 'fundName', 'fundProgress', 'currency'],
          exampleValues: {
            firstName: 'Ruth',
            amount: '20000',
            fundName: 'Construction nouvelle aile',
            fundProgress: '67',
            currency: 'XAF',
          },
          isSystem: true,
          isActive: true,
          priority: 5,
        },
        {
          trigger: NotificationTemplateTrigger.DONATION_CAMPAIGN_GOAL_REACHED,
          category: NotificationTemplateCategory.DONATION,
          name: 'Objectif de campagne atteint',
          description:
            'Notification envoyée lorsqu\'une campagne atteint son objectif',
          titleFr: '🎉 Objectif atteint pour {fundName} !',
          titleEn: '🎉 Goal reached for {fundName}!',
          bodyFr:
            'Gloire à Dieu ! Grâce à votre fidélité et celle de nombreux donateurs, nous avons atteint l\'objectif de {totalAmount} XAF pour {fundName}. Que Dieu vous bénisse !',
          bodyEn:
            'Glory to God! Thanks to your faithfulness and that of many donors, we have reached the goal of {totalAmount} XAF for {fundName}. May God bless you!',
          bibleVerseFr:
            '« Je puis tout par celui qui me fortifie. » - Philippiens 4:13',
          bibleVerseEn:
            '« I can do all this through him who gives me strength. » - Philippians 4:13',
          variables: ['fundName', 'totalAmount', 'currency'],
          exampleValues: {
            fundName: 'Construction nouvelle aile',
            totalAmount: '5000000',
            currency: 'XAF',
          },
          isSystem: true,
          isActive: true,
          priority: 20,
        },
        {
          trigger: NotificationTemplateTrigger.DONATION_LARGE_AMOUNT,
          category: NotificationTemplateCategory.DONATION,
          name: 'Don d\'un montant important',
          description: 'Notification pour les dons de montant élevé (≥ 50,000 XAF)',
          titleFr: '⭐ Que Dieu vous bénisse {firstName} !',
          titleEn: '⭐ May God bless you {firstName}!',
          bodyFr:
            'Votre générosité exceptionnelle de {amount} XAF pour {fundName} témoigne d\'un cœur noble. Que le Seigneur vous rende au centuple et vous comble de ses bénédictions.',
          bodyEn:
            'Your exceptional generosity of {amount} XAF for {fundName} testifies to a noble heart. May the Lord return it to you a hundredfold and shower you with His blessings.',
          bibleVerseFr:
            '« Celui qui est généreux sera béni, car il donne de son pain au pauvre. » - Proverbes 22:9',
          bibleVerseEn:
            '« The generous will themselves be blessed, for they share their food with the poor. » - Proverbs 22:9',
          variables: ['firstName', 'amount', 'fundName', 'currency'],
          exampleValues: {
            firstName: 'Emmanuel',
            amount: '100000',
            fundName: 'Mission évangélisation',
            currency: 'XAF',
          },
          isSystem: true,
          isActive: true,
          priority: 25,
        },

        // ==================== EVENT TEMPLATES ====================
        {
          trigger: NotificationTemplateTrigger.EVENT_CREATED,
          category: NotificationTemplateCategory.EVENT,
          name: 'Nouvel événement créé',
          description: 'Notification envoyée lors de la création d\'un nouvel événement',
          titleFr: '📅 Nouvel événement : {eventTitle}',
          titleEn: '📅 New event: {eventTitle}',
          bodyFr:
            'Rejoignez-nous le {eventDate} à {eventTime} pour {eventTitle}. Lieu : {eventLocation}. Venez nombreux !',
          bodyEn:
            'Join us on {eventDate} at {eventTime} for {eventTitle}. Location: {eventLocation}. Come in large numbers!',
          bibleVerseFr:
            '« Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d\'eux. » - Matthieu 18:20',
          bibleVerseEn:
            '« For where two or three gather in my name, there am I with them. » - Matthew 18:20',
          variables: ['eventTitle', 'eventDate', 'eventTime', 'eventLocation'],
          exampleValues: {
            eventTitle: 'Culte du dimanche',
            eventDate: '15 Janvier 2025',
            eventTime: '10:00',
            eventLocation: 'IFA Church Yaoundé',
          },
          isSystem: true,
          isActive: true,
          priority: 10,
        },
        {
          trigger: NotificationTemplateTrigger.EVENT_STARTING_SOON,
          category: NotificationTemplateCategory.EVENT,
          name: 'Événement bientôt',
          description: 'Rappel envoyé 1 heure avant le début d\'un événement',
          titleFr: '⏰ {eventTitle} commence bientôt !',
          titleEn: '⏰ {eventTitle} starting soon!',
          bodyFr:
            '{eventTitle} commence dans 1 heure à {eventTime}. Préparez-vous et rendez-vous à {eventLocation} !',
          bodyEn:
            '{eventTitle} starts in 1 hour at {eventTime}. Get ready and meet us at {eventLocation}!',
          bibleVerseFr:
            '« N\'abandonnons pas notre assemblée, comme c\'est la coutume de quelques-uns. » - Hébreux 10:25',
          bibleVerseEn:
            '« Not giving up meeting together, as some are in the habit of doing. » - Hebrews 10:25',
          variables: ['eventTitle', 'eventTime', 'eventLocation'],
          exampleValues: {
            eventTitle: 'Réunion de prière',
            eventTime: '18:00',
            eventLocation: 'Salle de prière',
          },
          isSystem: true,
          isActive: true,
          priority: 15,
        },
        {
          trigger: NotificationTemplateTrigger.EVENT_REMINDER,
          category: NotificationTemplateCategory.EVENT,
          name: 'Rappel d\'événement',
          description: 'Rappel général pour un événement à venir',
          titleFr: '🔔 Rappel : {eventTitle}',
          titleEn: '🔔 Reminder: {eventTitle}',
          bodyFr:
            'N\'oubliez pas {eventTitle} le {eventDate} à {eventTime}. Marquez votre calendrier !',
          bodyEn:
            'Don\'t forget {eventTitle} on {eventDate} at {eventTime}. Mark your calendar!',
          variables: ['eventTitle', 'eventDate', 'eventTime'],
          exampleValues: {
            eventTitle: 'Conférence annuelle',
            eventDate: '20 Décembre 2025',
            eventTime: '15:00',
          },
          isSystem: true,
          isActive: true,
          priority: 5,
        },

        // ==================== PRAYER TEMPLATES ====================
        {
          trigger: NotificationTemplateTrigger.PRAYER_REACTION,
          category: NotificationTemplateCategory.PRAYER,
          name: 'Réaction à une prière',
          description:
            'Notification envoyée lorsque quelqu\'un prie ou jeûne pour une demande',
          titleFr: '🙏 {prayerCount} personnes ont prié pour vous !',
          titleEn: '🙏 {prayerCount} people prayed for you!',
          bodyFr:
            'La communauté est avec vous ! {prayerCount} personnes ont prié et {fastedCount} ont jeûné pour votre demande. Que Dieu vous exauce.',
          bodyEn:
            'The community is with you! {prayerCount} people prayed and {fastedCount} fasted for your request. May God answer you.',
          bibleVerseFr:
            '« La prière fervente du juste a une grande efficacité. » - Jacques 5:16',
          bibleVerseEn:
            '« The prayer of a righteous person is powerful and effective. » - James 5:16',
          variables: ['prayerCount', 'fastedCount'],
          exampleValues: {
            prayerCount: '12',
            fastedCount: '3',
          },
          isSystem: true,
          isActive: true,
          priority: 10,
        },

        // ==================== TESTIMONY TEMPLATES ====================
        {
          trigger: NotificationTemplateTrigger.TESTIMONY_APPROVED,
          category: NotificationTemplateCategory.TESTIMONY,
          name: 'Témoignage approuvé',
          description:
            'Notification envoyée lorsqu\'un témoignage est approuvé par un admin',
          titleFr: '✅ Votre témoignage a été approuvé !',
          titleEn: '✅ Your testimony has been approved!',
          bodyFr:
            'Félicitations {firstName} ! Votre témoignage a été approuvé et est maintenant visible par toute la communauté. Continuez à témoigner de la bonté de Dieu.',
          bodyEn:
            'Congratulations {firstName}! Your testimony has been approved and is now visible to the entire community. Keep testifying of God\'s goodness.',
          bibleVerseFr:
            '« Ils l\'ont vaincu à cause du sang de l\'agneau et à cause de la parole de leur témoignage. » - Apocalypse 12:11',
          bibleVerseEn:
            '« They triumphed over him by the blood of the Lamb and by the word of their testimony. » - Revelation 12:11',
          variables: ['firstName'],
          exampleValues: {
            firstName: 'Esther',
          },
          isSystem: true,
          isActive: true,
          priority: 10,
        },
        {
          trigger: NotificationTemplateTrigger.TESTIMONY_REJECTED,
          category: NotificationTemplateCategory.TESTIMONY,
          name: 'Témoignage rejeté',
          description: 'Notification envoyée lorsqu\'un témoignage est rejeté',
          titleFr: '📝 Témoignage non publié',
          titleEn: '📝 Testimony not published',
          bodyFr:
            'Bonjour {firstName}, votre témoignage n\'a pas pu être publié car il ne respecte pas nos directives. N\'hésitez pas à le modifier et le soumettre à nouveau.',
          bodyEn:
            'Hello {firstName}, your testimony could not be published as it does not comply with our guidelines. Feel free to modify and resubmit it.',
          variables: ['firstName'],
          exampleValues: {
            firstName: 'Joseph',
          },
          isSystem: true,
          isActive: true,
          priority: 5,
        },

        // ==================== GENERAL TEMPLATES ====================
        {
          trigger: NotificationTemplateTrigger.WELCOME_MESSAGE,
          category: NotificationTemplateCategory.GENERAL,
          name: 'Message de bienvenue',
          description:
            'Notification de bienvenue envoyée lors de l\'inscription d\'un nouvel utilisateur',
          titleFr: '👋 Bienvenue {displayName} !',
          titleEn: '👋 Welcome {displayName}!',
          bodyFr:
            'Bienvenue dans la famille IFA ! Nous sommes ravis de vous compter parmi nous. Que Dieu vous bénisse et vous accompagne dans votre parcours de foi.',
          bodyEn:
            'Welcome to the IFA family! We are delighted to have you with us. May God bless you and accompany you on your faith journey.',
          bibleVerseFr:
            '« Vous êtes tous fils de Dieu par la foi en Jésus Christ. » - Galates 3:26',
          bibleVerseEn:
            '« So in Christ Jesus you are all children of God through faith. » - Galatians 3:26',
          variables: ['firstName', 'displayName'],
          exampleValues: {
            firstName: 'Pierre',
            displayName: 'Pierre Martin',
          },
          isSystem: true,
          isActive: true,
          priority: 20,
        },
        {
          trigger: NotificationTemplateTrigger.MONTHLY_REPORT,
          category: NotificationTemplateCategory.GENERAL,
          name: 'Rapport mensuel',
          description: 'Rapport mensuel des activités et contributions de l\'utilisateur',
          titleFr: '📊 Votre rapport mensuel, {firstName}',
          titleEn: '📊 Your monthly report, {firstName}',
          bodyFr:
            'Ce mois-ci : {donationCount} dons pour un total de {totalAmount} XAF. Merci pour votre fidélité ! Que Dieu continue de vous bénir abondamment.',
          bodyEn:
            'This month: {donationCount} donations for a total of {totalAmount} XAF. Thank you for your faithfulness! May God continue to bless you abundantly.',
          bibleVerseFr:
            '« Dieu aime celui qui donne avec joie. » - 2 Corinthiens 9:7',
          bibleVerseEn:
            '« God loves a cheerful giver. » - 2 Corinthians 9:7',
          variables: ['firstName', 'donationCount', 'totalAmount', 'currency'],
          exampleValues: {
            firstName: 'André',
            donationCount: '4',
            totalAmount: '45000',
            currency: 'XAF',
          },
          isSystem: true,
          isActive: true,
          priority: 5,
        },
      ];

      // Create all templates
      for (const templateData of templates) {
        const template = this.templateRepository.create(templateData);
        await this.templateRepository.save(template);
      }

      this.logger.log(
        `✅ Successfully seeded ${templates.length} notification templates`,
      );
      this.logger.log(
        `   - ${templates.filter((t) => t.category === 'donation').length} donation templates`,
      );
      this.logger.log(
        `   - ${templates.filter((t) => t.category === 'event').length} event templates`,
      );
      this.logger.log(
        `   - ${templates.filter((t) => t.category === 'prayer').length} prayer templates`,
      );
      this.logger.log(
        `   - ${templates.filter((t) => t.category === 'testimony').length} testimony templates`,
      );
      this.logger.log(
        `   - ${templates.filter((t) => t.category === 'general').length} general templates`,
      );
    } catch (error) {
      this.logger.error('Failed to seed notification templates:', error.message);
      // Don't throw error to prevent app from crashing during startup
    }
  }
}

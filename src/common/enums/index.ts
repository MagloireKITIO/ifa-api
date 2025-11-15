// App Settings Category
export enum AppSettingsCategory {
  PAYMENT = 'payment',
  NOTIFICATION = 'notification',
  STORAGE = 'storage',
  I18N = 'i18n',
  SECURITY = 'security',
  GENERAL = 'general',
  AI = 'ai',
}

// Admin Role
export enum AdminRole {
  SUPER_ADMIN = 'super-admin',
  ADMIN = 'admin',
}

// Event Type
export enum EventType {
  CRUSADE = 'crusade',
  SUNDAY_SERVICE = 'sunday_service',
  WORSHIP = 'worship',
  OTHER = 'other',
}

// Event Status
export enum EventStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  PAST = 'past',
}

// Testimony Status - Removed (testimonies are now published directly)
// export enum TestimonyStatus {
//   PENDING = 'pending',
//   APPROVED = 'approved',
//   REJECTED = 'rejected',
//   AUTO_APPROVED = 'auto_approved',
//   AUTO_REJECTED = 'auto_rejected',
// }

// Fund Type
export enum FundType {
  TITHE = 'tithe',
  OFFERING = 'offering',
  CAMPAIGN = 'campaign',
}

// Fund Status
export enum FundStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

// Donation Status
export enum DonationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Prayer Status
export enum PrayerStatus {
  ACTIVE = 'active',
  ANSWERED = 'answered',
  CLOSED = 'closed',
}

// Prayer Reaction Type
export enum PrayerReactionType {
  PRAYED = 'prayed',
  FASTED = 'fasted',
}

// Notification Type
export enum NotificationType {
  EVENT = 'event',
  PRAYER = 'prayer',
  TESTIMONY = 'testimony',
  DONATION = 'donation',
  ADMIN_MESSAGE = 'admin_message',
}

// Language
export enum Language {
  FR = 'fr',
  EN = 'en',
}

// Admin Permissions - Granular CRUD permissions for each module
export enum AdminPermission {
  // Events permissions
  EVENTS_READ = 'events:read',
  EVENTS_CREATE = 'events:create',
  EVENTS_UPDATE = 'events:update',
  EVENTS_DELETE = 'events:delete',

  // Testimonies permissions
  TESTIMONIES_READ = 'testimonies:read',
  TESTIMONIES_CREATE = 'testimonies:create',
  TESTIMONIES_UPDATE = 'testimonies:update',
  TESTIMONIES_DELETE = 'testimonies:delete',
  TESTIMONIES_MODERATE = 'testimonies:moderate', // Approve/reject

  // Funds permissions
  FUNDS_READ = 'funds:read',
  FUNDS_CREATE = 'funds:create',
  FUNDS_UPDATE = 'funds:update',
  FUNDS_DELETE = 'funds:delete',
  FUNDS_WITHDRAW = 'funds:withdraw', // Withdraw money

  // Donations permissions
  DONATIONS_READ = 'donations:read',
  DONATIONS_CREATE = 'donations:create',
  DONATIONS_UPDATE = 'donations:update',
  DONATIONS_DELETE = 'donations:delete',

  // Prayers permissions
  PRAYERS_READ = 'prayers:read',
  PRAYERS_CREATE = 'prayers:create',
  PRAYERS_UPDATE = 'prayers:update',
  PRAYERS_DELETE = 'prayers:delete',
  PRAYERS_MODERATE = 'prayers:moderate', // Moderate inappropriate content

  // Centers permissions
  CENTERS_READ = 'centers:read',
  CENTERS_CREATE = 'centers:create',
  CENTERS_UPDATE = 'centers:update',
  CENTERS_DELETE = 'centers:delete',

  // Admins permissions (only super-admin can manage admins)
  ADMINS_READ = 'admins:read',
  ADMINS_CREATE = 'admins:create',
  ADMINS_UPDATE = 'admins:update',
  ADMINS_DELETE = 'admins:delete',

  // Notifications permissions
  NOTIFICATIONS_READ = 'notifications:read',
  NOTIFICATIONS_CREATE = 'notifications:create',
  NOTIFICATIONS_UPDATE = 'notifications:update',
  NOTIFICATIONS_DELETE = 'notifications:delete',
  NOTIFICATIONS_SEND = 'notifications:send', // Send push notifications

  // Settings permissions (only super-admin)
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',
  SETTINGS_DELETE = 'settings:delete',
}

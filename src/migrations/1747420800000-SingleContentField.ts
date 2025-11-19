import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration pour passer de contentFr/contentEn à un seul champ content
 *
 * CHANGEMENTS:
 * 1. prayers: contentFr + contentEn → content
 * 2. prayers: testimonyContentFr + testimonyContentEn → testimonyContent
 * 3. testimonies: contentFr + contentEn → content
 *
 * STRATÉGIE:
 * - Créer les nouvelles colonnes
 * - Migrer les données (prendre contentFr || contentEn)
 * - Supprimer les anciennes colonnes
 */
export class SingleContentField1747420800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== PRAYERS TABLE =====

    // 1. Ajouter la colonne content
    await queryRunner.query(`
      ALTER TABLE "prayers"
      ADD COLUMN "content" text
    `);

    // 2. Migrer les données (prendre contentFr en priorité, sinon contentEn)
    await queryRunner.query(`
      UPDATE "prayers"
      SET "content" = COALESCE("contentFr", "contentEn")
    `);

    // 3. Rendre la colonne NOT NULL maintenant qu'elle est remplie
    await queryRunner.query(`
      ALTER TABLE "prayers"
      ALTER COLUMN "content" SET NOT NULL
    `);

    // 4. Supprimer les anciennes colonnes
    await queryRunner.query(`
      ALTER TABLE "prayers"
      DROP COLUMN "contentFr",
      DROP COLUMN "contentEn"
    `);

    // 5. Ajouter la colonne testimonyContent
    await queryRunner.query(`
      ALTER TABLE "prayers"
      ADD COLUMN "testimonyContent" text
    `);

    // 6. Migrer les données testimony
    await queryRunner.query(`
      UPDATE "prayers"
      SET "testimonyContent" = COALESCE("testimonyContentFr", "testimonyContentEn")
      WHERE "testimonyContentFr" IS NOT NULL OR "testimonyContentEn" IS NOT NULL
    `);

    // 7. Supprimer les anciennes colonnes testimony
    await queryRunner.query(`
      ALTER TABLE "prayers"
      DROP COLUMN "testimonyContentFr",
      DROP COLUMN "testimonyContentEn"
    `);

    // ===== TESTIMONIES TABLE =====

    // 1. Ajouter la colonne content
    await queryRunner.query(`
      ALTER TABLE "testimonies"
      ADD COLUMN "content" text
    `);

    // 2. Migrer les données
    await queryRunner.query(`
      UPDATE "testimonies"
      SET "content" = COALESCE("contentFr", "contentEn")
    `);

    // 3. Rendre NOT NULL
    await queryRunner.query(`
      ALTER TABLE "testimonies"
      ALTER COLUMN "content" SET NOT NULL
    `);

    // 4. Supprimer les anciennes colonnes
    await queryRunner.query(`
      ALTER TABLE "testimonies"
      DROP COLUMN "contentFr",
      DROP COLUMN "contentEn"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ROLLBACK: Recréer contentFr et contentEn

    // ===== PRAYERS =====
    await queryRunner.query(`
      ALTER TABLE "prayers"
      ADD COLUMN "contentFr" text,
      ADD COLUMN "contentEn" text
    `);

    // Copier content vers contentFr (on ne peut pas deviner la langue)
    await queryRunner.query(`
      UPDATE "prayers"
      SET "contentFr" = "content"
      WHERE "language" = 'fr'
    `);

    await queryRunner.query(`
      UPDATE "prayers"
      SET "contentEn" = "content"
      WHERE "language" = 'en'
    `);

    await queryRunner.query(`
      ALTER TABLE "prayers"
      DROP COLUMN "content"
    `);

    // Testimony
    await queryRunner.query(`
      ALTER TABLE "prayers"
      ADD COLUMN "testimonyContentFr" text,
      ADD COLUMN "testimonyContentEn" text
    `);

    await queryRunner.query(`
      UPDATE "prayers"
      SET "testimonyContentFr" = "testimonyContent"
      WHERE "language" = 'fr' AND "testimonyContent" IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "prayers"
      SET "testimonyContentEn" = "testimonyContent"
      WHERE "language" = 'en' AND "testimonyContent" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "prayers"
      DROP COLUMN "testimonyContent"
    `);

    // ===== TESTIMONIES =====
    await queryRunner.query(`
      ALTER TABLE "testimonies"
      ADD COLUMN "contentFr" text,
      ADD COLUMN "contentEn" text
    `);

    await queryRunner.query(`
      UPDATE "testimonies"
      SET "contentFr" = "content"
      WHERE "language" = 'fr'
    `);

    await queryRunner.query(`
      UPDATE "testimonies"
      SET "contentEn" = "content"
      WHERE "language" = 'en'
    `);

    await queryRunner.query(`
      ALTER TABLE "testimonies"
      DROP COLUMN "content"
    `);
  }
}

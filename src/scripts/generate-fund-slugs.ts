import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Fund } from '../entities/fund.entity';
import { PaymentLinkService } from '../common/services';
import { Repository } from 'typeorm';

/**
 * Script to generate slugs for existing funds
 * Run with: npm run ts-node src/scripts/generate-fund-slugs.ts
 */
async function generateFundSlugs() {
  console.log('Starting fund slug generation...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const fundRepository = app.get<Repository<Fund>>(getRepositoryToken(Fund));
  const paymentLinkService = new PaymentLinkService();

  try {
    // Find all funds without slug
    const fundsWithoutSlug = await fundRepository.find({
      where: { slug: null as any },
    });

    console.log(`Found ${fundsWithoutSlug.length} funds without slug`);

    if (fundsWithoutSlug.length === 0) {
      console.log('All funds already have slugs!');
      await app.close();
      return;
    }

    // Generate slugs
    for (const fund of fundsWithoutSlug) {
      // Generate slug from titleEn + timestamp for uniqueness
      const timestamp = Date.now().toString().slice(-6);
      let slug = paymentLinkService.generateSlug(fund.titleEn, timestamp);

      // Check if slug already exists
      let existingFund = await fundRepository.findOne({ where: { slug } });
      if (existingFund) {
        // If exists, append random suffix
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        slug = paymentLinkService.generateSlug(fund.titleEn, randomSuffix);
      }

      // Update fund with slug
      fund.slug = slug;
      await fundRepository.save(fund);

      console.log(`✓ Generated slug for "${fund.titleEn}": ${slug}`);
    }

    console.log('\n✅ Successfully generated slugs for all funds!');
  } catch (error) {
    console.error('❌ Error generating slugs:', error);
    throw error;
  } finally {
    await app.close();
  }
}

generateFundSlugs()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

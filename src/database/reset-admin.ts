import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config();

async function resetSuperAdmin() {
  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    schema: process.env.DB_SCHEMA || 'public',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@ifa.church';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!@#';
    const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
    const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

    console.log(`\n🗑️  Deleting existing admin with email: ${email}`);
    await dataSource.query('DELETE FROM admins WHERE email = $1', [email]);
    console.log('✅ Existing admin deleted');

    console.log('\n🔐 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('✅ Password hashed');

    console.log(`\n👤 Creating new super admin...`);
    const result = await dataSource.query(
      `INSERT INTO admins (email, password, "firstName", "lastName", role, permissions, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, email, "firstName", "lastName", role`,
      [email, hashedPassword, firstName, lastName, 'super-admin', '*', true],
    );

    console.log('✅ Super admin created successfully!');
    console.log('\n📋 Admin Details:');
    console.log(`   ID: ${result[0].id}`);
    console.log(`   Email: ${result[0].email}`);
    console.log(`   Name: ${result[0].firstName} ${result[0].lastName}`);
    console.log(`   Role: ${result[0].role}`);
    console.log(`\n🔑 Login Credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Please change the password after first login!\n');

    await dataSource.destroy();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await dataSource.destroy();
    process.exit(1);
  }
}

resetSuperAdmin();

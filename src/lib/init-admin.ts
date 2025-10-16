import { DatabaseService } from './database';
import { hashPassword } from './auth-utils';

export async function initializeAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await DatabaseService.getAuthUser('admin');
    if (existingAdmin) {
      return existingAdmin;
    }

    // Create admin user
    const hashedPassword = await hashPassword('admin');
    const adminUser = await DatabaseService.createAuthUser({
      username: 'admin',
      password: hashedPassword,
      type: 'owner',
      name: 'System Administrator'
    });

    return adminUser;
  } catch (error) {
    console.error('Error initializing admin user:', error);
    throw error;
  }
}

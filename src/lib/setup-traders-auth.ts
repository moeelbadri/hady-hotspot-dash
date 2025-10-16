import { DatabaseService } from './database';
import { hashPassword } from './auth-utils';

export async function setupTradersAuth() {
  
  const traders = [
    {
      phone: '972592790902',
      name: 'mohamed',
      username: 'mohamed',
      password: 'mohamed123'
    },
    {
      phone: '22244974444', 
      name: 'hady',
      username: 'hady',
      password: 'hady123'
    }
  ];

  for (const trader of traders) {
    try {
      // Check if auth user already exists
      const existingUser = await DatabaseService.getAuthUser(trader.username);
      if (existingUser) {
        continue;
      }

      // Create auth user for trader
      const hashedPassword = await hashPassword(trader.password);
      const authUser = await DatabaseService.createAuthUser({
        username: trader.username,
        password: hashedPassword,
        type: 'trader',
        phone: trader.phone,
        name: trader.name
      });

    } catch (error) {
      console.error(`❌ Error creating auth user for ${trader.name}:`, error);
    }
  }

}

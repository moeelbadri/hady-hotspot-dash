import type { NextConfig } from "next";
const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_SERVER } = require('next/constants')
import { initializeWhatsAppBot } from './src/lib/init-whatsapp';
import { initCronJobs } from './src/lib/init-cron';
const nextConfig: NextConfig = {
  /* config options here */
  turbopack:{
    root: process.cwd()
  }
};

export default async (phase: any) => {
  if (phase === PHASE_PRODUCTION_SERVER) {
    console.log('Initializing WhatsApp Bot... at phase', phase);
    console.log('Initializing cron job... at phase', phase);

    await initializeWhatsAppBot().catch(console.error);
    await initCronJobs().catch(console.error);
  }else if(phase === PHASE_DEVELOPMENT_SERVER){
    console.log('Initializing WhatsApp Bot... at phase', phase);
    console.log('Initializing cron job... at phase', phase);

    await initializeWhatsAppBot().catch(console.error);
    await initCronJobs().catch(console.error);
  }
  return nextConfig;
};
// export default nextConfig;

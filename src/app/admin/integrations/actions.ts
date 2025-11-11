'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

export type Integration = "google" | "apple" | "twitter" | "instagram" | "facebook" | "mercadopago" | "paypal";

const adminApp = getAdminApp();
const db = adminApp ? getDatabase(adminApp as any) : null;
const integrationsRef = db ? db.ref('admin/integrations') : null;

// Overload for getIntegrationStatus to provide better types
export async function getIntegrationStatus(service: 'twitter'): Promise<{ connected: boolean; screen_name?: string }>;
export async function getIntegrationStatus(service: Exclude<Integration, 'twitter'>): Promise<boolean>;
export async function getIntegrationStatus(service: Integration): Promise<boolean | { connected: boolean; screen_name?: string }> {
  if (!integrationsRef) {
    console.error("Admin SDK not available - cannot check integration status");
    return service === 'twitter' ? { connected: false } : false;
  }

  try {
    const snapshot = await integrationsRef.child(service).once('value');
    const data = snapshot.val();

    if (!data) {
      return service === 'twitter' ? { connected: false } : false;
    }

    if (service === 'twitter') {
      return { connected: !!data.connected, screen_name: data.screen_name };
    }

    // For services that store an object (like openid)
    if (typeof data === 'object' && data !== null) {
      return data.connected === true;
    }

    // For services that store a simple boolean
    return data === true;

  } catch (error: any) {
    console.error(`Error getting status for ${service}:`, error);
    return service === 'twitter' ? { connected: false } : false;
  }
}

export async function disconnectService(service: Integration): Promise<{ success: boolean; message: string }> {
  if (!integrationsRef) {
    return { success: false, message: "System configuration not available." };
  }

  try {
    const updateValue = (service === 'twitter' || service === 'mercadopago' || service === 'paypal') ? null : false;
    await integrationsRef.child(service).set(updateValue);
    return { success: true, message: `${service} disconnected successfully.` };
  } catch (error: any) {
    return { success: false, message: `Failed to disconnect ${service}.` };
  }
}

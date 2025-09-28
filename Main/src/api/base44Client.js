import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68d69572e7c00c910fc2a76d", 
  requiresAuth: true // Ensure authentication is required for all operations
});

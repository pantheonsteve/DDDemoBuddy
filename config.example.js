// DemoBuddy Configuration Template
// 
// SETUP INSTRUCTIONS:
// 1. Copy this file to config.js: cp config.example.js config.js
// 2. Replace the placeholder values with your actual keys
// 3. Never commit config.js to git (it's in .gitignore)

const DEMOBUDDY_CONFIG = {
  // Supabase Configuration
  // Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: 'your-supabase-anon-key-here',

  // Stripe Configuration (for Pro subscriptions)
  // Get these from: https://dashboard.stripe.com/apikeys
  STRIPE_PUBLISHABLE_KEY: 'pk_test_xxxxxxxxxxxxx', // or pk_live_xxx for production

  // Stripe Price IDs
  // Create these in Stripe Dashboard > Products
  STRIPE_PRICE_MONTHLY: 'price_xxxxxxxxxxxxx', // e.g., $10/month
  STRIPE_PRICE_ANNUAL: 'price_xxxxxxxxxxxxx',  // e.g., $99/year

  // App Settings
  APP_NAME: 'DemoBuddy',
  APP_VERSION: '1.2.0',

  // Feature Flags
  FEATURES: {
    CLOUD_SYNC: true,
    AI_GENERATION: true,
    CUSTOMER_PROFILES: true,
    TRACK_PACKS: true
  }
};

// Validate configuration
function validateConfig() {
  const warnings = [];

  if (!DEMOBUDDY_CONFIG.SUPABASE_URL || DEMOBUDDY_CONFIG.SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    warnings.push('SUPABASE_URL not configured - cloud features disabled');
  }
  if (!DEMOBUDDY_CONFIG.SUPABASE_ANON_KEY || DEMOBUDDY_CONFIG.SUPABASE_ANON_KEY.includes('your-supabase')) {
    warnings.push('SUPABASE_ANON_KEY not configured - cloud features disabled');
  }
  if (!DEMOBUDDY_CONFIG.STRIPE_PUBLISHABLE_KEY || DEMOBUDDY_CONFIG.STRIPE_PUBLISHABLE_KEY.includes('xxxxx')) {
    warnings.push('STRIPE_PUBLISHABLE_KEY not configured - payments disabled');
  }

  if (warnings.length > 0) {
    console.warn('[DemoBuddy Config]', warnings.join('\n'));
  }

  return warnings.length === 0;
}

// Check if cloud features are available
function isCloudEnabled() {
  return !!(
    DEMOBUDDY_CONFIG.SUPABASE_URL && 
    !DEMOBUDDY_CONFIG.SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
    DEMOBUDDY_CONFIG.SUPABASE_ANON_KEY &&
    !DEMOBUDDY_CONFIG.SUPABASE_ANON_KEY.includes('your-supabase')
  );
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEMOBUDDY_CONFIG, validateConfig, isCloudEnabled };
}


const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
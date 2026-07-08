import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rtstyvtdkfedmawslkdi.supabase.co';
const supabaseKey = 'sb_publishable_SDvvZtk8-IHv_QBwuT5LQA_VQyDDWxn';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Fetching store_settings...");
  const { data, error } = await supabase.from('store_settings').select('id, store_name, promotions').limit(1);
  if (error) {
    console.error("Error from Supabase:", error);
  } else {
    console.log("Data fetched:", data);
  }
}

test();

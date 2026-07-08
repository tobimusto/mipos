import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rtstyvtdkfedmawslkdi.supabase.co';
const supabaseKey = 'sb_publishable_SDvvZtk8-IHv_QBwuT5LQA_VQyDDWxn';

export const supabase = createClient(supabaseUrl, supabaseKey);

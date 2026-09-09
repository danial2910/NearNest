import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)

export function createClerkSupabaseClient(getToken:()=>Promise<string|null>){
  return createClient(supabaseUrl, supabaseKey, {
    async accessToken(){
        return getToken();
        },
    });
}
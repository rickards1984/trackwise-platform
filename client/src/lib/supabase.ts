// /client/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sbueuljfhbpqpimwxdmt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidWV1bGpmaGJwcXBpbXd4ZG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MzkxNTksImV4cCI6MjA2MzUxNTE1OX0.O4InKCsZuC9CRmoPv8f9kTw0Umssi6whLbOKXe5o1IY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

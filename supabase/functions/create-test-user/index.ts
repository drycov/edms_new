import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Create test user using admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@edms.demo',
      password: 'Demo123456!',
      email_confirm: true,
      user_metadata: {
        full_name: 'System Administrator',
        organization_id: '00000000-0000-0000-0000-000000000001',
      },
    });

    if (error) {
      // If user exists, try to update password
      if (error.message.includes('already been registered')) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === 'admin@edms.demo');

        if (existingUser) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: 'Demo123456!' }
          );

          if (updateError) {
            return new Response(JSON.stringify({ error: updateError.message }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Ensure profile exists
          await supabase.from('profiles').upsert({
            id: existingUser.id,
            organization_id: '00000000-0000-0000-0000-000000000001',
            full_name: 'System Administrator',
            position: 'Administrator',
            is_active: true,
          });

          return new Response(JSON.stringify({
            success: true,
            message: 'Password updated for existing user',
            user_id: existingUser.id,
            email: 'admin@edms.demo',
            password: 'Demo123456!'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create profile
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        organization_id: '00000000-0000-0000-0000-000000000001',
        full_name: 'System Administrator',
        position: 'Administrator',
        is_active: true,
      });

      // Assign admin role
      await supabase.from('user_roles').upsert({
        user_id: data.user.id,
        role_id: '00000000-0000-0000-0000-000000000020',
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: data.user?.id,
      email: 'admin@edms.demo',
      password: 'Demo123456!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Audit log entry interface
interface AuditEntry {
  action: string;
  action_category: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Create immutable audit log entry
async function createAuditLog(
  organizationId: string,
  userId: string,
  entry: AuditEntry,
  request: Request
): Promise<string> {
  // Get user details
  const { data: user } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', userId)
    .maybeSingle();

  // Extract request context
  const ip = request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';
  const method = request.method;
  const path = new URL(request.url).pathname;

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      user_name: user?.full_name || 'Unknown',
      user_email: (await supabase.auth.getUser()).data?.user?.email || 'unknown',
      action: entry.action,
      action_category: entry.action_category,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      old_values: entry.old_values || null,
      new_values: entry.new_values || null,
      changes: entry.changes || null,
      ip_address: ip,
      user_agent: userAgent,
      request_method: method,
      request_path: path,
      metadata: entry.metadata || {},
    })
    .select('id')
    .single();

  if (error) throw error;

  return data.id;
}

// Query audit logs with filters
async function queryAuditLogs(
  organizationId: string,
  filters: {
    user_id?: string;
    entity_type?: string;
    entity_id?: string;
    action?: string;
    action_category?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters.entity_type) {
    query = query.eq('entity_type', filters.entity_type);
  }

  if (filters.entity_id) {
    query = query.eq('entity_id', filters.entity_id);
  }

  if (filters.action) {
    query = query.ilike('action', `%${filters.action}%`);
  }

  if (filters.action_category) {
    query = query.eq('action_category', filters.action_category);
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return { data, count };
}

// Get audit statistics
async function getAuditStats(organizationId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: actions, error: actionsError } = await supabase
    .rpc('get_audit_action_stats', {
      org_id: organizationId,
      start_date: startDate.toISOString(),
    });

  const { data: users, error: usersError } = await supabase
    .rpc('get_audit_user_stats', {
      org_id: organizationId,
      start_date: startDate.toISOString(),
    });

  const { count: total } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString());

  return {
    total_events: total || 0,
    by_action: actions || [],
    by_user: users || [],
  };
}

// Export audit logs
async function exportAuditLogs(
  organizationId: string,
  format: 'json' | 'csv',
  filters: any
) {
  const { data } = await queryAuditLogs(organizationId, {
    ...filters,
    limit: 10000,
  });

  if (format === 'csv') {
    const headers = [
      'ID',
      'Action',
      'Category',
      'Entity Type',
      'Entity ID',
      'User',
      'Email',
      'IP Address',
      'Created At',
    ];

    const rows = data?.map((log: any) => [
      log.id,
      log.action,
      log.action_category,
      log.entity_type,
      log.entity_id || '',
      log.user_name,
      log.user_email,
      log.ip_address,
      log.created_at,
    ]) || [];

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    return { data: csv, contentType: 'text/csv' };
  }

  return { data: JSON.stringify(data, null, 2), contentType: 'application/json' };
}

// HTTP Handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/audit-service', '');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    const organizationId = profile?.organization_id;
    if (!organizationId) {
      throw new Error('User not associated with an organization');
    }

    let response;
    let contentType = 'application/json';

    // Route: Log action
    if (req.method === 'POST' && path === '/log') {
      const body = await req.json();
      const logId = await createAuditLog(
        organizationId,
        user.id,
        {
          action: body.action,
          action_category: body.action_category,
          entity_type: body.entity_type,
          entity_id: body.entity_id,
          old_values: body.old_values,
          new_values: body.new_values,
          changes: body.changes,
          metadata: body.metadata,
        },
        req
      );
      response = { success: true, log_id: logId };
    }

    // Route: Query logs
    else if (req.method === 'GET' && path === '/query') {
      const params = url.searchParams;
      const result = await queryAuditLogs(organizationId, {
        user_id: params.get('user_id') || undefined,
        entity_type: params.get('entity_type') || undefined,
        entity_id: params.get('entity_id') || undefined,
        action: params.get('action') || undefined,
        action_category: params.get('action_category') || undefined,
        date_from: params.get('date_from') || undefined,
        date_to: params.get('date_to') || undefined,
        limit: parseInt(params.get('limit') || '100'),
        offset: parseInt(params.get('offset') || '0'),
      });
      response = result;
    }

    // Route: Get statistics
    else if (req.method === 'GET' && path === '/stats') {
      const days = parseInt(url.searchParams.get('days') || '30');
      const stats = await getAuditStats(organizationId, days);
      response = stats;
    }

    // Route: Export logs
    else if (req.method === 'GET' && path === '/export') {
      const format = (url.searchParams.get('format') || 'json') as 'json' | 'csv';
      const filters = {
        date_from: url.searchParams.get('date_from') || undefined,
        date_to: url.searchParams.get('date_to') || undefined,
        action_category: url.searchParams.get('action_category') || undefined,
      };

      const result = await exportAuditLogs(organizationId, format, filters);
      response = result.data;
      contentType = result.contentType;
    }

    else {
      response = { error: 'Not found' };
    }

    return new Response(
      typeof response === 'string' ? response : JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

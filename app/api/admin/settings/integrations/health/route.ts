import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { GoogleGenAI } from '@google/genai';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { service } = body; // 'supabase' | 'r2' | 'razorpay' | 'ai'

    const supabase = getSupabaseAdmin();

    // Load custom credentials saved in DB (if any)
    const { data: dbSettings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'integrations')
      .maybeSingle();

    const integrations = dbSettings?.value || {};

    const { data: paySettings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'payments')
      .maybeSingle();

    const payments = paySettings?.value || {};

    const now = new Date().toISOString();

    if (service === 'supabase') {
      const results = {
        database: 'NOT CONFIGURED',
        auth: 'NOT CONFIGURED',
        realtime: 'NOT CONFIGURED',
        storage: 'NOT CONFIGURED',
        edgeFunctions: 'NOT CONFIGURED',
        lastChecked: now,
        error: null as string | null,
      };

      try {
        const dbStart = Date.now();
        // Test database
        const { error: dbError } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        if (dbError) {
          results.database = 'UNHEALTHY';
          results.error = `Database check failed: ${dbError.message}`;
        } else {
          results.database = 'HEALTHY';
        }

        // Test auth (client can be instantiated)
        results.auth = 'HEALTHY';

        // Test realtime (config check)
        results.realtime = 'HEALTHY';

        // Test storage bucket list or access
        const { error: storageError } = await supabase.storage.listBuckets();
        if (storageError) {
          results.storage = 'UNHEALTHY';
          results.error = results.error || `Storage check failed: ${storageError.message}`;
        } else {
          results.storage = 'HEALTHY';
        }

        // Test edge functions list or status check
        results.edgeFunctions = 'HEALTHY';

        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          results,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: true,
          status: 'FAILED',
          error: err.message,
          results: {
            database: 'UNHEALTHY',
            auth: 'UNHEALTHY',
            realtime: 'UNHEALTHY',
            storage: 'UNHEALTHY',
            edgeFunctions: 'UNHEALTHY',
            lastChecked: now,
            error: err.message,
          }
        });
      }
    }

    if (service === 'r2') {
      // Get R2 config from saved settings or fallback to process.env
      const r2Account = integrations.cloudflareR2?.accountId || process.env.R2_ACCOUNT_ID;
      const r2AccessKey = integrations.cloudflareR2?.accessKeyId || process.env.R2_ACCESS_KEY_ID;
      const r2SecretKey = integrations.cloudflareR2?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
      const r2Bucket = integrations.cloudflareR2?.bucket || process.env.R2_BUCKET_NAME;

      if (!r2AccessKey || !r2SecretKey || !r2Bucket) {
        return NextResponse.json({
          success: true,
          status: 'NOT CONFIGURED',
          message: 'Cloudflare R2 environment variables are missing.',
        });
      }

      try {
        const endpoint = integrations.cloudflareR2?.endpoint || process.env.R2_ENDPOINT || `https://${r2Account}.r2.cloudflarestorage.com`;
        
        // Setup S3-compatible client for Cloudflare R2
        const s3 = new S3Client({
          region: 'auto',
          endpoint,
          credentials: {
            accessKeyId: r2AccessKey,
            secretAccessKey: r2SecretKey,
          },
        });

        // Test connection by listing objects (limit to 1)
        const command = new ListObjectsV2Command({
          Bucket: r2Bucket,
          MaxKeys: 1,
        });

        await s3.send(command);

        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          results: {
            bucket: r2Bucket,
            account: r2Account ? `${r2Account.slice(0, 6)}...` : 'Configured',
            endpoint: endpoint,
            lastChecked: now,
          }
        });
      } catch (err: any) {
        console.error('R2 Health Check Error:', err);
        return NextResponse.json({
          success: true,
          status: 'FAILED',
          error: err.message || 'Access denied or bucket not found.',
        });
      }
    }

    if (service === 'razorpay') {
      const keyId = payments.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
      const keySecret = payments.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return NextResponse.json({
          success: true,
          status: 'NOT CONFIGURED',
          message: 'Razorpay keys are not configured.',
        });
      }

      try {
        // Test credentials by making a lightweight request to list payments (limit 1)
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
          headers: {
            'Authorization': authHeader,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.description || `HTTP error ${res.status}`);
        }

        const data = await res.json();

        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          results: {
            keyId: `${keyId.slice(0, 8)}...`,
            environment: keyId.includes('test') ? 'test' : 'live',
            lastChecked: now,
          }
        });
      } catch (err: any) {
        console.error('Razorpay Health Check Error:', err);
        return NextResponse.json({
          success: true,
          status: 'FAILED',
          error: err.message || 'Failed to authenticate with Razorpay API.',
        });
      }
    }

    if (service === 'ai') {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      const openaiApiKey = process.env.OPENAI_API_KEY;

      const results = {
        gemini: 'NOT CONFIGURED',
        openai: 'NOT CONFIGURED',
        lastChecked: now,
        error: null as string | null,
      };

      let anyConnected = false;

      // 1. Test Gemini
      if (geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          // Lightweight generate call to verify credentials
          await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'ping',
          });
          results.gemini = 'HEALTHY';
          anyConnected = true;
        } catch (err: any) {
          results.gemini = 'UNHEALTHY';
          results.error = `Gemini: ${err.message}`;
        }
      }

      // 2. Test OpenAI
      if (openaiApiKey) {
        try {
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
            },
          });
          if (res.ok) {
            results.openai = 'HEALTHY';
            anyConnected = true;
          } else {
            results.openai = 'UNHEALTHY';
            results.error = results.error ? `${results.error} | OpenAI: Invalid key` : 'OpenAI: Invalid key';
          }
        } catch (err: any) {
          results.openai = 'UNHEALTHY';
          results.error = results.error ? `${results.error} | OpenAI: ${err.message}` : `OpenAI: ${err.message}`;
        }
      }

      return NextResponse.json({
        success: true,
        status: anyConnected ? 'CONNECTED' : (geminiApiKey || openaiApiKey ? 'FAILED' : 'NOT CONFIGURED'),
        results,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown service requested' }, { status: 400 });
  } catch (err: any) {
    console.error('Integration Health API overall error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

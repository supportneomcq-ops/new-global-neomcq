import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function requireHomepageAdmin() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { user: null, response: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) };

  const adminClient = getSupabaseAdmin();
  const { data: assignments, error } = await adminClient
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);
  if (error) return { user: null, response: NextResponse.json({ error: 'Could not verify administrator access.' }, { status: 500 }) };
  const roles = assignments?.map((row: any) => row.roles?.name).filter(Boolean) || [];
  if (!roles.some((role: string) => ['admin', 'super_admin', 'content_admin'].includes(role))) {
    return { user: null, response: NextResponse.json({ error: 'Administrator access required.' }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function POST(request: NextRequest) {
  const auth = await requireHomepageAdmin();
  if (auth.response) return auth.response;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 });

    const allowedTypes: Record<string, string> = {
      'image/webp': 'webp',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/avif': 'avif',
    };
    const extension = allowedTypes[file.type];
    if (!extension) return NextResponse.json({ error: 'Use a PNG, JPG, WebP, or AVIF image.' }, { status: 415 });
    if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Banner images must be smaller than 8 MB.' }, { status: 413 });
    }

    const client = getSupabaseAdmin();
    const bucketName = 'homepage-banners';
    const { data: buckets, error: listError } = await client.storage.listBuckets();
    if (listError) throw listError;
    if (!buckets?.some((bucket) => bucket.name === bucketName)) {
      const { error: bucketError } = await client.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: '8MB',
        allowedMimeTypes: Object.keys(allowedTypes),
      });
      if (bucketError && !/already exists/i.test(bucketError.message)) throw bucketError;
    }

    const path = `hero/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await client.storage.from(bucketName).upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data } = client.storage.from(bucketName).getPublicUrl(path);
    return NextResponse.json({ success: true, url: data.publicUrl, name: file.name });
  } catch (error) {
    console.error('Homepage banner upload failed:', error);
    return NextResponse.json({ error: 'Upload failed. Check storage configuration and try again.' }, { status: 500 });
  }
}

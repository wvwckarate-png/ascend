import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: topLevel, error: listError } = await supabaseAdmin.storage
      .from('slide-images')
      .list('', { limit: 200 });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const tempFolders = (topLevel || []).filter(item => item.name.startsWith('temp-'));
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const pathsToDelete: string[] = [];

    for (const folder of tempFolders) {
      const timestamp = parseInt(folder.name.replace('temp-', ''), 10);
      if (isNaN(timestamp) || timestamp > cutoff) continue;

      const { data: files } = await supabaseAdmin.storage
        .from('slide-images')
        .list(folder.name);

      if (files && files.length > 0) {
        files.forEach(f => pathsToDelete.push(`${folder.name}/${f.name}`));
      }
    }

    if (pathsToDelete.length > 0) {
      await supabaseAdmin.storage.from('slide-images').remove(pathsToDelete);
    }

    return NextResponse.json({
      deleted: pathsToDelete.length,
      paths: pathsToDelete,
    });
  } catch (err) {
    console.error('Cleanup error:', err);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
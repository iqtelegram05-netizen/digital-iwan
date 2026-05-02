import { NextRequest, NextResponse } from 'next/server';

// Allowed file types and max size (1MB for base64 storage)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 1024 * 1024; // 1MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'نوع الملف غير مدعوم. يُسمح بـ: JPEG, PNG, GIF, WebP, SVG' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'حجم الملف كبير جداً. الحد الأقصى 1MB' },
        { status: 400 }
      );
    }

    // Convert file to base64 data URL (works on Vercel read-only filesystem)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ error: 'فشل في رفع الصورة' }, { status: 500 });
  }
}

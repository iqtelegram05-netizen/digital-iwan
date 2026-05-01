import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/sites - Public: fetch all active sites (sorted by displayOrder)
export async function GET() {
  try {
    const sites = await db.site.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        url: true,
        description: true,
        iconUrl: true,
        displayOrder: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ sites });
  } catch (error) {
    console.error('Failed to fetch sites:', error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

// POST /api/sites - Admin: add a new site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, description, iconUrl } = body;

    if (!name?.trim() || !url?.trim()) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    // Get max displayOrder for auto-ordering
    const maxOrder = await db.site.findFirst({
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    const site = await db.site.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        description: description?.trim() || null,
        iconUrl: iconUrl?.trim() || null,
        displayOrder: (maxOrder?.displayOrder || 0) + 1,
      },
    });

    return NextResponse.json({ site });
  } catch (error) {
    console.error('Failed to create site:', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}

// DELETE /api/sites - Admin: delete a site
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    await db.site.delete({
      where: { id },
    });

    // Re-order remaining sites
    const remaining = await db.site.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      await db.site.update({
        where: { id: remaining[i].id },
        data: { displayOrder: i },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete site:', error);
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
  }
}

// PUT /api/sites - Admin: update a site
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, url, description, iconUrl, isActive, displayOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    const site = await db.site.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(url !== undefined && { url: url.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(iconUrl !== undefined && { iconUrl: iconUrl?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });

    return NextResponse.json({ site });
  } catch (error) {
    console.error('Failed to update site:', error);
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
  }
}

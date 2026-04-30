import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tasbeeh — Fetch all groups with their items
export async function GET() {
  try {
    const groups = await db.tasbeehGroup.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Tasbeeh GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasbeeh' }, { status: 500 });
  }
}

// POST /api/tasbeeh — Create group or item (use `action` field)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Create a new group
    if (action === 'addGroup') {
      const { name, description, iconUrl } = body;
      if (!name?.trim()) {
        return NextResponse.json({ error: 'اسم المجموعة مطلوب' }, { status: 400 });
      }
      const maxOrder = await db.tasbeehGroup.findFirst({
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      const group = await db.tasbeehGroup.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          iconUrl: iconUrl?.trim() || null,
          displayOrder: (maxOrder?.displayOrder || 0) + 1,
        },
        include: { items: { orderBy: { displayOrder: 'asc' } } },
      });
      return NextResponse.json({ group }, { status: 201 });
    }

    // Add an item to a group
    if (action === 'addItem') {
      const { groupId, text, description, count } = body;
      if (!groupId || !text?.trim()) {
        return NextResponse.json({ error: 'المجموعة ونص التسبيحة مطلوبان' }, { status: 400 });
      }
      const groupExists = await db.tasbeehGroup.findUnique({ where: { id: groupId } });
      if (!groupExists) {
        return NextResponse.json({ error: 'المجموعة غير موجودة' }, { status: 404 });
      }
      const maxOrder = await db.tasbeehItem.findFirst({
        where: { groupId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      const item = await db.tasbeehItem.create({
        data: {
          groupId,
          text: text.trim(),
          description: description?.trim() || null,
          count: count || 33,
          displayOrder: (maxOrder?.displayOrder || 0) + 1,
        },
      });
      return NextResponse.json({ item }, { status: 201 });
    }

    return NextResponse.json({ error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    console.error('Tasbeeh POST Error:', error);
    return NextResponse.json({ error: 'Failed to create tasbeeh' }, { status: 500 });
  }
}

// PUT /api/tasbeeh — Update group or item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id } = body;

    if (!id) {
      return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    }

    // Update a group
    if (action === 'updateGroup') {
      const { name, description, iconUrl, isActive } = body;
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
      if (isActive !== undefined) updateData.isActive = isActive;

      const group = await db.tasbeehGroup.update({
        where: { id },
        data: updateData,
        include: { items: { orderBy: { displayOrder: 'asc' } } },
      });
      return NextResponse.json({ group });
    }

    // Update an item
    if (action === 'updateItem') {
      const { text, description, count, isActive } = body;
      const updateData: Record<string, unknown> = {};
      if (text !== undefined) updateData.text = text;
      if (description !== undefined) updateData.description = description;
      if (count !== undefined) updateData.count = count;
      if (isActive !== undefined) updateData.isActive = isActive;

      const item = await db.tasbeehItem.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json({ item });
    }

    return NextResponse.json({ error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    console.error('Tasbeeh PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update tasbeeh' }, { status: 500 });
  }
}

// DELETE /api/tasbeeh — Delete group or item
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id } = body;

    if (!id) {
      return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    }

    // Delete a group (cascade deletes items)
    if (action === 'deleteGroup') {
      await db.tasbeehGroup.delete({ where: { id } });
      return NextResponse.json({ message: 'تم حذف المجموعة' });
    }

    // Delete an item
    if (action === 'deleteItem') {
      await db.tasbeehItem.delete({ where: { id } });
      return NextResponse.json({ message: 'تم حذف التسبيحة' });
    }

    return NextResponse.json({ error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    console.error('Tasbeeh DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete tasbeeh' }, { status: 500 });
  }
}

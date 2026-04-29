import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SUBSCRIPTION_PRICE } from '../usage/route';

/**
 * Create a subscription checkout session
 * For now: manual payment verification (owner confirms)
 * Can be upgraded to Stripe/PayPal later
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, paymentMethod = 'manual' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // Generate a pending subscription record
    const subscriptionId = `sub_${Date.now()}_${user.id.slice(0, 8)}`;

    // For manual payment: generate payment info
    if (paymentMethod === 'manual') {
      return NextResponse.json({
        success: true,
        subscriptionId,
        price: SUBSCRIPTION_PRICE,
        currency: 'USD',
        message: 'تم إنشاء طلب الاشتراك. تواصل مع المالك لإتمام الدفع.',
        paymentInfo: {
          price: `$${SUBSCRIPTION_PRICE}`,
          duration: 'شهر واحد',
          benefits: 'رسائل غير محدودة لمدة شهر كامل',
        },
      });
    }

    // Future: Stripe integration
    // if (paymentMethod === 'stripe') {
    //   const session = await stripe.checkout.sessions.create({...});
    //   return NextResponse.json({ url: session.url });
    // }

    return NextResponse.json({ error: 'طريقة الدفع غير مدعومة' }, { status: 400 });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'خطأ في إنشاء الاشتراك' }, { status: 500 });
  }
}

/**
 * GET: Check subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const isActive = user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();

    return NextResponse.json({
      isActive,
      expiryDate: user.subscriptionExpiry,
      price: SUBSCRIPTION_PRICE,
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json({ error: 'خطأ' }, { status: 500 });
  }
}

/**
 * PUT: Owner confirms a payment (activate subscription)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ownerCode } = body;

    // Verify owner
    if (ownerCode !== 'qalamadmin2024') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    // Activate subscription for 30 days
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const user = await db.user.update({
      where: { id: userId },
      data: {
        subscriptionExpiry: expiry,
        messagesUsed: 0, // Reset counter
      },
    });

    return NextResponse.json({
      success: true,
      expiryDate: user.subscriptionExpiry,
      message: 'تم تفعيل الاشتراك بنجاح لمدة شهر',
    });
  } catch (error) {
    console.error('Subscription activate error:', error);
    return NextResponse.json({ error: 'خطأ في تفعيل الاشتراك' }, { status: 500 });
  }
}

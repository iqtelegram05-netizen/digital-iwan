import { NextRequest, NextResponse } from 'next/server';

// Mecca coordinates
const KAABA_LAT = 21.4225; // degrees North
const KAABA_LNG = 39.8262; // degrees East

interface QiblaRequestBody {
  latitude: number;
  longitude: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function getBearingName(degrees: number): string {
  const normalizedDeg = ((degrees % 360) + 360) % 360;
  const directions = [
    { name: 'ش', range: [337.5, 22.5] },   // North
    { name: 'ششرق', range: [22.5, 67.5] },   // NE
    { name: 'شرق', range: [67.5, 112.5] },   // East
    { name: 'جنوب شرق', range: [112.5, 157.5] }, // SE
    { name: 'جنوب', range: [157.5, 202.5] }, // South
    { name: 'جنوب غرب', range: [202.5, 247.5] }, // SW
    { name: 'غرب', range: [247.5, 292.5] },  // West
    { name: 'شغرب', range: [292.5, 337.5] }, // NW
  ];

  for (const dir of directions) {
    if (dir.range[0] < dir.range[1]) {
      if (normalizedDeg >= dir.range[0] && normalizedDeg < dir.range[1]) {
        return dir.name;
      }
    } else {
      // Wraps around 0
      if (normalizedDeg >= dir.range[0] || normalizedDeg < dir.range[1]) {
        return dir.name;
      }
    }
  }
  return 'ش'; // Default to North
}

export async function POST(request: NextRequest) {
  try {
    const body: QiblaRequestBody = await request.json();
    const { latitude, longitude } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'خطوط الطول والعرض مطلوبان' },
        { status: 400 }
      );
    }

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180
    ) {
      return NextResponse.json(
        { error: 'قيم خطوط الطول والعرض غير صالحة' },
        { status: 400 }
      );
    }

    // Calculate Qibla direction using the standard formula
    const latRad = toRadians(latitude);
    const lngRad = toRadians(longitude);
    const kaabaLatRad = toRadians(KAABA_LAT);
    const kaabaLngRad = toRadians(KAABA_LNG);

    const dLng = kaabaLngRad - lngRad;

    const x = Math.sin(dLng);
    const y =
      Math.cos(latRad) * Math.tan(kaabaLatRad) -
      Math.sin(latRad) * Math.cos(dLng);

    let qibla = toDegrees(Math.atan2(x, y));

    // Normalize to 0-360
    qibla = ((qibla % 360) + 360) % 360;

    return NextResponse.json({
      direction: Math.round(qibla * 100) / 100,
      bearing: getBearingName(qibla),
      coordinates: {
        user: { latitude, longitude },
        kaaba: { latitude: KAABA_LAT, longitude: KAABA_LNG },
      },
    });
  } catch (error) {
    console.error('Qibla API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حساب اتجاه القبلة' },
      { status: 500 }
    );
  }
}

// GET: Return Qibla info (for Mecca coordinates reference)
export async function GET() {
  return NextResponse.json({
    kaaba: {
      latitude: KAABA_LAT,
      longitude: KAABA_LNG,
      name: 'الكعبة المشرفة',
      city: 'مكة المكرمة',
      country: 'المملكة العربية السعودية',
    },
    description: 'أرسل خطوط الطول والعرض لحساب اتجاه القبلة',
  });
}

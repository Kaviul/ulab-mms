import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Course from '@/models/Course';

// GET all courses for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const courses = await Course.find({ userId: session.user.id }).sort({
      createdAt: -1,
    });

    return NextResponse.json({ courses }, { status: 200 });
  } catch (error: any) {
    console.error('Get courses error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create a new course
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, code, semester, year } = await request.json();

    // Validation
    if (!name || !code || !semester || !year) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    if (!['Spring', 'Summer', 'Fall'].includes(semester)) {
      return NextResponse.json(
        { error: 'Invalid semester. Must be Spring, Summer, or Fall' },
        { status: 400 }
      );
    }

    await dbConnect();

    const course = await Course.create({
      name,
      code,
      semester,
      year,
      userId: session.user.id,
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error: any) {
    console.error('Create course error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

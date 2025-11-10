import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Exam from '@/models/Exam';
import Course from '@/models/Course';

// POST create a new exam
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId, name, totalMarks, scalingValue } = await request.json();

    if (!courseId || !name || !totalMarks || !scalingValue) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify course belongs to user
    const course = await Course.findOne({
      _id: courseId,
      userId: session.user.id,
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const exam = await Exam.create({
      name,
      totalMarks,
      scalingValue,
      courseId,
      userId: session.user.id,
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error: any) {
    console.error('Create exam error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

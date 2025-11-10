import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Mark from '@/models/Mark';
import Student from '@/models/Student';
import Exam from '@/models/Exam';

// POST create or update a mark
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, examId, courseId, rawMark } = await request.json();

    if (!studentId || !examId || !courseId || rawMark === undefined) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify student and exam exist and belong to user
    const [student, exam] = await Promise.all([
      Student.findOne({ _id: studentId, userId: session.user.id }),
      Exam.findOne({ _id: examId, userId: session.user.id }),
    ]);

    if (!student || !exam) {
      return NextResponse.json(
        { error: 'Student or exam not found' },
        { status: 404 }
      );
    }

    // Create or update mark
    const mark = await Mark.findOneAndUpdate(
      { studentId, examId },
      {
        studentId,
        examId,
        courseId,
        userId: session.user.id,
        rawMark,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({ mark }, { status: 201 });
  } catch (error: any) {
    console.error('Create/update mark error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

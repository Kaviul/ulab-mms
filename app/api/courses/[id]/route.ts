import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Course from '@/models/Course';
import Student from '@/models/Student';
import Exam from '@/models/Exam';
import Mark from '@/models/Mark';

// GET a specific course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    const course = await Course.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get students, exams, and marks for this course
    const [students, exams, marks] = await Promise.all([
      Student.find({ courseId: id }),
      Exam.find({ courseId: id }),
      Mark.find({ courseId: id }),
    ]);

    return NextResponse.json(
      {
        course,
        students,
        exams,
        marks,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get course error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update a course
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, code, semester, year } = await request.json();

    await dbConnect();

    const course = await Course.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { name, code, semester, year },
      { new: true, runValidators: true }
    );

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ course }, { status: 200 });
  } catch (error: any) {
    console.error('Update course error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE a course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    const course = await Course.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Delete all related data
    await Promise.all([
      Student.deleteMany({ courseId: id }),
      Exam.deleteMany({ courseId: id }),
      Mark.deleteMany({ courseId: id }),
    ]);

    return NextResponse.json(
      { message: 'Course and all related data deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete course error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

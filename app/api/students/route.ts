import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import Course from '@/models/Course';

// POST create students (bulk import)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId, students } = await request.json();

    if (!courseId || !students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: 'Please provide courseId and students array' },
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

    // Create students
    const createdStudents = [];
    const errors = [];

    for (const student of students) {
      try {
        const newStudent = await Student.create({
          studentId: student.studentId,
          name: student.name,
          courseId,
          userId: session.user.id,
        });
        createdStudents.push(newStudent);
      } catch (error: any) {
        // Handle duplicate student error
        if (error.code === 11000) {
          errors.push(`Student ${student.studentId} already exists in this course`);
        } else {
          errors.push(`Error creating student ${student.studentId}: ${error.message}`);
        }
      }
    }

    return NextResponse.json(
      {
        message: `${createdStudents.length} students created successfully`,
        students: createdStudents,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create students error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

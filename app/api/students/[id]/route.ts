import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import Mark from '@/models/Mark';

// DELETE a student
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = params.id;

    await dbConnect();

    // Verify student belongs to user
    const student = await Student.findOne({
      _id: studentId,
      userId: session.user.id,
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Delete all marks associated with this student
    await Mark.deleteMany({
      studentId: studentId,
      userId: session.user.id,
    });

    // Delete the student
    await Student.deleteOne({ _id: studentId });

    return NextResponse.json(
      { message: 'Student and associated marks deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete student error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

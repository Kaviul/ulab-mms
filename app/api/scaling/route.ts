import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Exam from '@/models/Exam';
import Mark from '@/models/Mark';
import {
  applyBellCurveScaling,
  applyLinearNormalization,
  applyMinMaxNormalization,
  applyPercentileScaling,
  applyRounding,
} from '@/app/utils/scaling';

// POST apply scaling to an exam
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examId, method, applyRound } = await request.json();

    if (!examId || !method) {
      return NextResponse.json(
        { error: 'Please provide examId and method' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get exam
    const exam = await Exam.findOne({ _id: examId, userId: session.user.id });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Get all marks for this exam
    const marks = await Mark.find({ examId });

    if (marks.length === 0) {
      return NextResponse.json(
        { error: 'No marks found for this exam' },
        { status: 400 }
      );
    }

    // Convert to the format expected by scaling functions
    const students = marks.map((mark) => ({
      id: mark.studentId.toString(),
      name: '',
      marks: { [examId]: mark.rawMark },
      scaledMarks: {},
      roundedMarks: {},
    }));

    const examData = {
      id: (exam._id as any).toString(),
      name: exam.name,
      totalMarks: exam.totalMarks,
      scalingValue: exam.scalingValue,
      scalingMethod: method,
    };

    // Apply scaling
    let scaledStudents;
    switch (method) {
      case 'bellCurve':
        scaledStudents = applyBellCurveScaling(students, examData);
        break;
      case 'linearNormalization':
        scaledStudents = applyLinearNormalization(students, examData);
        break;
      case 'minMaxNormalization':
        scaledStudents = applyMinMaxNormalization(students, examData);
        break;
      case 'percentile':
        scaledStudents = applyPercentileScaling(students, examData);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid scaling method' },
          { status: 400 }
        );
    }

    // Apply rounding if requested
    if (applyRound) {
      scaledStudents = applyRounding(scaledStudents, examId, true);
    }

    // Update marks in database
    const updatePromises = scaledStudents.map((student) => {
      const scaledMark = student.scaledMarks?.[examId];
      const roundedMark = student.roundedMarks?.[examId];

      return Mark.findOneAndUpdate(
        { studentId: student.id, examId },
        {
          scaledMark,
          roundedMark: applyRound ? roundedMark : undefined,
        },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    // Update exam with scaling method
    await Exam.findByIdAndUpdate(examId, { scalingMethod: method });

    return NextResponse.json(
      { message: 'Scaling applied successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Apply scaling error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

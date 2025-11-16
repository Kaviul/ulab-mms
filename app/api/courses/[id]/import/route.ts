import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Course from '@/models/Course';
import Student from '@/models/Student';
import Exam from '@/models/Exam';
import Mark from '@/models/Mark';

// POST import course data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId } = await params;
    const importData = await request.json();

    // Validate import data
    if (!importData.version || !importData.course || !importData.students || !importData.exams) {
      return NextResponse.json(
        { error: 'Invalid import file format' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get course
    const course = await Course.findOne({ _id: courseId, userId: session.user.id });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Start transaction-like operation
    // 1. Delete all existing data
    await Student.deleteMany({ courseId });
    await Exam.deleteMany({ courseId });
    await Mark.deleteMany({ courseId });

    // 2. Update course settings
    await Course.findByIdAndUpdate(courseId, {
      showFinalGrade: importData.course.showFinalGrade,
      quizAggregation: importData.course.quizAggregation,
      quizWeightage: importData.course.quizWeightage,
      assignmentAggregation: importData.course.assignmentAggregation,
      assignmentWeightage: importData.course.assignmentWeightage,
    });

    // 3. Import students
    const studentMap = new Map(); // Map old studentId to new _id
    for (const studentData of importData.students) {
      const student = await Student.create({
        studentId: studentData.studentId,
        name: studentData.name,
        courseId,
        userId: session.user.id,
      });
      studentMap.set(studentData.studentId, student._id);
    }

    // 4. Import exams
    const examMap = new Map(); // Map old exam displayName to new _id
    for (const examData of importData.exams) {
      const exam = await Exam.create({
        displayName: examData.displayName,
        examType: examData.examType,
        totalMarks: examData.totalMarks,
        weightage: examData.weightage,
        scalingEnabled: examData.scalingEnabled,
        scalingMethod: examData.scalingMethod,
        scalingTarget: examData.scalingTarget,
        isRequired: examData.isRequired,
        examCategory: examData.examCategory,
        numberOfCOs: examData.numberOfCOs,
        numberOfQuestions: examData.numberOfQuestions,
        courseId,
        userId: session.user.id,
      });
      examMap.set(examData.displayName, exam._id);
    }

    // 5. Import marks
    for (const markData of importData.marks) {
      const studentId = studentMap.get(markData.studentId);
      const examId = examMap.get(markData.examDisplayName);

      if (studentId && examId) {
        await Mark.create({
          studentId,
          examId,
          courseId,
          rawMark: markData.rawMark,
          coMarks: markData.coMarks,
          questionMarks: markData.questionMarks,
          scaledMark: markData.scaledMark,
          roundedMark: markData.roundedMark,
          userId: session.user.id,
        });
      }
    }

    return NextResponse.json(
      { 
        message: 'Course data imported successfully',
        stats: {
          students: importData.students.length,
          exams: importData.exams.length,
          marks: importData.marks.length,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Import course error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

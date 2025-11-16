import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Exam from '@/models/Exam';
import Course from '@/models/Course';

// POST create a custom exam
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId, displayName, totalMarks, weightage, numberOfCOs, numberOfQuestions, examCategory } =
      await request.json();

    // Validation
    if (!courseId || !displayName || !totalMarks) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    // Weightage is required for non-Quiz and non-Assignment exams
    if (examCategory !== 'Quiz' && examCategory !== 'Assignment' && weightage === undefined) {
      return NextResponse.json(
        { error: 'Weightage is required for non-Quiz/Assignment exams' },
        { status: 400 }
      );
    }

    if (weightage !== undefined && (weightage < 0 || weightage > 100)) {
      return NextResponse.json(
        { error: 'Weightage must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (totalMarks <= 0) {
      return NextResponse.json(
        { error: 'Total marks must be greater than 0' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify course exists and belongs to user
    const course = await Course.findOne({
      _id: courseId,
      userId: session.user.id,
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const examData: any = {
      courseId,
      displayName,
      examType: 'custom',
      totalMarks,
      weightage: weightage || 0, // Default to 0 for Quiz/Assignment
      scalingEnabled: false,
      isRequired: false,
      userId: session.user.id,
    };

    // Add examCategory if provided
    if (examCategory) {
      const validCategories = ['Quiz', 'Assignment', 'Project', 'Attendance', 'MainExam', 'ClassPerformance', 'Others'];
      if (!validCategories.includes(examCategory)) {
        return NextResponse.json(
          { error: 'Invalid exam category' },
          { status: 400 }
        );
      }
      examData.examCategory = examCategory;
    }

    // Add numberOfCOs if provided (for theory courses)
    if (numberOfCOs !== undefined && numberOfCOs > 0) {
      if (numberOfCOs > 10) {
        return NextResponse.json(
          { error: 'Number of COs must be between 1 and 10' },
          { status: 400 }
        );
      }
      examData.numberOfCOs = numberOfCOs;
    }

    // Add numberOfQuestions if provided
    if (numberOfQuestions !== undefined && numberOfQuestions > 0) {
      if (numberOfQuestions > 50) {
        return NextResponse.json(
          { error: 'Number of Questions must be between 1 and 50' },
          { status: 400 }
        );
      }
      examData.numberOfQuestions = numberOfQuestions;
    }

    const exam = await Exam.create(examData);

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error: any) {
    console.error('Create exam error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

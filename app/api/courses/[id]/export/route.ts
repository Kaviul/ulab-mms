import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Course from '@/models/Course';
import Student from '@/models/Student';
import Exam from '@/models/Exam';
import Mark from '@/models/Mark';

// GET export course data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'

    await dbConnect();

    // Get course
    const course = await Course.findOne({ _id: courseId, userId: session.user.id });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get all students
    const students = await Student.find({ courseId });

    // Get all exams
    const exams = await Exam.find({ courseId });

    // Get all marks
    const marks = await Mark.find({ courseId });

    // Create export data structure
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      course: {
        name: course.name,
        code: course.code,
        semester: course.semester,
        year: course.year,
        courseType: course.courseType,
        showFinalGrade: course.showFinalGrade,
        quizAggregation: course.quizAggregation,
        quizWeightage: course.quizWeightage,
        assignmentAggregation: course.assignmentAggregation,
        assignmentWeightage: course.assignmentWeightage,
        gradingScale: course.gradingScale,
      },
      students: students.map(student => ({
        studentId: student.studentId,
        name: student.name,
      })),
      exams: exams.map(exam => ({
        displayName: exam.displayName,
        examType: exam.examType,
        totalMarks: exam.totalMarks,
        weightage: exam.weightage,
        scalingEnabled: exam.scalingEnabled,
        scalingMethod: exam.scalingMethod,
        scalingTarget: exam.scalingTarget,
        isRequired: exam.isRequired,
        examCategory: exam.examCategory,
        numberOfCOs: exam.numberOfCOs,
        numberOfQuestions: exam.numberOfQuestions,
      })),
      marks: marks.map(mark => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const student = students.find((s: any) => s._id.toString() === mark.studentId.toString());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exam = exams.find((e: any) => e._id.toString() === mark.examId.toString());
        
        return {
          studentId: student?.studentId,
          examDisplayName: exam?.displayName,
          rawMark: mark.rawMark,
          coMarks: mark.coMarks,
          questionMarks: mark.questionMarks,
          scaledMark: mark.scaledMark,
          roundedMark: mark.roundedMark,
        };
      }),
    };

    if (format === 'csv') {
      // Helper function to get aggregated mark for a category
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getAggregatedMark = (studentId: any, category: 'Quiz' | 'Assignment', aggregationMode?: 'average' | 'best'): any => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const categoryExams = exams.filter((e: any) => e.examCategory === category);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const categoryMarks = marks.filter((m: any) => 
          m.studentId.toString() === studentId.toString() &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          categoryExams.some((e: any) => e._id.toString() === m.examId.toString())
        );

        if (categoryMarks.length === 0) return null;

        if (aggregationMode === 'best') {
          let bestMark = categoryMarks[0];
          let bestPercentage = 0;
          
          categoryMarks.forEach((mark: any) => {
            const exam = categoryExams.find((e: any) => e._id.toString() === mark.examId.toString());
            if (exam) {
              const markToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null) 
                ? mark.scaledMark 
                : mark.rawMark;
              const totalMarksToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null && exam.scalingTarget) 
                ? exam.scalingTarget 
                : exam.totalMarks;
              const percentage = (markToUse / totalMarksToUse) * 100;
              
              if (percentage > bestPercentage) {
                bestPercentage = percentage;
                bestMark = mark;
              }
            }
          });

          return bestMark;
        } else {
          // Average
          let totalMarks = 0;
          
          categoryMarks.forEach((mark: any) => {
            const exam = categoryExams.find((e: any) => e._id.toString() === mark.examId.toString());
            if (exam) {
              const markToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null) 
                ? mark.scaledMark 
                : mark.rawMark;
              totalMarks += markToUse;
            }
          });

          const avgMark = totalMarks / categoryMarks.length;
          
          return {
            rawMark: avgMark,
            scaledMark: avgMark,
            roundedMark: Math.round(avgMark),
            isAggregated: true,
          };
        }
      };

      // Calculate final grade for a student
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calculateFinalGrade = (studentId: any): number => {
        let totalContribution = 0;

        // Process individual exams (non-Quiz, non-Assignment)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        exams.forEach((exam: any) => {
          if (exam.examCategory === 'Quiz' || exam.examCategory === 'Assignment') {
            return;
          }

          const mark = marks.find((m: any) => 
            m.studentId.toString() === studentId.toString() && 
            m.examId.toString() === exam._id.toString()
          );
          
          if (mark) {
            const markToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null) 
              ? mark.scaledMark 
              : mark.rawMark;
            const totalMarksToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null && exam.scalingTarget) 
              ? exam.scalingTarget 
              : exam.totalMarks;
            const percentage = (markToUse / totalMarksToUse) * 100;
            const contribution = (percentage * exam.weightage) / 100;
            totalContribution += contribution;
          }
        });

        // Add Quiz aggregated column
        const hasQuizzes = exams.some((e: any) => e.examCategory === 'Quiz');
        if (hasQuizzes && course.quizWeightage) {
          const aggMark = getAggregatedMark(studentId, 'Quiz', course.quizAggregation);
          if (aggMark) {
            let markToUse = 0;
            let totalMarks = 100;
            
            if ('isAggregated' in aggMark && aggMark.isAggregated) {
              markToUse = aggMark.rawMark;
              const quizExams = exams.filter((e: any) => e.examCategory === 'Quiz');
              if (quizExams.length > 0) {
                const scaledExams = quizExams.filter((e: any) => e.scalingEnabled && e.scalingTarget);
                if (scaledExams.length > 0) {
                  totalMarks = Math.max(...scaledExams.map((e: any) => e.scalingTarget));
                } else {
                  totalMarks = Math.max(...quizExams.map((e: any) => e.totalMarks));
                }
              }
            } else {
              const exam = exams.find((e: any) => e._id.toString() === aggMark.examId.toString());
              if (exam) {
                markToUse = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null) 
                  ? aggMark.scaledMark 
                  : aggMark.rawMark;
                totalMarks = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null && exam.scalingTarget) 
                  ? exam.scalingTarget 
                  : exam.totalMarks;
              }
            }
            
            const percentage = (markToUse / totalMarks) * 100;
            const contribution = (percentage * course.quizWeightage) / 100;
            totalContribution += contribution;
          }
        }

        // Add Assignment aggregated column
        const hasAssignments = exams.some((e: any) => e.examCategory === 'Assignment');
        if (hasAssignments && course.assignmentWeightage) {
          const aggMark = getAggregatedMark(studentId, 'Assignment', course.assignmentAggregation);
          if (aggMark) {
            let markToUse = 0;
            let totalMarks = 100;
            
            if ('isAggregated' in aggMark && aggMark.isAggregated) {
              markToUse = aggMark.rawMark;
              const assignmentExams = exams.filter((e: any) => e.examCategory === 'Assignment');
              if (assignmentExams.length > 0) {
                const scaledExams = assignmentExams.filter((e: any) => e.scalingEnabled && e.scalingTarget);
                if (scaledExams.length > 0) {
                  totalMarks = Math.max(...scaledExams.map((e: any) => e.scalingTarget));
                } else {
                  totalMarks = Math.max(...assignmentExams.map((e: any) => e.totalMarks));
                }
              }
            } else {
              const exam = exams.find((e: any) => e._id.toString() === aggMark.examId.toString());
              if (exam) {
                markToUse = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null) 
                  ? aggMark.scaledMark 
                  : aggMark.rawMark;
                totalMarks = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null && exam.scalingTarget) 
                  ? exam.scalingTarget 
                  : exam.totalMarks;
              }
            }
            
            const percentage = (markToUse / totalMarks) * 100;
            const contribution = (percentage * course.assignmentWeightage) / 100;
            totalContribution += contribution;
          }
        }

        return totalContribution;
      };

      // Create CSV with detailed marks
      const csvRows: string[] = [];
      
      // Header row - create columns for each exam with Raw/Scaled/Rounded
      const headers = ['Student ID', 'Name'];
      
      // Add individual exam columns (excluding Quiz and Assignment categories)
      exams.forEach((exam: any) => {
        if (exam.examCategory !== 'Quiz' && exam.examCategory !== 'Assignment') {
          headers.push(`${exam.displayName} (Raw)`);
          headers.push(`${exam.displayName} (Scaled)`);
          headers.push(`${exam.displayName} (Rounded)`);
          
          // Add CO marks columns if exam has COs
          if (exam.numberOfCOs && exam.numberOfCOs > 0) {
            for (let i = 1; i <= exam.numberOfCOs; i++) {
              headers.push(`${exam.displayName} CO${i}`);
            }
          }
          
          // Add Question marks columns if exam has Questions
          if (exam.numberOfQuestions && exam.numberOfQuestions > 0) {
            for (let i = 1; i <= exam.numberOfQuestions; i++) {
              headers.push(`${exam.displayName} Q${i}`);
            }
          }
        }
      });
      
      // Add Quiz columns
      exams.forEach((exam: any) => {
        if (exam.examCategory === 'Quiz') {
          headers.push(`${exam.displayName} (Raw)`);
          headers.push(`${exam.displayName} (Scaled)`);
          headers.push(`${exam.displayName} (Rounded)`);
        }
      });
      
      // Add Assignment columns
      exams.forEach((exam: any) => {
        if (exam.examCategory === 'Assignment') {
          headers.push(`${exam.displayName} (Raw)`);
          headers.push(`${exam.displayName} (Scaled)`);
          headers.push(`${exam.displayName} (Rounded)`);
        }
      });
      
      // Add remaining exam columns (Others, etc.)
      const otherExams = exams.filter((e: any) => 
        e.examCategory !== 'Quiz' && 
        e.examCategory !== 'Assignment' && 
        e.examCategory !== 'MainExam'
      );
      otherExams.forEach((exam: any) => {
        if (!headers.includes(`${exam.displayName} (Raw)`)) {
          headers.push(`${exam.displayName} (Raw)`);
          headers.push(`${exam.displayName} (Scaled)`);
          headers.push(`${exam.displayName} (Rounded)`);
        }
      });
      
      // Add aggregated columns
      const hasQuizzes = exams.some((e: any) => e.examCategory === 'Quiz');
      const hasAssignments = exams.some((e: any) => e.examCategory === 'Assignment');
      
      if (hasQuizzes && course.quizWeightage) {
        headers.push(`Quiz (Agg) - ${course.quizAggregation} • ${course.quizWeightage}%`);
      }
      
      if (hasAssignments && course.assignmentWeightage) {
        headers.push(`Assignment (Agg) - ${course.assignmentAggregation} • ${course.assignmentWeightage}%`);
      }
      
      // Add Final Grade column
      if (course.showFinalGrade) {
        headers.push('Final Grade (Est.)');
      }
      
      csvRows.push(headers.map(h => `"${h}"`).join(','));
      
      // Data rows - one per student
      students.forEach((student: any) => {
        const row: (string | number)[] = [
          student.studentId,
          student.name
        ];
        
        // Add individual exam marks (excluding Quiz and Assignment)
        exams.forEach((exam: any) => {
          if (exam.examCategory !== 'Quiz' && exam.examCategory !== 'Assignment') {
            const mark = marks.find((m: any) => 
              m.studentId.toString() === student._id.toString() && 
              m.examId.toString() === exam._id.toString()
            );
            
            if (mark) {
              row.push(mark.rawMark ?? '-');
              row.push(mark.scaledMark ?? '-');
              row.push(mark.roundedMark ?? '-');
              
              // Add CO marks if exam has COs
              if (exam.numberOfCOs && exam.numberOfCOs > 0) {
                if (mark.coMarks && mark.coMarks.length > 0) {
                  for (let i = 0; i < exam.numberOfCOs; i++) {
                    row.push(mark.coMarks[i] ?? '-');
                  }
                } else {
                  for (let i = 0; i < exam.numberOfCOs; i++) {
                    row.push('-');
                  }
                }
              }
              
              // Add Question marks if exam has Questions
              if (exam.numberOfQuestions && exam.numberOfQuestions > 0) {
                if (mark.questionMarks && mark.questionMarks.length > 0) {
                  for (let i = 0; i < exam.numberOfQuestions; i++) {
                    row.push(mark.questionMarks[i] ?? '-');
                  }
                } else {
                  for (let i = 0; i < exam.numberOfQuestions; i++) {
                    row.push('-');
                  }
                }
              }
            } else {
              row.push('-', '-', '-');
              
              // Add empty CO marks if exam has COs
              if (exam.numberOfCOs && exam.numberOfCOs > 0) {
                for (let i = 0; i < exam.numberOfCOs; i++) {
                  row.push('-');
                }
              }
              
              // Add empty Question marks if exam has Questions
              if (exam.numberOfQuestions && exam.numberOfQuestions > 0) {
                for (let i = 0; i < exam.numberOfQuestions; i++) {
                  row.push('-');
                }
              }
            }
          }
        });
        
        // Add Quiz marks
        exams.forEach((exam: any) => {
          if (exam.examCategory === 'Quiz') {
            const mark = marks.find((m: any) => 
              m.studentId.toString() === student._id.toString() && 
              m.examId.toString() === exam._id.toString()
            );
            
            if (mark) {
              row.push(mark.rawMark ?? '-');
              row.push(mark.scaledMark ?? '-');
              row.push(mark.roundedMark ?? '-');
            } else {
              row.push('-', '-', '-');
            }
          }
        });
        
        // Add Assignment marks
        exams.forEach((exam: any) => {
          if (exam.examCategory === 'Assignment') {
            const mark = marks.find((m: any) => 
              m.studentId.toString() === student._id.toString() && 
              m.examId.toString() === exam._id.toString()
            );
            
            if (mark) {
              row.push(mark.rawMark ?? '-');
              row.push(mark.scaledMark ?? '-');
              row.push(mark.roundedMark ?? '-');
            } else {
              row.push('-', '-', '-');
            }
          }
        });
        
        // Add other exam marks if any
        otherExams.forEach((exam: any) => {
          const alreadyAdded = exam.examCategory !== 'Quiz' && exam.examCategory !== 'Assignment';
          if (!alreadyAdded) {
            const mark = marks.find((m: any) => 
              m.studentId.toString() === student._id.toString() && 
              m.examId.toString() === exam._id.toString()
            );
            
            if (mark) {
              row.push(mark.rawMark ?? '-');
              row.push(mark.scaledMark ?? '-');
              row.push(mark.roundedMark ?? '-');
            } else {
              row.push('-', '-', '-');
            }
          }
        });
        
        // Add aggregated Quiz column
        if (hasQuizzes && course.quizWeightage) {
          const aggMark = getAggregatedMark(student._id, 'Quiz', course.quizAggregation);
          if (aggMark) {
            if ('isAggregated' in aggMark && aggMark.isAggregated) {
              row.push(aggMark.rawMark.toFixed(2));
            } else {
              const markToUse = aggMark.scaledMark ?? aggMark.rawMark;
              row.push(markToUse);
            }
          } else {
            row.push('-');
          }
        }
        
        // Add aggregated Assignment column
        if (hasAssignments && course.assignmentWeightage) {
          const aggMark = getAggregatedMark(student._id, 'Assignment', course.assignmentAggregation);
          if (aggMark) {
            if ('isAggregated' in aggMark && aggMark.isAggregated) {
              row.push(aggMark.rawMark.toFixed(2));
            } else {
              const markToUse = aggMark.scaledMark ?? aggMark.rawMark;
              row.push(markToUse);
            }
          } else {
            row.push('-');
          }
        }
        
        // Add Final Grade
        if (course.showFinalGrade) {
          const finalGrade = calculateFinalGrade(student._id);
          row.push(finalGrade.toFixed(2));
        }
        
        csvRows.push(row.map(cell => typeof cell === 'string' ? `"${cell}"` : cell).join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const buffer = Buffer.from(csvContent, 'utf-8');

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${course.code}_${course.name}_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // JSON format
      const json = JSON.stringify(exportData, null, 2);
      const buffer = Buffer.from(json);

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${course.code}_${course.name}_backup_${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

  } catch (error) {
    console.error('Export course error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

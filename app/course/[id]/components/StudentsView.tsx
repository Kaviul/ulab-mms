'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Pencil, Trash2 } from 'lucide-react';

interface Student {
  _id: string;
  studentId: string;
  name: string;
}

interface Exam {
  _id: string;
  name: string;
  totalMarks: number;
  weightage: number;
}

interface Mark {
  _id: string;
  studentId: string;
  examId: string;
  marks: number;
}

interface StudentsViewProps {
  students: Student[];
  exams: Exam[];
  marks: Mark[];
  course: any;
  onAddStudent: () => void;
  onBulkImportStudents: () => void;
  onOpenEditMarksModal: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  calculateGrade: (marks: number) => string;
  calculateLetterGrade: (numericGrade: number) => string;
}

export default function StudentsView({
  students,
  exams,
  marks,
  course,
  onAddStudent,
  onBulkImportStudents,
  onOpenEditMarksModal,
  onDeleteStudent,
  calculateGrade,
  calculateLetterGrade,
}: StudentsViewProps) {
  const getMarkForStudentExam = (studentId: string, examId: string) => {
    return marks.find((m) => m.studentId === studentId && m.examId === examId);
  };

  const calculateFinalGrade = (studentId: string) => {
    let totalWeightedMarks = 0;
    let totalWeightage = 0;

    exams.forEach((exam) => {
      const mark = getMarkForStudentExam(studentId, exam._id);
      if (mark) {
        const percentage = (mark.marks / exam.totalMarks) * 100;
        totalWeightedMarks += (percentage * exam.weightage) / 100;
        totalWeightage += exam.weightage;
      }
    });

    return totalWeightage > 0 ? totalWeightedMarks : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Manage students and view comprehensive grade reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onAddStudent} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
          <Button onClick={onBulkImportStudents} variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import (CSV)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Grades</CardTitle>
          <CardDescription>
            Complete grade view with all exam marks and final calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students enrolled yet. Add students to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10 min-w-[100px]">
                      Student ID
                    </TableHead>
                    <TableHead className="sticky left-[100px] bg-card z-10 min-w-[200px]">
                      Name
                    </TableHead>
                    {exams.map((exam) => (
                      <TableHead key={exam._id} className="text-center min-w-[120px]">
                        <div className="space-y-1">
                          <div className="font-semibold">{exam.name}</div>
                          <div className="text-xs text-muted-foreground">
                            ({exam.totalMarks}m, {exam.weightage}%)
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[100px]">
                      Final Grade
                    </TableHead>
                    {course.showFinalGrade && (
                      <TableHead className="text-center min-w-[100px]">
                        Letter Grade
                      </TableHead>
                    )}
                    <TableHead className="text-right sticky right-0 bg-card z-10 min-w-[150px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const finalGrade = calculateFinalGrade(student._id);
                    const letterGrade = calculateLetterGrade(finalGrade);

                    return (
                      <TableRow key={student._id}>
                        <TableCell className="sticky left-0 bg-card z-10 font-medium">
                          {student.studentId}
                        </TableCell>
                        <TableCell className="sticky left-[100px] bg-card z-10">
                          {student.name}
                        </TableCell>
                        {exams.map((exam) => {
                          const mark = getMarkForStudentExam(student._id, exam._id);
                          const grade = mark
                            ? calculateGrade((mark.marks / exam.totalMarks) * 100)
                            : '—';

                          return (
                            <TableCell key={exam._id} className="text-center">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {mark ? `${mark.marks}/${exam.totalMarks}` : '—'}
                                </div>
                                {mark && (
                                  <Badge variant="secondary" className="text-xs">
                                    {grade}%
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Badge variant={finalGrade >= 40 ? 'default' : 'destructive'}>
                            {finalGrade.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        {course.showFinalGrade && (
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                ['A+', 'A', 'A-', 'B+'].includes(letterGrade)
                                  ? 'default'
                                  : letterGrade === 'F'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {letterGrade}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-right sticky right-0 bg-card z-10">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => onOpenEditMarksModal(student)}
                              variant="ghost"
                              size="sm"
                              title="Edit marks"
                            >
                              <Pencil className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              onClick={() => onDeleteStudent(student)}
                              variant="ghost"
                              size="sm"
                              title="Delete student"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

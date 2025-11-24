'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

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

interface MarksViewProps {
  students: Student[];
  exams: Exam[];
  marks: Mark[];
  onOpenAddMarkModal: () => void;
  onSetEmptyMarksToZero: () => void;
  onResetMarks: () => void;
  onEditMark: (studentId: string, examId: string, currentMark?: Mark) => void;
}

export default function MarksView({
  students,
  exams,
  marks,
  onOpenAddMarkModal,
  onSetEmptyMarksToZero,
  onResetMarks,
  onEditMark,
}: MarksViewProps) {
  const getMarkForStudentExam = (studentId: string, examId: string) => {
    return marks.find((m) => m.studentId === studentId && m.examId === examId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marks Management</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Add and edit individual marks efficiently
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onOpenAddMarkModal} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Mark
          </Button>
          <Button
            onClick={onSetEmptyMarksToZero}
            variant="outline"
            size="sm"
          >
            Set Empty Marks to 0
          </Button>
          <Button
            onClick={onResetMarks}
            variant="destructive"
            size="sm"
          >
            Reset Marks
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marks Grid</CardTitle>
          <CardDescription>
            Click on any cell to add or edit marks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 || exams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {students.length === 0
                ? 'No students enrolled yet.'
                : 'No exams configured yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="grid" style={{ gridTemplateColumns: `250px repeat(${exams.length}, 150px)` }}>
                  {/* Header Row */}
                  <div className="sticky left-0 bg-muted font-semibold p-3 border-b z-10">
                    Student
                  </div>
                  {exams.map((exam) => (
                    <div
                      key={exam._id}
                      className="bg-muted font-semibold p-3 border-b text-center"
                    >
                      <div>{exam.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        (/{exam.totalMarks})
                      </div>
                    </div>
                  ))}

                  {/* Data Rows */}
                  {students.map((student) => (
                    <div key={student._id} className="contents">
                      <div className="sticky left-0 bg-card p-3 border-b z-10 flex flex-col justify-center">
                        <div className="font-medium text-sm">{student.studentId}</div>
                        <div className="text-xs text-muted-foreground">{student.name}</div>
                      </div>
                      {exams.map((exam) => {
                        const mark = getMarkForStudentExam(student._id, exam._id);
                        return (
                          <div
                            key={`${student._id}-${exam._id}`}
                            className="p-2 border-b flex items-center justify-center"
                          >
                            <Button
                              onClick={() =>
                                onEditMark(student._id, exam._id, mark)
                              }
                              variant={mark ? 'secondary' : 'outline'}
                              size="sm"
                              className="w-full"
                            >
                              {mark ? mark.marks : '+ Add'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

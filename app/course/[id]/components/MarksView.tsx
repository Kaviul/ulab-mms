'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

interface Student {
  _id: string;
  studentId: string;
  name: string;
}

interface Exam {
  _id: string;
  displayName: string;
  totalMarks: number;
}

interface Mark {
  _id: string;
  studentId: string;
  examId: string;
  rawMark: number;
}

interface MarksViewProps {
  students: Student[];
  exams: Exam[];
  marks: Mark[];
  getMark: (studentId: string, examId: string) => Mark | undefined;
  onShowMarkModal: (examId: string | undefined, studentId: string | undefined) => void;
  onShowSetZeroModal: () => void;
  onShowResetMarksModal: () => void;
}

export default function MarksView({
  students,
  exams,
  marks,
  getMark,
  onShowMarkModal,
  onShowSetZeroModal,
  onShowResetMarksModal,
}: MarksViewProps) {
  if (students.length === 0 || exams.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marks Management</h1>
        <p className="text-sm mt-1 text-muted-foreground">
          Add and manage marks for {students.length} student(s) across {exams.length} exam(s). Click on each mark to add or edit.
        </p>
      </div>
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={() => onShowMarkModal(undefined, undefined)}
          className="gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Mark
        </Button>
        <Button
          onClick={onShowSetZeroModal}
          variant="outline"
          className="gap-2 border-blue-500/50 hover:bg-blue-500/10"
        >
          <span>0️⃣</span>
          Set Empty Marks to 0
        </Button>
        <Button
          onClick={onShowResetMarksModal}
          variant="outline"
          className="gap-2 border-red-500/50 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
          Reset Marks
        </Button>
      </div>
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-0 z-20 bg-muted/50 border-r">Student</th>
                {exams.map(exam => (
                  <th key={exam._id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    <div>{exam.displayName}</div>
                    <div className="text-[10px] font-normal mt-0.5 text-muted-foreground">{exam.totalMarks} marks</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {students.map((student, idx) => (
                <tr key={student._id} className={`transition-colors hover:bg-muted/50 ${idx % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                  <td className={`px-4 py-3 text-sm font-medium sticky left-0 z-10 border-r ${idx % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                    <div className="flex flex-col">
                      <span className="text-primary">{student.studentId}</span>
                      <span className="text-xs text-muted-foreground">{student.name}</span>
                    </div>
                  </td>
                  {exams.map(exam => {
                    const mark = getMark(student._id, exam._id);
                    return (
                      <td key={exam._id} className={`px-4 py-3 text-sm`}>
                        <Button
                          onClick={() => onShowMarkModal(exam._id, student._id)}
                          variant={mark ? "secondary" : "outline"}
                          size="sm"
                          className="w-full justify-center"
                        >
                          {mark ? (
                            <span className="font-semibold">{mark.rawMark}</span>
                          ) : (
                            <span className="text-muted-foreground">+ Add</span>
                          )}
                        </Button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

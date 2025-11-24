'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Trash2 } from 'lucide-react';

interface Student {
  _id: string;
  studentId: string;
  name: string;
}

interface Exam {
  _id: string;
  displayName: string;
  totalMarks: number;
  weightage: number;
  scalingEnabled?: boolean;
  scalingTarget?: number | null;
  examCategory?: 'Quiz' | 'Assignment' | 'Project' | 'Attendance' | 'MainExam' | 'ClassPerformance' | 'Others';
}

interface Mark {
  _id: string;
  studentId: string;
  examId: string;
  rawMark: number;
  scaledMark?: number;
  roundedMark?: number;
}

interface Course {
  _id: string;
  name: string;
  code: string;
  quizAggregation?: 'average' | 'best';
  assignmentAggregation?: 'average' | 'best';
  quizWeightage?: number;
  assignmentWeightage?: number;
  gradingScale?: string;
}

interface GradeData {
  total: number;
  breakdown: Array<{
    name: string;
    mark: number;
    totalMarks: number;
    weightage: number;
    contribution: number;
    isAggregated?: boolean;
  }>;
}

interface LetterGrade {
  letter: string;
  modifier?: string;
}

interface StudentsViewProps {
  students: Student[];
  exams: Exam[];
  marks: Mark[];
  course: Course;
  hasQuizzes: boolean;
  hasAssignments: boolean;
  getMark: (studentId: string, examId: string) => Mark | undefined;
  getAggregatedMark: (studentId: string, category: 'Quiz' | 'Assignment') => Mark | { rawMark: number; scaledMark: number; roundedMark: number; isAggregated: boolean; examId?: string } | null;
  calculateFinalGrade: (studentId: string) => GradeData;
  calculateLetterGrade: (percentage: number, gradingScale?: string) => LetterGrade | null;
  getGradeDisplay: (letter: string, modifier?: string) => string;
  getGradeColor: (letter: string) => string;
  getGradeBgColor: (letter: string) => string;
  onShowAddStudentModal: () => void;
  onShowBulkAddStudentModal: () => void;
  onEditStudent: (student: Student) => void;
  onShowStudentDetail: (student: Student) => void;
  onShowGradeBreakdown: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
}

export default function StudentsView({
  students,
  exams,
  marks,
  course,
  hasQuizzes,
  hasAssignments,
  getMark,
  getAggregatedMark,
  calculateFinalGrade,
  calculateLetterGrade,
  getGradeDisplay,
  getGradeColor,
  getGradeBgColor,
  onShowAddStudentModal,
  onShowBulkAddStudentModal,
  onEditStudent,
  onShowStudentDetail,
  onShowGradeBreakdown,
  onDeleteStudent,
}: StudentsViewProps) {
  if (students.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students & Marks</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Managing {students.length} student(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onShowAddStudentModal}
            variant="outline"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
          <Button
            onClick={onShowBulkAddStudentModal}
            variant="outline"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Import (CSV)
          </Button>
        </div>
      </div>
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-0 z-20 bg-muted border-r">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-[100px] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)] bg-muted border-r">Name</th>
                {exams.map(exam => (
                  <th key={exam._id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    <div>{exam.displayName}</div>
                    <div className="text-[10px] font-normal mt-0.5 text-muted-foreground">Raw / Scaled / Rounded</div>
                  </th>
                ))}
                {hasQuizzes && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-amber-900/20 border-l-2 border-amber-500/50">
                    <div className="flex items-center gap-1">
                      <span>📝 Quiz (Agg)</span>
                    </div>
                    <div className="text-[10px] font-normal mt-0.5 text-amber-400">
                      {course?.quizAggregation === 'best' ? 'Best' : 'Average'} • {course?.quizWeightage || 0}%
                    </div>
                  </th>
                )}
                {hasAssignments && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-blue-900/20 border-l-2 border-blue-500/50">
                    <div className="flex items-center gap-1">
                      <span>📋 Assignment (Agg)</span>
                    </div>
                    <div className="text-[10px] font-normal mt-0.5 text-blue-400">
                      {course?.assignmentAggregation === 'best' ? 'Best' : 'Average'} • {course?.assignmentWeightage || 0}%
                    </div>
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-l-2 border-green-500/50">
                  <div className="flex items-center gap-1">
                    <span>🎯 Final Grade (Est.)</span>
                  </div>
                  <div className="text-[10px] font-normal mt-0.5 text-green-400">
                    Weighted Total
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-purple-900/20 to-violet-900/20 border-l-2 border-purple-500/50">
                  <div className="flex items-center gap-1">
                    <span>🏆 Letter Grade</span>
                  </div>
                  <div className="text-[10px] font-normal mt-0.5 text-purple-400">
                    Based on %
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {students.map((student, idx) => (
                <tr key={student._id} className={`transition-colors hover:bg-muted/50 ${idx % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                  <td className={`px-4 py-3 text-sm font-medium text-primary sticky left-0 z-10 border-r ${idx % 2 === 0 ? 'bg-muted' : 'bg-background'}`}>{student.studentId}</td>
                  <td className={`px-4 py-3 text-sm sticky left-[100px] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)] border-r ${idx % 2 === 0 ? 'bg-muted' : 'bg-background'}`}>
                    <button
                      onClick={() => onShowStudentDetail(student)}
                      className="hover:text-blue-400 hover:underline transition-colors cursor-pointer text-left"
                    >
                      {student.name}
                    </button>
                  </td>
                  {exams.map(exam => {
                    const mark = getMark(student._id, exam._id);
                    return (
                      <td key={exam._id} className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            {mark ? (
                              exam.scalingEnabled ? (
                                <div className="flex flex-col gap-1">
                                  <Badge variant="secondary" className="font-medium justify-start">
                                    Raw: {mark.rawMark}
                                  </Badge>
                                  {mark.scaledMark !== undefined && mark.scaledMark !== null ? (
                                    <Badge variant="secondary" className="font-medium bg-emerald-500/20 justify-start">
                                      Scaled: {mark.scaledMark}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs italic text-muted-foreground">Not scaled</span>
                                  )}
                                  {mark.roundedMark !== undefined && mark.roundedMark !== null ? (
                                    <Badge variant="secondary" className="font-medium bg-purple-500/20">
                                      Rounded: {mark.roundedMark}
                                    </Badge>
                                  ) : mark.scaledMark !== undefined && mark.scaledMark !== null ? (
                                    <span className="text-xs italic text-muted-foreground">Not rounded</span>
                                  ) : null}
                                </div>
                              ) : (
                                <Badge variant="secondary" className="font-medium">
                                  {mark.rawMark}
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  {hasQuizzes && (
                    <td className="px-4 py-3 text-sm bg-amber-900/10 border-l-2 border-amber-500/30">
                      {(() => {
                        const aggMark = getAggregatedMark(student._id, 'Quiz');
                        if (!aggMark) return <span className="text-gray-600">0</span>;
                        
                        if ('isAggregated' in aggMark && aggMark.isAggregated) {
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-1 rounded font-medium text-xs bg-amber-900/40 text-amber-200">
                                Avg: {aggMark.rawMark.toFixed(2)}
                              </span>
                              <span className="px-2 py-1 rounded font-medium text-xs bg-amber-800/40 text-amber-300">
                                Rounded: {aggMark.roundedMark}
                              </span>
                            </div>
                          );
                        } else {
                          const exam = exams.find(e => e._id === aggMark.examId);
                          if (!exam) return <span className="text-gray-600">0</span>;
                          
                          const markToUse = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null) 
                            ? aggMark.scaledMark 
                            : aggMark.rawMark;
                          const markLabel = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null) 
                            ? 'Scaled' 
                            : 'Raw';
                          
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-1 rounded font-medium text-xs bg-amber-900/40 text-amber-200">
                                Best: {markToUse}
                              </span>
                              <span className="text-xs italic text-gray-500">
                                ({markLabel}: {markToUse}/{exam.totalMarks})
                              </span>
                            </div>
                          );
                        }
                      })()}
                    </td>
                  )}
                  {hasAssignments && (
                    <td className="px-4 py-3 text-sm bg-blue-900/10 border-l-2 border-blue-500/30">
                      {(() => {
                        const aggMark = getAggregatedMark(student._id, 'Assignment');
                        if (!aggMark) return <span className="text-gray-600">0</span>;
                        
                        if ('isAggregated' in aggMark && aggMark.isAggregated) {
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-1 rounded font-medium text-xs bg-blue-900/40 text-blue-200">
                                Avg: {aggMark.rawMark.toFixed(2)}
                              </span>
                              <span className="px-2 py-1 rounded font-medium text-xs bg-blue-800/40 text-blue-300">
                                Rounded: {aggMark.roundedMark}
                              </span>
                            </div>
                          );
                        } else {
                          const exam = exams.find(e => e._id === aggMark.examId);
                          if (!exam) return <span className="text-gray-600">0</span>;
                          
                          const markToUse = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null) 
                            ? aggMark.scaledMark 
                            : aggMark.rawMark;
                          const markLabel = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null) 
                            ? 'Scaled' 
                            : 'Raw';
                          
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-1 rounded font-medium text-xs bg-blue-900/40 text-blue-200">
                                Best: {markToUse}
                              </span>
                              <span className="text-xs italic text-gray-500">
                                ({markLabel}: {markToUse}/{exam.totalMarks})
                              </span>
                            </div>
                          );
                        }
                      })()}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm bg-gradient-to-r from-green-900/10 to-emerald-900/10 border-l-2 border-green-500/30">
                    {(() => {
                      const gradeData = calculateFinalGrade(student._id);
                      if (gradeData.breakdown.length === 0) {
                        return <span className="text-gray-600">0</span>;
                      }
                      
                      return (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-1 rounded font-medium text-xs bg-green-900/40 text-green-200">
                                Total: {gradeData.total.toFixed(2)}%
                              </span>
                              <span className="text-[10px] italic text-gray-500">
                                Out of 100%
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => onShowGradeBreakdown(student)}
                            className="px-2 py-1 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-xs rounded transition-all"
                            title="View breakdown"
                          >
                            ℹ️
                          </button>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm bg-gradient-to-r from-purple-900/10 to-violet-900/10 border-l-2 border-purple-500/30">
                    {(() => {
                      const gradeData = calculateFinalGrade(student._id);
                      if (gradeData.breakdown.length === 0) {
                        return <span className="text-gray-600">0</span>;
                      }
                      
                      const letterGrade = calculateLetterGrade(gradeData.total, course?.gradingScale);
                      
                      if (!letterGrade) {
                        return <span className="text-gray-600">0</span>;
                      }
                      
                      return (
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1.5 rounded-lg font-bold text-sm ${getGradeBgColor(letterGrade.letter)} ${getGradeColor(letterGrade.letter)} border ${letterGrade.letter === 'A' ? 'border-green-500/30' : letterGrade.letter === 'B' ? 'border-blue-500/30' : letterGrade.letter === 'C' ? 'border-yellow-500/30' : letterGrade.letter === 'D' ? 'border-orange-500/30' : 'border-red-500/30'}`}>
                            {getGradeDisplay(letterGrade.letter, letterGrade.modifier)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({gradeData.total.toFixed(2)}%)
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditStudent(student)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs rounded-lg transition-all"
                        title="Edit Student"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDeleteStudent(student)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-all"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

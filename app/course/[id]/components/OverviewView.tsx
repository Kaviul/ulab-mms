'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, FlaskConical, Upload, Download, Plus } from 'lucide-react';

interface Course {
  _id: string;
  name: string;
  code: string;
  semester: string;
  year: number;
  courseType: 'Theory' | 'Lab';
  showFinalGrade: boolean;
}

interface OverviewViewProps {
  course: Course;
  students: any[];
  exams: any[];
  marks: any[];
  onImportStudents: () => void;
  onAddExam: () => void;
  onImportCourse: () => void;
  onExportCSV: () => void;
  exportingCSV: boolean;
}

export default function OverviewView({
  course,
  students,
  exams,
  marks,
  onImportStudents,
  onAddExam,
  onImportCourse,
  onExportCSV,
  exportingCSV,
}: OverviewViewProps) {
  const totalWeightage = exams.reduce((sum, exam) => sum + exam.weightage, 0);
  const studentsWithMarks = students.filter(student => 
    marks.some(mark => mark.studentId === student._id)
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Course Overview</h1>
        <p className="text-sm mt-1 text-muted-foreground">
          Manage your course structure and view statistics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <span className="text-2xl">👨‍🎓</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">
              {studentsWithMarks} with marks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exams</CardTitle>
            <span className="text-2xl">📝</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exams.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalWeightage}% total weightage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marks Recorded</CardTitle>
            <span className="text-2xl">✏️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marks.length}</div>
            <p className="text-xs text-muted-foreground">
              Total entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
            <span className="text-2xl">📊</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.length > 0 && exams.length > 0
                ? Math.round((marks.length / (students.length * exams.length)) * 100)
                : 0}%
            </div>
            <Progress 
              value={students.length > 0 && exams.length > 0
                ? (marks.length / (students.length * exams.length)) * 100
                : 0
              } 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Student Management</h3>
              <Button
                onClick={onImportStudents}
                variant="outline"
                className="w-full justify-start"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Students (CSV)
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Exam Management</h3>
              <Button
                onClick={onAddExam}
                variant="outline"
                className="w-full justify-start"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Exam
              </Button>
            </div>



            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Course Data</h3>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={onImportCourse}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Course Data
                </Button>
                <Button
                  onClick={onExportCSV}
                  disabled={exportingCSV}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportingCSV ? 'Exporting...' : 'Export CSV'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {course.courseType === 'Theory' ? (
              <BookOpen className="w-5 h-5" />
            ) : (
              <FlaskConical className="w-5 h-5" />
            )}
            Course Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Course Code</div>
              <div className="font-medium">{course.code}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Course Type</div>
              <Badge variant={course.courseType === 'Theory' ? 'default' : 'secondary'}>
                {course.courseType}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Semester</div>
              <div className="font-medium">{course.semester}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Year</div>
              <div className="font-medium">{course.year}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

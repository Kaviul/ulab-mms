'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Loader2, TrendingUp, Award } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import { 
  calculateLetterGrade, 
  getGradeDisplay,
  getGradeColor,
  getGradeBgColor,
  DEFAULT_GRADING_SCALE,
  decodeGradingScale 
} from '@/app/utils/grading';

interface Student {
  _id: string;
  studentId: string;
  name: string;
}

interface Course {
  _id: string;
  name: string;
  code: string;
  semester: string;
  year: number;
  courseType: 'Theory' | 'Lab';
  showFinalGrade: boolean;
  quizAggregation?: 'average' | 'best';
  quizWeightage?: number;
  assignmentAggregation?: 'average' | 'best';
  assignmentWeightage?: number;
  gradingScale?: string;
}

interface Exam {
  _id: string;
  displayName: string;
  totalMarks: number;
  weightage: number;
  scalingEnabled: boolean;
  scalingMethod?: string;
  scalingTarget?: number;
  examType: string;
  examCategory?: 'Quiz' | 'Assignment' | 'Project' | 'Attendance' | 'MainExam' | 'ClassPerformance' | 'Others';
  numberOfCOs?: number;
  numberOfQuestions?: number;
}

interface Mark {
  _id: string;
  examId: string;
  rawMark: number;
  coMarks?: number[];
  questionMarks?: number[];
  scaledMark?: number;
  roundedMark?: number;
}

interface ClassStats {
  examId: string;
  average: number;
  highest: number;
  lowest: number;
  count: number;
}

interface CourseData {
  student: Student;
  course: Course;
  exams: Exam[];
  marks: Mark[];
  classStats: ClassStats[];
}

export default function StudentCheckMarks() {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSearched(false);
    setCourses([]);

    try {
      const response = await fetch(`/api/student/marks?studentId=${encodeURIComponent(studentId)}`);
      const data = await response.json();

      if (response.ok) {
        setCourses(data.courses);
        setStudentName(data.studentName);
        setSearched(true);
      } else {
        setError(data.error || 'Student ID not found');
        setSearched(true);
      }
    } catch (err) {
      setError('An error occurred while fetching marks');
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const getMark = (marks: Mark[], examId: string) => {
    return marks.find(m => m.examId === examId);
  };

  // Calculate aggregated mark for Quiz or Assignment
  const getAggregatedMark = (courseData: CourseData, category: 'Quiz' | 'Assignment'): { mark: number; totalMarks: number } | null => {
    const categoryExams = courseData.exams.filter(exam => exam.examCategory === category);
    
    if (categoryExams.length === 0) return null;

    const categoryMarks = categoryExams
      .map(exam => getMark(courseData.marks, exam._id))
      .filter(mark => mark !== undefined);

    if (categoryMarks.length === 0) return null;

    const aggregationMethod = category === 'Quiz' 
      ? courseData.course.quizAggregation || 'average'
      : courseData.course.assignmentAggregation || 'average';

    if (aggregationMethod === 'best') {
      // Find the best mark
      let bestMark = categoryMarks[0];
      let bestValue = 0;

      categoryMarks.forEach(mark => {
        const exam = categoryExams.find(e => e._id === mark!.examId);
        if (exam) {
          const markToUse = (exam.scalingEnabled && mark!.scaledMark !== undefined && mark!.scaledMark !== null) 
            ? mark!.scaledMark 
            : mark!.rawMark;
          
          if (markToUse > bestValue) {
            bestValue = markToUse;
            bestMark = mark!;
          }
        }
      });

      const exam = categoryExams.find(e => e._id === bestMark!.examId);
      if (exam) {
        const markValue = (exam.scalingEnabled && bestMark!.scaledMark !== undefined && bestMark!.scaledMark !== null) 
          ? bestMark!.scaledMark 
          : bestMark!.rawMark;
        const totalMarks = (exam.scalingEnabled && bestMark!.scaledMark !== undefined && bestMark!.scaledMark !== null && exam.scalingTarget) 
          ? exam.scalingTarget 
          : exam.totalMarks;
        
        return { mark: markValue, totalMarks };
      }
    } else {
      // Calculate average
      let totalMarks = 0;
      
      categoryMarks.forEach(mark => {
        const exam = categoryExams.find(e => e._id === mark!.examId);
        if (exam) {
          const markToUse = (exam.scalingEnabled && mark!.scaledMark !== undefined && mark!.scaledMark !== null) 
            ? mark!.scaledMark 
            : mark!.rawMark;
          totalMarks += markToUse;
        }
      });

      const avgMark = totalMarks / categoryMarks.length;
      
      // Find max scalingTarget or totalMarks
      const scaledExams = categoryExams.filter(e => e.scalingEnabled && e.scalingTarget);
      const maxTotal = scaledExams.length > 0
        ? Math.max(...scaledExams.map(e => e.scalingTarget!))
        : Math.max(...categoryExams.map(e => e.totalMarks));
      
      return { mark: avgMark, totalMarks: maxTotal };
    }

    return null;
  };

  // Calculate final grade with Quiz/Assignment aggregation
  const calculateFinalGrade = (courseData: CourseData): { total: number; breakdown: Array<{ name: string; mark: number; totalMarks: number; weightage: number; contribution: number; isAggregated?: boolean }> } => {
    const breakdown: Array<{ name: string; mark: number; totalMarks: number; weightage: number; contribution: number; isAggregated?: boolean }> = [];
    let totalContribution = 0;

    const hasQuizzes = courseData.exams.some(exam => exam.examCategory === 'Quiz');
    const hasAssignments = courseData.exams.some(exam => exam.examCategory === 'Assignment');

    // Process individual exams (non-Quiz, non-Assignment)
    courseData.exams.forEach(exam => {
      if (exam.examCategory === 'Quiz' || exam.examCategory === 'Assignment') {
        return; // Skip, will be handled by aggregated columns
      }

      const mark = getMark(courseData.marks, exam._id);
      if (mark) {
        const markToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null) 
          ? mark.scaledMark 
          : mark.rawMark;
        
        const totalMarksToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null && exam.scalingTarget) 
          ? exam.scalingTarget 
          : exam.totalMarks;
        
        const percentage = (markToUse / totalMarksToUse) * 100;
        const contribution = (percentage * exam.weightage) / 100;
        
        breakdown.push({
          name: exam.displayName,
          mark: markToUse,
          totalMarks: totalMarksToUse,
          weightage: exam.weightage,
          contribution: contribution,
        });
        
        totalContribution += contribution;
      }
    });

    // Add Quiz aggregated column if exists
    if (hasQuizzes && courseData.course.quizWeightage) {
      const aggMark = getAggregatedMark(courseData, 'Quiz');
      if (aggMark) {
        const percentage = (aggMark.mark / aggMark.totalMarks) * 100;
        const contribution = (percentage * courseData.course.quizWeightage) / 100;
        
        breakdown.push({
          name: 'Quiz (Aggregated)',
          mark: aggMark.mark,
          totalMarks: aggMark.totalMarks,
          weightage: courseData.course.quizWeightage,
          contribution: contribution,
          isAggregated: true,
        });
        
        totalContribution += contribution;
      }
    }

    // Add Assignment aggregated column if exists
    if (hasAssignments && courseData.course.assignmentWeightage) {
      const aggMark = getAggregatedMark(courseData, 'Assignment');
      if (aggMark) {
        const percentage = (aggMark.mark / aggMark.totalMarks) * 100;
        const contribution = (percentage * courseData.course.assignmentWeightage) / 100;
        
        breakdown.push({
          name: 'Assignment (Aggregated)',
          mark: aggMark.mark,
          totalMarks: aggMark.totalMarks,
          weightage: courseData.course.assignmentWeightage,
          contribution: contribution,
          isAggregated: true,
        });
        
        totalContribution += contribution;
      }
    }

    return {
      total: totalContribution,
      breakdown: breakdown,
    };
  };

  const calculateWeightedScore = (courseData: CourseData) => {
    return calculateFinalGrade(courseData).total;
  };

  const calculateTotalWeightage = (exams: Exam[]) => {
    return exams.reduce((sum, exam) => sum + exam.weightage, 0);
  };

  const calculateEstimatedGrade = (courseData: CourseData) => {
    const gradeData = calculateFinalGrade(courseData);
    const completedExams = courseData.marks.length;
    const totalExams = courseData.exams.length;
    const remainingExams = totalExams - completedExams;
    
    if (remainingExams === 0) {
      return null; // All exams completed
    }

    // Calculate remaining weightage
    const completedWeightage = courseData.exams
      .filter(exam => courseData.marks.some(m => m.examId === exam._id))
      .reduce((sum, exam) => sum + exam.weightage, 0);
    
    const remainingWeightage = calculateTotalWeightage(courseData.exams) - completedWeightage;

    // Calculate what's needed for different grade targets
    const targets = [
      { grade: 'A', min: 80 },
      { grade: 'B', min: 65 },
      { grade: 'C', min: 50 },
      { grade: 'D', min: 40 },
    ];

    const estimates = targets.map(target => {
      const neededTotal = target.min;
      const neededFromRemaining = neededTotal - gradeData.total;
      const averageNeeded = remainingWeightage > 0 ? (neededFromRemaining / remainingWeightage) * 100 : 0;
      
      return {
        grade: target.grade,
        targetPercentage: target.min,
        averageNeeded: Math.max(0, averageNeeded),
        achievable: averageNeeded <= 100 && averageNeeded >= 0
      };
    });

    return {
      completedExams,
      totalExams,
      remainingExams,
      completedWeightage,
      remainingWeightage,
      currentPoints: gradeData.total,
      estimates
    };
  };

  // Memoized modal grade calculations
  const modalGradeData = useMemo(() => {
    if (!selectedCourse) return null;
    return calculateFinalGrade(selectedCourse);
  }, [selectedCourse]);

  const modalLetterGrade = useMemo(() => {
    if (!modalGradeData || modalGradeData.total <= 0 || !selectedCourse) return null;
    return calculateLetterGrade(modalGradeData.total, selectedCourse.course.gradingScale);
  }, [modalGradeData, selectedCourse]);

  const modalProjections = useMemo(() => {
    if (!modalGradeData || !selectedCourse) return null;

    const completedWeightage = modalGradeData.breakdown.reduce((sum, item) => sum + item.weightage, 0);
    const totalWeightage = selectedCourse.exams.reduce((sum, exam) => {
      if (exam.examCategory === 'Quiz' && selectedCourse.course?.quizWeightage) return sum;
      if (exam.examCategory === 'Assignment' && selectedCourse.course?.assignmentWeightage) return sum;
      return sum + exam.weightage;
    }, 0) + (selectedCourse.course?.quizWeightage || 0) + (selectedCourse.course?.assignmentWeightage || 0);
    const remainingWeightage = totalWeightage - completedWeightage;

    if (remainingWeightage <= 0) {
      return null;
    }

    const targets = [
      { grade: 'A+', min: 95, color: 'green' },
      { grade: 'A', min: 85, color: 'green' },
      { grade: 'A-', min: 80, color: 'blue' },
      { grade: 'B+', min: 75, color: 'blue' },
      { grade: 'B', min: 70, color: 'blue' },
      { grade: 'B-', min: 65, color: 'yellow' },
      { grade: 'C+', min: 60, color: 'yellow' },
      { grade: 'C-', min: 55, color: 'orange' },
      { grade: 'D', min: 50, color: 'orange' },
    ];

    const estimates = targets.map(target => {
      const neededTotal = target.min;
      const neededFromRemaining = neededTotal - modalGradeData.total;
      const averageNeeded = remainingWeightage > 0 ? (neededFromRemaining / remainingWeightage) * 100 : 0;
      
      return {
        grade: target.grade,
        targetPercentage: target.min,
        averageNeeded: Math.max(0, averageNeeded),
        achievable: averageNeeded <= 100 && averageNeeded >= 0,
        color: target.color,
      };
    });

    return {
      completedWeightage,
      totalWeightage,
      remainingWeightage,
      currentPoints: modalGradeData.total,
      estimates: estimates.filter(e => e.achievable),
    };
  }, [modalGradeData, selectedCourse]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/ulab.svg"
                alt="ULAB Logo"
                width={50}
                height={50}
                className="drop-shadow-lg"
              />
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  📊 Check Your Marks
                </h1>
                <p className="text-xs text-muted-foreground">
                  Student Self-Service Portal
                </p>
              </div>
            </div>

            <Button variant="outline" asChild>
              <Link href="/auth/signin">
                ← Back to Sign In
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 pt-8">
        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Enter Your Student ID
            </CardTitle>
            <CardDescription>
              Search for your marks using your student ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="studentId" className="sr-only">Student ID</Label>
                <Input
                  id="studentId"
                  type="text"
                  placeholder="Enter your Student ID (e.g., 2021-1-60-001)"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {searched && courses.length > 0 && (
          <>
            {/* Student Info */}
            <Card className="mb-6 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl">
                    👨‍🎓
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{studentName}</h2>
                    <p className="text-sm text-muted-foreground">Student ID: {studentId}</p>
                    <Badge variant="secondary" className="mt-2">
                      Enrolled in {courses.length} course{courses.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Courses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((courseData) => {
                const gradeData = calculateFinalGrade(courseData);
                const totalWeightage = calculateTotalWeightage(courseData.exams);
                const marksCount = courseData.marks.length;
                const examsCount = courseData.exams.length;

                return (
                  <Card
                    key={courseData.course._id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      setSelectedCourse(courseData);
                      setShowCourseModal(true);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">
                          {courseData.course.courseType === 'Theory' ? '📖' : '🔬'}
                        </span>
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {courseData.course.name}
                          </CardTitle>
                          <CardDescription>
                            {courseData.course.code} • {courseData.course.semester} {courseData.course.year}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={courseData.course.courseType === 'Theory' ? 'default' : 'secondary'}>
                          {courseData.course.courseType}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {marksCount}/{examsCount} exams
                        </span>
                        {courseData.course.showFinalGrade && marksCount > 0 && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            Grade: {totalWeightage > 0 
                              ? `${((gradeData.total / totalWeightage) * 100).toFixed(1)}%`
                              : 'N/A'}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-primary flex items-center gap-1">
                        Click to view detailed marks →
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Course Detail Modal */}
        <Dialog open={showCourseModal} onOpenChange={setShowCourseModal}>
          <DialogContent className="w-[95vw] max-w-[1400px] max-h-[90vh] overflow-y-auto">
            {selectedCourse && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {selectedCourse.course.courseType === 'Theory' ? '📖' : '🔬'}
                    </span>
                    <div>
                      <DialogTitle>{selectedCourse.course.name}</DialogTitle>
                      <DialogDescription>
                        {selectedCourse.course.code} • {selectedCourse.course.semester} {selectedCourse.course.year}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

              {/* Grade Summary Card - Top for mobile, Right side for desktop */}
              {selectedCourse.marks.length > 0 && modalGradeData && modalGradeData.breakdown.length > 0 && (
                <div className="mb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Grade Display - Right column on desktop */}
                    <div className="lg:col-span-1 lg:order-2">
                      <Card className="lg:sticky lg:top-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            🎯 Your Estimated Grade
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                        
                        {/* Big Grade Display */}
                        <div className="text-center mb-6">
                          {modalLetterGrade && (
                            <div>
                              <div className={`text-6xl font-bold mb-2 ${getGradeColor(modalLetterGrade.letter)}`}>
                                {modalLetterGrade.letter}
                                {modalLetterGrade.modifier === '1' ? '-' : modalLetterGrade.modifier === '2' ? '+' : ''}
                              </div>
                              <div className="text-sm text-gray-400 mb-1">
                                {getGradeDisplay(modalLetterGrade.letter, modalLetterGrade.modifier)}
                              </div>
                              <div className="text-3xl font-bold text-cyan-300 mb-1">
                                {modalGradeData.total.toFixed(2)}%
                              </div>
                              <div className="text-xs text-gray-500">
                                Current weighted score
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3">
                          <Card className="bg-blue-500/10 border-blue-500/20">
                            <CardContent className="p-3 text-center">
                              <div className="text-2xl font-bold text-blue-400">
                                {selectedCourse.marks.length}
                              </div>
                              <div className="text-xs text-muted-foreground">Exams Taken</div>
                            </CardContent>
                          </Card>
                          <Card className="bg-emerald-500/10 border-emerald-500/20">
                            <CardContent className="p-3 text-center">
                              <div className="text-2xl font-bold text-emerald-400">
                                {selectedCourse.exams.length - selectedCourse.marks.length}
                              </div>
                              <div className="text-xs text-muted-foreground">Remaining</div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Grade Projections */}
                        {modalProjections && modalProjections.estimates.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-3 flex items-center gap-2">
                              🎓 Grade Targets
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {modalProjections.estimates.slice(0, 6).map((est, idx) => (
                                <Card key={idx} className="bg-card/50">
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`text-lg font-bold ${
                                        est.color === 'green' ? 'text-green-400' :
                                        est.color === 'blue' ? 'text-blue-400' :
                                        est.color === 'yellow' ? 'text-yellow-400' :
                                        'text-orange-400'
                                      }`}>
                                        {est.grade}
                                      </span>
                                      <span className="text-xl font-bold text-cyan-400">
                                        {est.averageNeeded.toFixed(1)}%
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Need avg {est.averageNeeded.toFixed(1)}% in remaining exams
                                    </div>
                                    <div className="mt-2 w-full bg-secondary rounded-full h-1.5">
                                      <div 
                                        className={`h-1.5 rounded-full ${
                                          est.color === 'green' ? 'bg-green-500' :
                                          est.color === 'blue' ? 'bg-blue-500' :
                                          est.color === 'yellow' ? 'bg-yellow-500' :
                                          'bg-orange-500'
                                        }`}
                                        style={{ width: `${Math.min(est.averageNeeded, 100)}%` }}
                                      ></div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                            <Card className="mt-3 bg-cyan-500/10 border-cyan-500/20">
                              <CardContent className="p-2 text-xs text-cyan-400">
                                💡 These are the average percentages you need in remaining exams to achieve each grade
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {!modalProjections && (
                          <Card className="bg-green-500/10 border-green-500/20">
                            <CardContent className="pt-6 text-center">
                              <div className="text-3xl mb-2">🎉</div>
                              <div className="text-sm font-medium text-green-300">
                                All exams completed!
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                This is your final grade
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Grade Breakdown - Left column on desktop */}
                    <div className="lg:col-span-2 lg:order-1 space-y-4">
                      <Card className="bg-gradient-to-br from-primary/5 to-primary/[0.02] border-primary/10">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            📊 Grade Breakdown
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                        <div className="space-y-2">
                          {modalGradeData.breakdown.map((item, idx) => (
                            <div key={idx} className={`flex items-center justify-between text-xs p-2 rounded ${
                              item.isAggregated ? 'bg-amber-900/20 border border-amber-700/30' : 'bg-gray-800/50'
                            }`}>
                              <div className="flex items-center gap-2 flex-1">
                                {item.isAggregated && <span>📊</span>}
                                <span className="text-gray-300">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-blue-400">
                                  {item.mark.toFixed(2)}/{item.totalMarks}
                                </span>
                                <span className="text-purple-400">
                                  {((item.mark / item.totalMarks) * 100).toFixed(1)}%
                                </span>
                                <span className="text-gray-500">×</span>
                                <span className="text-cyan-400">{item.weightage}%</span>
                                <span className="text-gray-500">=</span>
                                <span className="text-green-400 font-semibold min-w-[3rem] text-right">
                                  {item.contribution.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-sm p-2 bg-green-500/10 border border-green-500/20 rounded font-semibold mt-2">
                            <span>Total Points:</span>
                            <span className="text-base text-green-400">{modalGradeData.total.toFixed(2)}%</span>
                          </div>
                        </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Exam Details Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  📝 Exam Details
                </h3>

              {selectedCourse.exams.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-muted-foreground">No exams configured for this course yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCourse.exams.map((exam) => {
                    const mark = getMark(selectedCourse.marks, exam._id);
                    const stats = selectedCourse.classStats.find(s => s.examId === exam._id);
                    
                    return (
                      <Card
                        key={exam._id}
                        className={mark 
                          ? 'border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5 hover:border-blue-500/50' 
                          : 'hover:border-primary/50'
                        }
                      >
                        <CardContent className="pt-6">
                        {/* Exam Header */}
                        <div className="mb-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              {exam.displayName}
                            </h4>
                            {exam.examCategory && (
                              <Badge variant="secondary" className="flex-shrink-0">
                                {exam.examCategory}
                              </Badge>
                            )}
                          </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>📝 Total: {exam.totalMarks} marks</span>
                              {exam.scalingTarget && exam.scalingEnabled && (
                                <span className="text-emerald-400">• Scaled to: {exam.scalingTarget}</span>
                              )}
                              {exam.numberOfCOs && (
                                <span className="text-purple-400">• {exam.numberOfCOs} COs</span>
                              )}
                              {exam.numberOfQuestions && (
                                <span className="text-cyan-400">• {exam.numberOfQuestions} Questions</span>
                              )}
                            </div>
                            {exam.examCategory !== 'Quiz' && exam.examCategory !== 'Assignment' && (
                              <div>⚖️ Weightage: {exam.weightage}%</div>
                            )}
                            {exam.scalingMethod && (
                              <div className="text-purple-400">🔄 Method: {exam.scalingMethod}</div>
                            )}
                          </div>
                        </div>

                        {mark ? (
                          <>
                            {/* Marks Display */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              <Card className="bg-blue-500/10 border-blue-500/20">
                                <CardContent className="p-3 text-center">
                                  <div className="text-xs text-muted-foreground mb-1">Raw</div>
                                  <div className="text-lg font-bold text-blue-400">
                                    {mark.rawMark}
                                  </div>
                                  <div className="text-xs text-muted-foreground">/{exam.totalMarks}</div>
                                </CardContent>
                              </Card>

                              {exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null ? (
                                <Card className="bg-emerald-500/10 border-emerald-500/20">
                                  <CardContent className="p-3 text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Scaled</div>
                                    <div className="text-lg font-bold text-emerald-400">
                                      {mark.scaledMark.toFixed(2)}
                                    </div>
                                    {exam.scalingTarget && (
                                      <div className="text-xs text-muted-foreground">/{exam.scalingTarget}</div>
                                    )}
                                  </CardContent>
                                </Card>
                              ) : (
                                <Card className="bg-muted/50">
                                  <CardContent className="p-3 text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Scaled</div>
                                    <div className="text-xs text-muted-foreground italic">Not scaled</div>
                                  </CardContent>
                                </Card>
                              )}

                              {exam.scalingEnabled && mark.roundedMark !== undefined && mark.roundedMark !== null ? (
                                <Card className="bg-purple-500/10 border-purple-500/20">
                                  <CardContent className="p-3 text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Final</div>
                                    <div className="text-lg font-bold text-purple-400">
                                      {mark.roundedMark}
                                    </div>
                                  </CardContent>
                                </Card>
                              ) : (
                                <Card className="bg-muted/50">
                                  <CardContent className="p-3 text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Final</div>
                                    <div className="text-xs text-muted-foreground italic">N/A</div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>

                            {/* Performance Visualization */}
                            {stats && stats.count > 0 && (() => {
                              const studentMark = exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null
                                ? mark.scaledMark
                                : mark.rawMark;
                              const maxValue = exam.scalingEnabled && exam.scalingTarget ? exam.scalingTarget : exam.totalMarks;
                              const avgPercent = (stats.average / stats.highest) * 100;
                              const studentPercent = (studentMark / stats.highest) * 100;

                              return (
                                <Card className="bg-indigo-500/5 border-indigo-500/20">
                                  <CardContent className="p-3">
                                  <div className="text-xs font-medium text-gray-300 mb-3 flex items-center gap-2">
                                    <span>📊</span>
                                    <span>Class Performance</span>
                                    <span className="ml-auto text-gray-500">({stats.count} students)</span>
                                  </div>
                                  
                                  {/* Progress bars style visualization */}
                                  <div className="space-y-2">
                                    {/* Highest */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-400 w-12">High</span>
                                      <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-green-600 to-green-400 flex items-center justify-end pr-2"
                                          style={{ width: '100%' }}
                                        >
                                          <span className="text-xs font-semibold text-white">{stats.highest.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Student */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-400 w-12 flex items-center gap-1">
                                        <span>👤</span>
                                        <span>You</span>
                                      </span>
                                      <div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden border-2 border-blue-500">
                                        <div 
                                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-end pr-2"
                                          style={{ width: `${studentPercent}%` }}
                                        >
                                          <span className="text-xs font-semibold text-white">{studentMark.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Average */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-400 w-12">Avg</span>
                                      <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 flex items-center justify-end pr-2"
                                          style={{ width: `${avgPercent}%` }}
                                        >
                                          <span className="text-xs font-semibold text-white">{stats.average.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Lowest */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-400 w-12">Low</span>
                                      <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-red-600 to-red-400 flex items-center justify-end pr-2"
                                          style={{ width: `${(stats.lowest / stats.highest) * 100}%` }}
                                        >
                                          <span className="text-xs font-semibold text-white">{stats.lowest.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Performance badge */}
                                  <div className="mt-3 text-center">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                      studentMark >= stats.average 
                                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    }`}>
                                      {studentMark >= stats.average ? '🎯 Above Average' : '📈 Below Average'}
                                    </span>
                                  </div>
                                  </CardContent>
                                </Card>
                              );
                            })()}

                            {/* CO Marks */}
                            {mark.coMarks && mark.coMarks.length > 0 && (
                              <Card className="mt-3 bg-muted/30">
                                <CardContent className="p-3">
                                  <div className="text-xs font-medium mb-2">
                                    CO Breakdown
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {mark.coMarks.map((coMark, idx) => (
                                      <div key={idx} className="text-center p-2 bg-muted rounded">
                                        <div className="text-xs text-muted-foreground">CO{idx + 1}</div>
                                        <div className="text-sm font-semibold text-cyan-400">
                                          {coMark}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Question Marks */}
                            {mark.questionMarks && mark.questionMarks.length > 0 && (
                              <Card className="mt-3 bg-indigo-500/5 border-indigo-500/20">
                                <CardContent className="p-3">
                                  <div className="text-xs font-medium mb-2">
                                    Question-wise Marks
                                  </div>
                                  <div className="grid grid-cols-4 gap-2">
                                    {mark.questionMarks.map((qMark, idx) => (
                                      <div key={idx} className="text-center p-2 bg-indigo-500/10 rounded">
                                        <div className="text-xs text-muted-foreground">Q{idx + 1}</div>
                                        <div className="text-sm font-semibold text-indigo-400">
                                          {qMark}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground italic">
                            <div className="text-3xl mb-2">📝</div>
                            <div className="text-sm">Marks not recorded yet</div>
                          </div>
                        )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

              {/* Additional Course Information */}
              {selectedCourse.course.showFinalGrade && selectedCourse.marks.length > 0 && (
                <Card className="mt-6 bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      ℹ️ Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>
                      <strong>Note:</strong> Your estimated grade is calculated based on completed exams using weighted scoring.
                    </p>
                    {(selectedCourse.exams.some(e => e.examCategory === 'Quiz') || 
                      selectedCourse.exams.some(e => e.examCategory === 'Assignment')) && (
                      <p>
                        Quiz and Assignment marks are aggregated using the <strong>
                        {selectedCourse.course.quizAggregation === 'best' ? 'Best' : 'Average'}</strong> method for quizzes
                        and <strong>{selectedCourse.course.assignmentAggregation === 'best' ? 'Best' : 'Average'}</strong> method for assignments.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {searched && courses.length === 0 && !error && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔍</span>
              </div>
              <CardTitle className="mb-2">No Results Found</CardTitle>
              <CardDescription>
                No records found for Student ID: {studentId}
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!searched && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">💡</span>
                How to Check Your Marks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Badge variant="outline">1</Badge>
                  <span>Enter your complete Student ID in the search box above</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline">2</Badge>
                  <span>Click the "Search" button to retrieve your marks</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline">3</Badge>
                  <span>View all your courses by clicking on each course card</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline">4</Badge>
                  <span>See detailed marks including raw, scaled, and CO-wise breakdowns</span>
                </li>
              </ul>
              
              <Separator />
              
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm">
                  <strong>Note:</strong> Make sure you enter your Student ID exactly as it appears in your records (including hyphens or special characters if any).
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

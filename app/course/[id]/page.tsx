'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { parseCSV } from '@/app/utils/csv';
import AddMarkModal from '@/app/components/AddMarkModal';
import StudentDetailModal from '@/app/components/StudentDetailModal';
import { 
  GradeThreshold, 
  DEFAULT_GRADING_SCALE, 
  decodeGradingScale, 
  encodeGradingScale, 
  calculateLetterGrade, 
  validateGradingScale,
  getGradeDisplay,
  getGradeColor,
  getGradeBgColor 
} from '@/app/utils/grading';

interface Student {
  _id: string;
  studentId: string;
  name: string;
}

interface Exam {
  _id: string;
  displayName: string;
  examType: 'midterm' | 'final' | 'labFinal' | 'oel' | 'custom';
  totalMarks: number;
  weightage: number;
  scalingEnabled: boolean;
  isRequired: boolean;
  numberOfCOs?: number;
  numberOfQuestions?: number;
  scalingMethod?: string;
  scalingTarget?: number;
  examCategory?: 'Quiz' | 'Assignment' | 'Project' | 'Attendance' | 'MainExam' | 'ClassPerformance' | 'Others';
}

interface Mark {
  _id: string;
  studentId: string;
  examId: string;
  rawMark: number;
  coMarks?: number[];
  scaledMark?: number;
  roundedMark?: number;
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
  assignmentAggregation?: 'average' | 'best';
  quizWeightage?: number;
  assignmentWeightage?: number;
  gradingScale?: string;
}

export default function CoursePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showExamSettings, setShowExamSettings] = useState<string | null>(null);
  const [showCourseSettings, setShowCourseSettings] = useState(false);
  const [initialExamId, setInitialExamId] = useState<string | undefined>(undefined);
  const [initialStudentId, setInitialStudentId] = useState<string | undefined>(undefined);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showGradeBreakdown, setShowGradeBreakdown] = useState(false);
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState<Student | null>(null);
  const [showImportCourseModal, setShowImportCourseModal] = useState(false);
  const [importCourseFile, setImportCourseFile] = useState<File | null>(null);
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [importingCourse, setImportingCourse] = useState(false);
  const [courseSettingsTab, setCourseSettingsTab] = useState<'aggregation' | 'grading'>('aggregation');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'exams' | 'students' | 'marks'>('overview');
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [searchStudentId, setSearchStudentId] = useState('');
  const [showStudentStatsModal, setShowStudentStatsModal] = useState(false);
  const [selectedStudentForStats, setSelectedStudentForStats] = useState<Student | null>(null);
  
  const [csvInput, setCsvInput] = useState('');
  const [examFormData, setExamFormData] = useState({
    displayName: '',
    totalMarks: '',
    weightage: '',
    numberOfCOs: '',
    numberOfQuestions: '',
    examCategory: '',
  });
  const [examSettings, setExamSettings] = useState({
    displayName: '',
    weightage: '',
    numberOfCOs: '',
    numberOfQuestions: '',
    totalMarks: '',
    examCategory: '',
  });
  const [courseSettingsData, setCourseSettingsData] = useState({
    quizAggregation: 'average' as 'average' | 'best',
    assignmentAggregation: 'average' as 'average' | 'best',
    quizWeightage: '',
    assignmentWeightage: '',
    gradingScale: DEFAULT_GRADING_SCALE,
  });
  const [scalingTargets, setScalingTargets] = useState<{ [examId: string]: string }>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        setTheme((e.newValue as 'light' | 'dark') || 'dark');
      }
    };

    const handleThemeChange = (e: CustomEvent) => {
      setTheme(e.detail.theme);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themeChange' as any, handleThemeChange as any);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange' as any, handleThemeChange as any);
    };
  }, []);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      const data = await response.json();
      
      if (response.ok) {
        setCourse(data.course);
        setStudents(data.students || []);
        setExams(data.exams || []);
        setMarks(data.marks || []);
      }
    } catch (err) {
      console.error('Error fetching course data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportStudents = async () => {
    try {
      const parsedStudents = parseCSV(csvInput);
      
      if (parsedStudents.length === 0) {
        setError('No valid student data found');
        return;
      }

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          students: parsedStudents.map(s => ({
            studentId: s.id,
            name: s.name,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStudents([...students, ...data.students]);
        setShowImportModal(false);
        setCsvInput('');
        setError('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error importing students');
    }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const examData: any = {
        courseId,
        displayName: examFormData.displayName,
        totalMarks: parseFloat(examFormData.totalMarks),
      };

      // Add examCategory if provided
      if (examFormData.examCategory) {
        examData.examCategory = examFormData.examCategory;
      }

      // Only add weightage for non-Quiz and non-Assignment exams
      if (examFormData.examCategory !== 'Quiz' && examFormData.examCategory !== 'Assignment') {
        examData.weightage = parseFloat(examFormData.weightage);
      } else {
        examData.weightage = 0; // Set to 0 for Quiz/Assignment
      }

      // Add numberOfCOs if provided (for theory courses)
      if (examFormData.numberOfCOs) {
        examData.numberOfCOs = parseInt(examFormData.numberOfCOs);
      }

      // Add numberOfQuestions if provided
      if (examFormData.numberOfQuestions) {
        examData.numberOfQuestions = parseInt(examFormData.numberOfQuestions);
      }

      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData),
      });

      const data = await response.json();

      if (response.ok) {
        setExams([...exams, data.exam]);
        setShowExamModal(false);
        setExamFormData({ displayName: '', totalMarks: '', weightage: '', numberOfCOs: '', numberOfQuestions: '', examCategory: '' });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error creating exam');
    }
  };

  const handleApplyScaling = async (examId: string, method: string) => {
    try {
      const response = await fetch('/api/scaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, method, applyRound: false }),
      });

      if (response.ok) {
        // Refresh course data to get updated marks
        await fetchCourseData();
        alert('Scaling applied successfully!');
      }
    } catch (err) {
      console.error('Error applying scaling:', err);
      alert('Error applying scaling');
    }
  };

  const handleToggleScaling = async (examId: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/exams/${examId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scalingEnabled: !currentValue }),
      });

      if (response.ok) {
        await fetchCourseData();
      } else {
        alert('Error updating scaling setting');
      }
    } catch (err) {
      console.error('Error toggling scaling:', err);
      alert('Error toggling scaling');
    }
  };

  const handleUpdateScalingTarget = async (examId: string, target: number) => {
    if (isNaN(target) || target <= 0) {
      alert('Please enter a valid scaling target value');
      return;
    }

    const exam = exams.find(e => e._id === examId);
    if (exam && target > exam.totalMarks) {
      alert(`Scaling target cannot exceed total marks (${exam.totalMarks})`);
      return;
    }

    try {
      // Update the scaling target in the database
      const response = await fetch(`/api/exams/${examId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scalingTarget: target }),
      });

      if (response.ok) {
        // If exam has a scaling method set, recalculate the scaling with new target
        if (exam?.scalingMethod) {
          const scalingResponse = await fetch('/api/scaling', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ examId, method: exam.scalingMethod, applyRound: false }),
          });

          if (scalingResponse.ok) {
            await fetchCourseData();
            // Clear the temporary input value
            setScalingTargets(prev => {
              const updated = { ...prev };
              delete updated[examId];
              return updated;
            });
            alert('Scaling target updated and marks recalculated successfully!');
          } else {
            alert('Scaling target updated but failed to recalculate marks');
            await fetchCourseData();
          }
        } else {
          await fetchCourseData();
          // Clear the temporary input value
          setScalingTargets(prev => {
            const updated = { ...prev };
            delete updated[examId];
            return updated;
          });
          alert('Scaling target updated successfully!');
        }
      } else {
        alert('Error updating scaling target');
      }
    } catch (err) {
      console.error('Error updating scaling target:', err);
      alert('Error updating scaling target');
    }
  };

  const handleUpdateExamSettings = async () => {
    if (!showExamSettings) return;
    
    try {
      const updateData: any = {};
      if (examSettings.displayName) updateData.displayName = examSettings.displayName;
      if (examSettings.weightage) updateData.weightage = parseFloat(examSettings.weightage);
      if (examSettings.totalMarks) updateData.totalMarks = parseFloat(examSettings.totalMarks);
      if (examSettings.numberOfCOs) updateData.numberOfCOs = parseInt(examSettings.numberOfCOs);
      if (examSettings.numberOfQuestions) updateData.numberOfQuestions = parseInt(examSettings.numberOfQuestions);
      if (examSettings.examCategory) updateData.examCategory = examSettings.examCategory;

      const response = await fetch(`/api/exams/${showExamSettings}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        await fetchCourseData();
        setShowExamSettings(null);
        setExamSettings({ displayName: '', weightage: '', numberOfCOs: '', numberOfQuestions: '', totalMarks: '', examCategory: '' });
        setError('');
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Error updating exam settings');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam? This will delete all associated marks.')) {
      return;
    }

    try {
      const response = await fetch(`/api/exams/${examId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCourseData();
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (err) {
      console.error('Error deleting exam:', err);
      alert('Error deleting exam');
    }
  };

  const handleApplyRounding = async (examId: string) => {
    try {
      const exam = exams.find(e => e._id === examId);
      if (!exam?.scalingMethod) {
        alert('Please apply a scaling method first');
        return;
      }

      const response = await fetch('/api/scaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, method: exam.scalingMethod, applyRound: true }),
      });

      if (response.ok) {
        await fetchCourseData();
        alert('Rounding applied successfully!');
      }
    } catch (err) {
      console.error('Error applying rounding:', err);
      alert('Error applying rounding');
    }
  };

  const handleSaveCourseSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Validate grading scale
      const validationError = validateGradingScale(courseSettingsData.gradingScale);
      if (validationError) {
        setError(`Grading scale error: ${validationError}`);
        return;
      }

      const updateData: any = {
        quizAggregation: courseSettingsData.quizAggregation,
        assignmentAggregation: courseSettingsData.assignmentAggregation,
        gradingScale: encodeGradingScale(courseSettingsData.gradingScale),
      };

      if (courseSettingsData.quizWeightage) {
        updateData.quizWeightage = parseFloat(courseSettingsData.quizWeightage);
      }
      if (courseSettingsData.assignmentWeightage) {
        updateData.assignmentWeightage = parseFloat(courseSettingsData.assignmentWeightage);
      }

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        await fetchCourseData();
        setShowCourseSettings(false);
        alert('Course settings updated successfully!');
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Error updating course settings');
    }
  };

  const handleExportCourse = async () => {
    setExportingJSON(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/export?format=json`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${course?.code}_${course?.name}_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Course exported as JSON successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Error exporting course');
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Error exporting course');
    } finally {
      setExportingJSON(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/export?format=csv`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${course?.code}_${course?.name}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Course exported as CSV successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Error exporting course');
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Error exporting course');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleImportCourse = async () => {
    if (!importCourseFile) {
      alert('Please select a file to import');
      return;
    }

    setImportingCourse(true);
    try {
      const fileContent = await importCourseFile.text();
      const courseData = JSON.parse(fileContent);

      const response = await fetch(`/api/courses/${courseId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        await fetchCourseData();
        setShowImportCourseModal(false);
        setImportCourseFile(null);
        alert('Course imported successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Error importing course');
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Error importing course. Please ensure the file is valid.');
    } finally {
      setImportingCourse(false);
    }
  };

  const getMark = (studentId: string, examId: string) => {
    return marks.find(m => m.studentId === studentId && m.examId === examId);
  };

  // Calculate aggregated mark for a student based on exam category
  const getAggregatedMark = (studentId: string, category: 'Quiz' | 'Assignment'): Mark | { rawMark: number; scaledMark: number; roundedMark: number; isAggregated: boolean; examId?: string } | null => {
    // Get all exams of this category
    const categoryExams = exams.filter(exam => exam.examCategory === category);
    
    if (categoryExams.length === 0) return null;

    // Get all marks for this student in this category
    const categoryMarks = categoryExams
      .map(exam => getMark(studentId, exam._id))
      .filter(mark => mark !== undefined);

    if (categoryMarks.length === 0) return null;

    // Calculate based on aggregation method
    const aggregationMethod = category === 'Quiz' 
      ? course?.quizAggregation || 'average'
      : course?.assignmentAggregation || 'average';

    if (aggregationMethod === 'best') {
      // Find the best mark (highest actual mark, using scaled if available)
      let bestMark = categoryMarks[0];
      let bestValue = 0;

      categoryMarks.forEach(mark => {
        const exam = categoryExams.find(e => e._id === mark.examId);
        if (exam) {
          // Use scaled mark if available and exam has scaling enabled, otherwise use raw mark
          const markToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null) 
            ? mark.scaledMark 
            : mark.rawMark;
          
          if (markToUse > bestValue) {
            bestValue = markToUse;
            bestMark = mark;
          }
        }
      });

      return bestMark;
    } else {
      // Calculate average of actual marks (not percentages)
      let totalMarks = 0;
      
      categoryMarks.forEach(mark => {
        const exam = categoryExams.find(e => e._id === mark.examId);
        if (exam) {
          // Use scaled mark if available and exam has scaling enabled, otherwise use raw mark
          const markToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null) 
            ? mark.scaledMark 
            : mark.rawMark;
          totalMarks += markToUse;
        }
      });

      const avgMark = totalMarks / categoryMarks.length;
      
      // Return a synthetic mark object for display
      return {
        rawMark: avgMark,
        scaledMark: avgMark, // For aggregated marks, scaled = raw (already calculated from scaled marks if available)
        roundedMark: Math.round(avgMark),
        isAggregated: true,
      };
    }
  };

  // Check if we should show aggregated columns
  const hasQuizzes = exams.some(exam => exam.examCategory === 'Quiz');
  const hasAssignments = exams.some(exam => exam.examCategory === 'Assignment');

  // Calculate final grade for a student
  const calculateFinalGrade = (studentId: string): { total: number; breakdown: Array<{ name: string; mark: number; totalMarks: number; weightage: number; contribution: number; isAggregated?: boolean }> } => {
    const breakdown: Array<{ name: string; mark: number; totalMarks: number; weightage: number; contribution: number; isAggregated?: boolean }> = [];
    let totalContribution = 0;

    // Process individual exams (non-Quiz, non-Assignment)
    exams.forEach(exam => {
      if (exam.examCategory === 'Quiz' || exam.examCategory === 'Assignment') {
        return; // Skip, will be handled by aggregated columns
      }

      const mark = getMark(studentId, exam._id);
      if (mark) {
        // Use scaled mark if available and scaling is enabled, otherwise raw mark
        const markToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null) 
          ? mark.scaledMark 
          : mark.rawMark;
        
        // Use scalingTarget if scaling is enabled and mark is scaled, otherwise use totalMarks
        const totalMarksToUse = (exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null && exam.scalingTarget) 
          ? exam.scalingTarget 
          : exam.totalMarks;
        
        // Calculate percentage
        const percentage = (markToUse / totalMarksToUse) * 100;
        
        // Calculate contribution (percentage * weightage / 100)
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
    if (hasQuizzes && course?.quizWeightage) {
      const aggMark = getAggregatedMark(studentId, 'Quiz');
      if (aggMark) {
        let markToUse = 0;
        let totalMarks = 100; // Aggregated marks are already percentages or actual marks
        
        if ('isAggregated' in aggMark && aggMark.isAggregated) {
          // Average mode: rawMark is the average value
          markToUse = aggMark.rawMark;
          // For aggregated average, find the maximum scalingTarget or totalMarks
          // This handles cases where different quizzes have different scaling targets
          const quizExams = exams.filter(e => e.examCategory === 'Quiz');
          if (quizExams.length > 0) {
            // Find the max scalingTarget among scaled exams, or max totalMarks if none are scaled
            const scaledExams = quizExams.filter(e => e.scalingEnabled && e.scalingTarget);
            if (scaledExams.length > 0) {
              totalMarks = Math.max(...scaledExams.map(e => e.scalingTarget!));
            } else {
              totalMarks = Math.max(...quizExams.map(e => e.totalMarks));
            }
          }
        } else {
          // Best mode: get the actual mark
          const exam = exams.find(e => e._id === aggMark.examId);
          if (exam) {
            markToUse = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null) 
              ? aggMark.scaledMark 
              : aggMark.rawMark;
            // Use scalingTarget if scaling is enabled and mark is scaled, otherwise use totalMarks
            totalMarks = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null && exam.scalingTarget) 
              ? exam.scalingTarget 
              : exam.totalMarks;
          }
        }
        
        // Calculate percentage
        const percentage = (markToUse / totalMarks) * 100;
        
        // Calculate contribution
        const contribution = (percentage * course.quizWeightage) / 100;
        
        breakdown.push({
          name: 'Quiz (Aggregated)',
          mark: markToUse,
          totalMarks: totalMarks,
          weightage: course.quizWeightage,
          contribution: contribution,
          isAggregated: true,
        });
        
        totalContribution += contribution;
      }
    }

    // Add Assignment aggregated column if exists
    if (hasAssignments && course?.assignmentWeightage) {
      const aggMark = getAggregatedMark(studentId, 'Assignment');
      if (aggMark) {
        let markToUse = 0;
        let totalMarks = 100;
        
        if ('isAggregated' in aggMark && aggMark.isAggregated) {
          // Average mode
          markToUse = aggMark.rawMark;
          // For aggregated average, find the maximum scalingTarget or totalMarks
          // This handles cases where different assignments have different scaling targets
          const assignmentExams = exams.filter(e => e.examCategory === 'Assignment');
          if (assignmentExams.length > 0) {
            // Find the max scalingTarget among scaled exams, or max totalMarks if none are scaled
            const scaledExams = assignmentExams.filter(e => e.scalingEnabled && e.scalingTarget);
            if (scaledExams.length > 0) {
              totalMarks = Math.max(...scaledExams.map(e => e.scalingTarget!));
            } else {
              totalMarks = Math.max(...assignmentExams.map(e => e.totalMarks));
            }
          }
        } else {
          // Best mode
          const exam = exams.find(e => e._id === aggMark.examId);
          if (exam) {
            markToUse = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null) 
              ? aggMark.scaledMark 
              : aggMark.rawMark;
            // Use scalingTarget if scaling is enabled and mark is scaled, otherwise use totalMarks
            totalMarks = (exam.scalingEnabled && aggMark.scaledMark !== undefined && aggMark.scaledMark !== null && exam.scalingTarget) 
              ? exam.scalingTarget 
              : exam.totalMarks;
          }
        }
        
        // Calculate percentage
        const percentage = (markToUse / totalMarks) * 100;
        
        // Calculate contribution
        const contribution = (percentage * course.assignmentWeightage) / 100;
        
        breakdown.push({
          name: 'Assignment (Aggregated)',
          mark: markToUse,
          totalMarks: totalMarks,
          weightage: course.assignmentWeightage,
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

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900'
          : 'bg-gradient-to-br from-gray-100 via-slate-100 to-gray-100'
      }`}>
        <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Loading...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900'
          : 'bg-gradient-to-br from-gray-100 via-slate-100 to-gray-100'
      }`}>
        <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Course not found</div>
      </div>
    );
  }

  // Helper functions for student stats modal
  const handleStudentSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchStudentId.trim()) return;
    
    const student = students.find(s => 
      s.studentId.toLowerCase().includes(searchStudentId.toLowerCase()) ||
      s.name.toLowerCase().includes(searchStudentId.toLowerCase())
    );
    
    if (student) {
      setSelectedStudent(student);
      setShowStudentDetail(true);
      setSearchStudentId('');
    } else {
      alert('Student not found in this course');
    }
  };

  const getStudentMarks = (studentId: string) => {
    return marks.filter(m => m.studentId === studentId);
  };

  const calculateTotalWeightage = () => {
    return exams.reduce((sum, exam) => sum + exam.weightage, 0);
  };

  const getClassStatsForExam = (examId: string) => {
    const examMarks = marks.filter(m => m.examId === examId);
    if (examMarks.length === 0) return null;

    const exam = exams.find(e => e._id === examId);
    const values = examMarks.map(m => {
      if (!exam) return m.rawMark;
      return exam.scalingEnabled && m.scaledMark !== undefined && m.scaledMark !== null
        ? m.scaledMark
        : m.rawMark;
    });

    return {
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      highest: Math.max(...values),
      lowest: Math.min(...values),
      count: values.length
    };
  };

  const calculateEstimatedGrade = (studentId: string) => {
    const gradeData = calculateFinalGrade(studentId);
    const studentMarks = marks.filter(m => m.studentId === studentId);
    const completedExams = studentMarks.length;
    const totalExams = exams.length;
    const remainingExams = totalExams - completedExams;
    
    if (remainingExams === 0) {
      return null; // All exams completed
    }

    // Calculate remaining weightage
    const completedWeightage = exams
      .filter(exam => studentMarks.some(m => m.examId === exam._id))
      .reduce((sum, exam) => sum + exam.weightage, 0);
    
    const remainingWeightage = calculateTotalWeightage() - completedWeightage;

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

  return (
    <>
    <div className={`min-h-screen transition-colors ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900'
        : 'bg-gradient-to-br from-gray-100 via-slate-100 to-gray-100'
    }`}>
      {/* Navbar */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${
        theme === 'dark'
          ? 'bg-gray-900/80 border-gray-700'
          : 'bg-white/80 border-gray-300'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Image
                  src="/ulab.svg"
                  alt="ULAB Logo"
                  width={50}
                  height={50}
                  className="drop-shadow-lg cursor-pointer"
                />
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                  {course?.courseType === 'Theory' ? '📖' : '🔬'} {course.name}
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                  {course.code} • {course.semester} {course.year} • 
                  <span className={`ml-1 px-2 py-0.5 rounded text-xs font-medium ${
                    course?.courseType === 'Theory' 
                      ? 'bg-blue-900/30 text-blue-300' 
                      : 'bg-purple-900/30 text-purple-300'
                  }`}>
                    {course.courseType}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className={`px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                }`}
              >
                ⚙️ Settings
              </Link>
              <Link
                href="/dashboard"
                className={`px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                }`}
              >
                ← Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-medium text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar + Main Content Layout */}
      <div className="flex h-[calc(100vh-72px)]">
        {/* Left Sidebar */}
        <aside className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } transition-all duration-300 border-r ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
        } flex flex-col`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">☰</span>
              {sidebarOpen && <span className={`font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Menu</span>}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <button
              onClick={() => setActiveView('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeView === 'overview'
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">📊</span>
              {sidebarOpen && <span className="font-medium">Overview</span>}
            </button>
            
            <button
              onClick={() => setActiveView('exams')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeView === 'exams'
                  ? 'bg-emerald-600 text-white'
                  : theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">📝</span>
              {sidebarOpen && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="font-medium">Exams</span>
                  <span className="px-2 py-0.5 bg-black/20 rounded text-xs">{exams.length}</span>
                </div>
              )}
            </button>
            
            <button
              onClick={() => setActiveView('students')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeView === 'students'
                  ? 'bg-purple-600 text-white'
                  : theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">👥</span>
              {sidebarOpen && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="font-medium">Students</span>
                  <span className="px-2 py-0.5 bg-black/20 rounded text-xs">{students.length}</span>
                </div>
              )}
            </button>
            
            <button
              onClick={() => setActiveView('marks')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeView === 'marks'
                  ? 'bg-amber-600 text-white'
                  : theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">✏️</span>
              {sidebarOpen && <span className="font-medium">Marks</span>}
            </button>

            {sidebarOpen && <div className="pt-4 mt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}"></div>}

            <button
              onClick={() => {
                setCourseSettingsData({
                  quizAggregation: course?.quizAggregation || 'average',
                  assignmentAggregation: course?.assignmentAggregation || 'average',
                  quizWeightage: course?.quizWeightage?.toString() || '',
                  assignmentWeightage: course?.assignmentWeightage?.toString() || '',
                  gradingScale: course?.gradingScale 
                    ? decodeGradingScale(course.gradingScale) 
                    : DEFAULT_GRADING_SCALE,
                });
                setShowCourseSettings(true);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">⚙️</span>
              {sidebarOpen && <span className="font-medium">Settings</span>}
            </button>
          </nav>

          {/* Student Search */}
          <div className={`px-4 py-3 border-t border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
            {sidebarOpen ? (
              <form onSubmit={handleStudentSearch} className="space-y-2">
                <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  🔍 Search Student
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchStudentId}
                    onChange={(e) => setSearchStudentId(e.target.value)}
                    placeholder="ID or Name"
                    className={`flex-1 px-2 py-1.5 text-sm rounded border ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-all"
                  >
                    →
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className={`w-full flex items-center justify-center p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-all`}
                title="Search Student"
              >
                <span className="text-xl">🔍</span>
              </button>
            )}
          </div>

          {/* Quick Actions */}
          {sidebarOpen && (
            <div className="p-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} space-y-2">
              <button
                onClick={handleExportCourse}
                disabled={!course || exportingJSON}
                className="w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-2 justify-center"
              >
                {exportingJSON ? '...' : '📤 Export'}
              </button>
              <button
                onClick={() => setShowImportCourseModal(true)}
                className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-all flex items-center gap-2 justify-center"
              >
                📥 Import
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            {/* Overview View */}
            {activeView === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                    Course Overview
                  </h1>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Quick stats and actions for {course?.name}
                  </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`rounded-xl p-6 border ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/50'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">👥</span>
                      <div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Students</div>
                        <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{students.length}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="w-full mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-all"
                    >
                      ➕ Import Students
                    </button>
                  </div>

                  <div className={`rounded-xl p-6 border ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border-emerald-700/50'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">📝</span>
                      <div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Exams</div>
                        <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{exams.length}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowExamModal(true)}
                      className="w-full mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-all"
                    >
                      ➕ Add Exam
                    </button>
                  </div>

                  <div className={`rounded-xl p-6 border ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/50'
                      : 'bg-purple-50 border-purple-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">✏️</span>
                      <div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Marks</div>
                        <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{marks.length}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setInitialExamId(undefined);
                        setInitialStudentId(undefined);
                        setShowMarkModal(true);
                      }}
                      disabled={students.length === 0 || exams.length === 0}
                      className="w-full mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ➕ Add Mark
                    </button>
                  </div>
                </div>

                {/* Quick Actions Grid */}
                <div className={`rounded-xl p-6 border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-300'
                }`}>
                  <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      onClick={() => setActiveView('students')}
                      className={`p-4 rounded-lg border transition-all ${
                        theme === 'dark'
                          ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                          : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                      } flex flex-col items-center gap-2`}
                    >
                      <span className="text-2xl">👥</span>
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        View Students
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setActiveView('exams')}
                      className={`p-4 rounded-lg border transition-all ${
                        theme === 'dark'
                          ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                          : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                      } flex flex-col items-center gap-2`}
                    >
                      <span className="text-2xl">📝</span>
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Manage Exams
                      </span>
                    </button>
                    
                    <button
                      onClick={handleExportCSV}
                      disabled={exportingCSV}
                      className={`p-4 rounded-lg border transition-all ${
                        theme === 'dark'
                          ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                          : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                      } flex flex-col items-center gap-2 disabled:opacity-50`}
                    >
                      <span className="text-2xl">📊</span>
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {exportingCSV ? 'Exporting...' : 'Export CSV'}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setActiveView('marks')}
                      className={`p-4 rounded-lg border transition-all ${
                        theme === 'dark'
                          ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                          : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                      } flex flex-col items-center gap-2`}
                    >
                      <span className="text-2xl">✏️</span>
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Add Marks
                      </span>
                    </button>
                  </div>
                </div>

                {/* Recent Activity or Empty State */}
                {students.length === 0 ? (
                  <div className={`rounded-xl p-12 text-center border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-300'
                  }`}>
                    <div className="text-6xl mb-4">🎓</div>
                    <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                      Get Started
                    </h3>
                    <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Import students to begin managing your course
                    </p>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium"
                    >
                      📥 Import Students Now
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Exams View */}
            {activeView === 'exams' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                      Exams Management
                    </h1>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Configure and manage {exams.length} exam(s)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowExamModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all font-medium flex items-center gap-2"
                  >
                    ➕ Add New Exam
                  </button>
                </div>

                {exams.length === 0 ? (
                  <div className={`rounded-xl p-12 text-center border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-300'
                  }`}>
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                      No Exams Yet
                    </h3>
                    <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Create your first exam to start tracking student performance
                    </p>
                    <button
                      onClick={() => setShowExamModal(true)}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all font-medium"
                    >
                      ➕ Create First Exam
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exams.map(exam => (
                      <div key={exam._id} className={`rounded-lg border transition-all ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-300'
                      }`}>
                        {/* Exam Header - Always Visible */}
                        <div className="p-4 flex items-center justify-between">
                          <button
                            onClick={() => setExpandedExam(expandedExam === exam._id ? null : exam._id)}
                            className="flex-1 flex items-center gap-3 text-left"
                          >
                            <span className="text-xl">
                              {expandedExam === exam._id ? '▼' : '▶'}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className={`font-medium text-lg ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                                  {exam.displayName}
                                </div>
                                {exam.isRequired && (
                                  <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-300 text-xs rounded font-medium">
                                    Required
                                  </span>
                                )}
                                {exam.examCategory && (
                                  <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                    exam.examCategory === 'Quiz' ? 'bg-amber-900/30 text-amber-300' :
                                    exam.examCategory === 'Assignment' ? 'bg-blue-900/30 text-blue-300' :
                                    'bg-gray-700 text-gray-300'
                                  }`}>
                                    {exam.examCategory}
                                  </span>
                                )}
                              </div>
                              <div className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {exam.totalMarks} marks • {exam.weightage || 'See Settings'}% weight
                                {exam.scalingEnabled && <span className="text-emerald-400"> • Scaling On</span>}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setShowExamSettings(exam._id);
                                setExamSettings({
                                  displayName: exam.displayName,
                                  weightage: exam.weightage.toString(),
                                  totalMarks: exam.totalMarks.toString(),
                                  numberOfCOs: exam.numberOfCOs?.toString() || '',
                                  numberOfQuestions: exam.numberOfQuestions?.toString() || '',
                                  examCategory: exam.examCategory || '',
                                });
                              }}
                              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-all"
                            >
                              ⚙️
                            </button>
                            {!exam.isRequired && (
                              <button
                                onClick={() => handleDeleteExam(exam._id)}
                                className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs rounded-lg transition-all"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Content */}
                        {expandedExam === exam._id && (
                          <div className={`px-4 pb-4 border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                            {/* Scaling Toggle */}
                            <div className="mb-4 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={exam.scalingEnabled}
                        onChange={() => handleToggleScaling(exam._id, exam.scalingEnabled)}
                        className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                      />
                      <span className="text-gray-300">Enable Scaling</span>
                    </label>
                    
                    {/* Scaling Target Input */}
                    {exam.scalingEnabled && (
                      <div className="flex items-center gap-3 ml-6">
                        <label className="text-sm text-gray-400">Scaled to:</label>
                        <input
                          type="number"
                          min="0"
                          max={exam.totalMarks}
                          step="0.01"
                          value={
                            scalingTargets[exam._id] !== undefined 
                              ? scalingTargets[exam._id] 
                              : (exam.scalingTarget !== undefined && exam.scalingTarget !== null ? exam.scalingTarget : exam.totalMarks)
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            setScalingTargets(prev => ({
                              ...prev,
                              [exam._id]: value
                            }));
                          }}
                          onBlur={() => {
                            // Validate on blur - if empty or invalid, prompt user
                            const value = scalingTargets[exam._id];
                            if (value === undefined || value === '' || value === null) {
                              alert('Please enter a scaling target value');
                              const currentTarget = exam.scalingTarget !== undefined && exam.scalingTarget !== null ? exam.scalingTarget : exam.totalMarks;
                              setScalingTargets(prev => ({
                                ...prev,
                                [exam._id]: currentTarget.toString()
                              }));
                            }
                          }}
                          className="w-24 px-3 py-1.5 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 text-sm"
                          placeholder={exam.totalMarks.toString()}
                        />
                        <button
                          onClick={() => {
                            const value = scalingTargets[exam._id];
                            const currentTarget = exam.scalingTarget !== undefined && exam.scalingTarget !== null ? exam.scalingTarget : exam.totalMarks;
                            const target = value !== undefined ? parseFloat(value) : currentTarget;
                            handleUpdateScalingTarget(exam._id, target);
                          }}
                          disabled={
                            !scalingTargets[exam._id] || 
                            scalingTargets[exam._id] === '' ||
                            parseFloat(scalingTargets[exam._id]) === (exam.scalingTarget !== undefined && exam.scalingTarget !== null ? exam.scalingTarget : exam.totalMarks)
                          }
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-all shadow-lg flex items-center gap-1"
                          title="Apply scaling target and recalculate"
                        >
                          ✓ Apply
                        </button>
                        <span className="text-xs text-gray-500">
                          (Max: {exam.totalMarks})
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Scaling Methods - Only show if scaling is enabled */}
                  {exam.scalingEnabled && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleApplyScaling(exam._id, 'bellCurve')}
                        className="px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-amber-600 text-white text-xs rounded-lg hover:from-yellow-700 hover:to-amber-700 transition-all shadow-lg"
                      >
                        🎯 Bell Curve
                      </button>
                      <button
                        onClick={() => handleApplyScaling(exam._id, 'linearNormalization')}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
                      >
                        📏 Linear
                      </button>
                      <button
                        onClick={() => handleApplyScaling(exam._id, 'minMaxNormalization')}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
                      >
                        ⚖️ Min-Max
                      </button>
                      <button
                        onClick={() => handleApplyScaling(exam._id, 'percentile')}
                        className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-pink-700 text-white text-xs rounded-lg hover:from-pink-700 hover:to-pink-800 transition-all shadow-lg"
                      >
                        📊 Percentile
                      </button>
                              <button
                                onClick={() => handleApplyRounding(exam._id)}
                                className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-xs rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
                              >
                                🔢 Round
                              </button>
                            </div>
                          )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Students View */}
            {activeView === 'students' && students.length > 0 && (
              <div className="space-y-6">
                <div>
                  <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                    Students & Marks
                  </h1>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Managing {students.length} student(s)
                  </p>
                </div>
                <div className={`rounded-xl shadow-2xl p-6 border transition-colors ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700/50'
                    : 'bg-white border-gray-300'
                }`}>
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-300'}`}>
                <thead className={theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-0 z-20 ${theme === 'dark' ? 'text-gray-300 bg-gray-900 border-r border-gray-700/50' : 'text-gray-800 bg-gray-100 border-r border-gray-300'}`}>ID</th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-[100px] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)] ${theme === 'dark' ? 'text-gray-300 bg-gray-900 border-r border-gray-700/50' : 'text-gray-800 bg-gray-100 border-r border-gray-300'}`}>Name</th>
                    {exams.map(exam => (
                      <th key={exam._id} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                        <div>{exam.displayName}</div>
                        <div className={`text-[10px] font-normal mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-700'}`}>Raw / Scaled / Rounded</div>
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
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700/50' : 'divide-gray-300/50'}`}>
                  {students.map((student, idx) => (
                    <tr key={student._id} className={`transition-colors ${
                      theme === 'dark'
                        ? `hover:bg-gray-700/30 ${idx % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-900/20'}`
                        : `hover:bg-gray-100 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`
                    }`}>
                      <td className={`px-4 py-3 text-sm font-medium text-blue-400 sticky left-0 z-10 ${theme === 'dark' ? 'border-r border-gray-700/50' : 'border-r border-gray-300'} ${idx % 2 === 0 ? (theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50') : (theme === 'dark' ? 'bg-gray-900' : 'bg-white')}`}>{student.studentId}</td>
                      <td className={`px-4 py-3 text-sm sticky left-[100px] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)] ${theme === 'dark' ? 'text-gray-200 border-r border-gray-700/50' : 'text-gray-800 border-r border-gray-300'} ${idx % 2 === 0 ? (theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50') : (theme === 'dark' ? 'bg-gray-900' : 'bg-white')}`}>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowStudentDetail(true);
                          }}
                          className="hover:text-blue-400 hover:underline transition-colors cursor-pointer text-left"
                        >
                          {student.name}
                        </button>
                      </td>
                      {exams.map(exam => {
                        const mark = getMark(student._id, exam._id);
                        return (
                          <td key={exam._id} className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                {mark ? (
                                  exam.scalingEnabled ? (
                                    // Scaling is enabled - show Raw/Scaled/Rounded with labels
                                    <div className="flex flex-col gap-1">
                                      <span className={`px-2 py-1 rounded font-medium text-xs ${
                                        theme === 'dark'
                                          ? 'bg-blue-900/30 text-blue-300'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        Raw: {mark.rawMark}
                                      </span>
                                      {mark.scaledMark !== undefined && mark.scaledMark !== null ? (
                                        <span className={`px-2 py-1 rounded font-medium text-xs ${
                                          theme === 'dark'
                                            ? 'bg-emerald-900/30 text-emerald-300'
                                            : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                          Scaled: {mark.scaledMark}
                                        </span>
                                      ) : (
                                        <span className={`text-xs italic ${theme === 'dark' ? 'text-gray-600' : 'text-gray-700'}`}>Not scaled</span>
                                      )}
                                      {mark.roundedMark !== undefined && mark.roundedMark !== null ? (
                                        <span className={`px-2 py-1 rounded font-medium text-xs ${
                                          theme === 'dark'
                                            ? 'bg-purple-900/30 text-purple-300'
                                            : 'bg-purple-100 text-purple-700'
                                        }`}>
                                          Rounded: {mark.roundedMark}
                                        </span>
                                      ) : mark.scaledMark !== undefined && mark.scaledMark !== null ? (
                                        <span className={`text-xs italic ${theme === 'dark' ? 'text-gray-600' : 'text-gray-700'}`}>Not rounded</span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    // Scaling is not enabled - show only the raw mark without label
                                    <span className={`px-2 py-1 rounded font-medium text-xs ${
                                      theme === 'dark'
                                        ? 'bg-blue-900/30 text-blue-300'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {mark.rawMark}
                                    </span>
                                  )
                                ) : (
                                  <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>0</span>
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
                              // Average mode: show calculated average and rounded value
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
                              // Best mode: show the best mark
                              const exam = exams.find(e => e._id === aggMark.examId);
                              if (!exam) return <span className="text-gray-600">0</span>;
                              
                              // Use scaled mark if available and scaling is enabled, otherwise raw mark
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
                              // Average mode: show calculated average and rounded value
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
                              // Best mode: show the best mark
                              const exam = exams.find(e => e._id === aggMark.examId);
                              if (!exam) return <span className="text-gray-600">0</span>;
                              
                              // Use scaled mark if available and scaling is enabled, otherwise raw mark
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
                                onClick={() => {
                                  setSelectedStudentForGrade(student);
                                  setShowGradeBreakdown(true);
                                }}
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
                        <button
                          onClick={() => {
                            setInitialExamId(undefined);
                            setInitialStudentId(student._id);
                            setShowMarkModal(true);
                          }}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs rounded-lg transition-all"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Marks View - Shows same table focused on marks management */}
            {activeView === 'marks' && students.length > 0 && exams.length > 0 && (
              <div className="space-y-6">
                <div>
                  <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                    Marks Management
                  </h1>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Add and manage marks for {students.length} student(s) across {exams.length} exam(s). Click on each mark to add or edit.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setInitialExamId(undefined);
                      setInitialStudentId(undefined);
                      setShowMarkModal(true);
                    }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all font-medium flex items-center gap-2"
                  >
                    ✏️ Add Mark
                  </button>
                </div>
                <div className={`rounded-xl p-6 border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-300'
                }`}>
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-300'}`}>
                      <thead className={theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>Student</th>
                          {exams.map(exam => (
                            <th key={exam._id} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                              {exam.displayName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700/50' : 'divide-gray-300/50'}`}>
                        {students.map((student, idx) => (
                          <tr key={student._id} className={`transition-colors ${
                            theme === 'dark'
                              ? `hover:bg-gray-700/30 ${idx % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-900/20'}`
                              : `hover:bg-gray-100 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`
                          }`}>
                            <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                              {student.name}
                            </td>
                            {exams.map(exam => {
                              const mark = getMark(student._id, exam._id);
                              return (
                                <td key={exam._id} className={`px-4 py-3 text-sm`}>
                                  <button
                                    onClick={() => {
                                      setInitialExamId(exam._id);
                                      setInitialStudentId(student._id);
                                      setShowMarkModal(true);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                                      mark
                                        ? theme === 'dark'
                                          ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        : theme === 'dark'
                                        ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {mark ? mark.rawMark : '+ Add'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Empty States */}
            {activeView === 'students' && students.length === 0 && (
              <div className={`rounded-xl p-12 text-center border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-300'
              }`}>
                <div className="text-6xl mb-4">👨‍🎓</div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                  No Students Yet
                </h3>
                <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Import students using CSV to get started
                </p>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium"
                >
                  📥 Import Students
                </button>
              </div>
            )}
          </div> {/* Close max-w-7xl */}
        </main>
      </div> {/* Close flex container */}
    </div> {/* Close min-h-screen */}

    {/* Modals - Rendered as siblings for proper z-index */}
    <div>
      {/* Import Students Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">Import Students</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <label className="block text-sm font-medium text-gray-300 mb-2">
              Paste CSV (Format: StudentID, StudentName)
            </label>
            <textarea
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              className="w-full h-32 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500 mb-4"
              placeholder="e.g.&#10;S001, John Doe&#10;S002, Jane Smith"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setError('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleImportStudents}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exam Modal */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">Add Exam</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAddExam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exam Name</label>
                <input
                  type="text"
                  required
                  value={examFormData.displayName}
                  onChange={(e) => setExamFormData({ ...examFormData, displayName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., Quiz 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exam Category</label>
                <select
                  required
                  value={examFormData.examCategory}
                  onChange={(e) => setExamFormData({ ...examFormData, examCategory: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                >
                  <option value="">Select category...</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Project">Project</option>
                  <option value="Attendance">Attendance</option>
                  <option value="MainExam">Main Exam</option>
                  <option value="ClassPerformance">Class Performance</option>
                  <option value="Others">Others</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Quiz & Assignment types will be aggregated based on course settings</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Total Marks</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={examFormData.totalMarks}
                  onChange={(e) => setExamFormData({ ...examFormData, totalMarks: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., 100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Weightage (%)
                  {(examFormData.examCategory === 'Quiz' || examFormData.examCategory === 'Assignment') && (
                    <span className="ml-2 text-xs text-amber-400">(Not used for Quiz/Assignment)</span>
                  )}
                </label>
                <input
                  type="number"
                  required={examFormData.examCategory !== 'Quiz' && examFormData.examCategory !== 'Assignment'}
                  min="0"
                  max="100"
                  step="0.01"
                  value={examFormData.weightage}
                  onChange={(e) => setExamFormData({ ...examFormData, weightage: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., 20"
                  disabled={examFormData.examCategory === 'Quiz' || examFormData.examCategory === 'Assignment'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(examFormData.examCategory === 'Quiz' || examFormData.examCategory === 'Assignment') 
                    ? 'Weightage is set at course level for aggregated Quiz/Assignment columns'
                    : 'Percentage contribution to final grade'}
                </p>
              </div>

              {course?.courseType === 'Theory' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Number of COs (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={examFormData.numberOfCOs}
                    onChange={(e) => setExamFormData({ ...examFormData, numberOfCOs: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                    placeholder="e.g., 3"
                  />
                  <p className="text-xs text-gray-500 mt-1">For exams with CO-wise marks breakdown</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Number of Questions (Optional)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={examFormData.numberOfQuestions}
                  onChange={(e) => setExamFormData({ ...examFormData, numberOfQuestions: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., 5 (leave blank if not needed)"
                />
                <p className="text-xs text-gray-500 mt-1">For question-wise marks breakdown (usually for MainExam category)</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowExamModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg font-medium"
                >
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Mark Modal - New Component */}
      <AddMarkModal
        isOpen={showMarkModal}
        onClose={() => {
          setShowMarkModal(false);
          setInitialExamId(undefined);
          setInitialStudentId(undefined);
        }}
        students={students}
        exams={exams}
        marks={marks}
        courseId={courseId}
        onMarkSaved={fetchCourseData}
        initialExamId={initialExamId}
        initialStudentId={initialStudentId}
      />

      {/* Exam Settings Modal */}
      {showExamSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">Exam Settings</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                <input
                  type="text"
                  value={examSettings.displayName}
                  onChange={(e) => setExamSettings({ ...examSettings, displayName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="Exam name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exam Category</label>
                <select
                  required
                  value={examSettings.examCategory}
                  onChange={(e) => setExamSettings({ ...examSettings, examCategory: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                >
                  {!examSettings.examCategory && <option value="">Select category...</option>}
                  <option value="Quiz">Quiz</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Project">Project</option>
                  <option value="Attendance">Attendance</option>
                  <option value="MainExam">Main Exam</option>
                  <option value="ClassPerformance">Class Performance</option>
                  <option value="Others">Others</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Quiz & Assignment types will be aggregated</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Total Marks</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={examSettings.totalMarks}
                  onChange={(e) => setExamSettings({ ...examSettings, totalMarks: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., 100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Weightage (%)
                  {(examSettings.examCategory === 'Quiz' || examSettings.examCategory === 'Assignment') && (
                    <span className="ml-2 text-xs text-amber-400">(Set in Course Settings)</span>
                  )}
                </label>
                {(examSettings.examCategory === 'Quiz' || examSettings.examCategory === 'Assignment') ? (
                  <div className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed">
                    Not applicable - weightage set at course level
                  </div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={examSettings.weightage}
                    onChange={(e) => setExamSettings({ ...examSettings, weightage: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                    placeholder="e.g., 30"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {(examSettings.examCategory === 'Quiz' || examSettings.examCategory === 'Assignment') 
                    ? '💡 Use Course Settings button to configure Quiz/Assignment aggregation weightage'
                    : 'Percentage contribution to final grade'}
                </p>
              </div>

              {course?.courseType === 'Theory' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Number of COs</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={examSettings.numberOfCOs}
                    onChange={(e) => setExamSettings({ ...examSettings, numberOfCOs: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                    placeholder="e.g., 3"
                  />
                  <p className="text-xs text-gray-500 mt-1">For CO-wise marks breakdown</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Number of Questions</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={examSettings.numberOfQuestions}
                  onChange={(e) => setExamSettings({ ...examSettings, numberOfQuestions: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., 5 (leave blank if not needed)"
                />
                <p className="text-xs text-gray-500 mt-1">For question-wise marks breakdown (usually for MainExam category)</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowExamSettings(null);
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateExamSettings}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Settings Modal */}
      {showCourseSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]">
          <div className="h-full w-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
            {/* Header */}
            <div className="border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-md">
              <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
                  <span className="text-3xl">⚙️</span>
                  <span>Course Settings</span>
                </h2>
                <button
                  onClick={() => {
                    setShowCourseSettings(false);
                    setError('');
                    setCourseSettingsTab('aggregation');
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all font-medium"
                >
                  ✕ Close
                </button>
              </div>
              
              {/* Tabs */}
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex gap-2 -mb-px">
                  <button
                    type="button"
                    onClick={() => setCourseSettingsTab('aggregation')}
                    className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
                      courseSettingsTab === 'aggregation'
                        ? 'border-blue-500 text-blue-400 bg-gray-800/50'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
                    }`}
                  >
                    📊 Quiz & Assignment Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseSettingsTab('grading')}
                    className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
                      courseSettingsTab === 'grading'
                        ? 'border-purple-500 text-purple-400 bg-gray-800/50'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
                    }`}
                  >
                    🏆 Grading Scale
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8 h-[calc(100vh-180px)] overflow-y-auto">
              {error && (
                <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveCourseSettings} className="space-y-6">
                {/* Quiz & Assignment Settings Tab */}
                {courseSettingsTab === 'aggregation' && (
                  <div className="space-y-6">
                    {/* Quiz Settings */}
                    <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <h3 className="text-xl font-semibold text-gray-100 mb-6 flex items-center gap-2">
                        📝 Quiz Aggregation
                      </h3>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Aggregation Method</label>
                          <select
                            value={courseSettingsData.quizAggregation}
                            onChange={(e) => setCourseSettingsData({ ...courseSettingsData, quizAggregation: e.target.value as 'average' | 'best' })}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                          >
                            <option value="average">Average of all quizzes</option>
                            <option value="best">Best quiz score</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">How to calculate the aggregated Quiz column</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Quiz Weightage (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={courseSettingsData.quizWeightage}
                            onChange={(e) => setCourseSettingsData({ ...courseSettingsData, quizWeightage: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                            placeholder="e.g., 20"
                          />
                          <p className="text-xs text-gray-500 mt-1">Weightage for the aggregated Quiz column in final grade</p>
                        </div>
                      </div>
                    </div>

                    {/* Assignment Settings */}
                    <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <h3 className="text-xl font-semibold text-gray-100 mb-6 flex items-center gap-2">
                        📋 Assignment Aggregation
                      </h3>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Aggregation Method</label>
                          <select
                            value={courseSettingsData.assignmentAggregation}
                            onChange={(e) => setCourseSettingsData({ ...courseSettingsData, assignmentAggregation: e.target.value as 'average' | 'best' })}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                          >
                            <option value="average">Average of all assignments</option>
                            <option value="best">Best assignment score</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">How to calculate the aggregated Assignment column</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Assignment Weightage (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={courseSettingsData.assignmentWeightage}
                            onChange={(e) => setCourseSettingsData({ ...courseSettingsData, assignmentWeightage: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                            placeholder="e.g., 15"
                          />
                          <p className="text-xs text-gray-500 mt-1">Weightage for the aggregated Assignment column in final grade</p>
                        </div>
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                      <p className="text-sm text-blue-300">
                        💡 <strong>Note:</strong> Individual Quiz/Assignment exams don't need weightages. 
                        The aggregated column will use the weightage you set here.
                      </p>
                    </div>
                  </div>
                )}

                {/* Grading Scale Tab */}
                {courseSettingsTab === 'grading' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-semibold text-gray-100 flex items-center gap-3">
                        <span className="text-3xl">📊</span>
                        <span>Grading Scale Management</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setCourseSettingsData({ ...courseSettingsData, gradingScale: DEFAULT_GRADING_SCALE });
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg flex items-center gap-2"
                      >
                        🔄 Reset to Default
                      </button>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 px-3 text-gray-300 font-semibold">Grade</th>
                          <th className="text-left py-2 px-3 text-gray-300 font-semibold">Minimum %</th>
                          <th className="text-left py-2 px-3 text-gray-300 font-semibold">Range Preview</th>
                          <th className="text-right py-2 px-3 text-gray-300 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseSettingsData.gradingScale
                          .sort((a, b) => b.threshold - a.threshold)
                          .map((grade, index) => {
                            const nextGrade = courseSettingsData.gradingScale
                              .sort((a, b) => b.threshold - a.threshold)[index + 1];
                            const upperBound = nextGrade ? nextGrade.threshold - 0.01 : 100;
                            
                            return (
                              <tr key={index} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                <td className="py-2 px-3">
                                  <span className={`inline-block px-2 py-1 rounded font-semibold text-sm ${getGradeBgColor(grade.letter)} ${getGradeColor(grade.letter)}`}>
                                    {getGradeDisplay(grade.letter, grade.modifier)}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={grade.threshold}
                                    onChange={(e) => {
                                      const newThreshold = parseFloat(e.target.value);
                                      if (!isNaN(newThreshold)) {
                                        const updated = [...courseSettingsData.gradingScale];
                                        updated[courseSettingsData.gradingScale.indexOf(grade)] = {
                                          ...grade,
                                          threshold: newThreshold
                                        };
                                        setCourseSettingsData({ ...courseSettingsData, gradingScale: updated });
                                      }
                                    }}
                                    className="w-24 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </td>
                                <td className="py-2 px-3 text-gray-400">
                                  {grade.threshold.toFixed(2)}% - {upperBound.toFixed(2)}%
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = courseSettingsData.gradingScale.filter(g => g !== grade);
                                      setCourseSettingsData({ ...courseSettingsData, gradingScale: updated });
                                    }}
                                    className="px-2 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded text-xs transition-all"
                                  >
                                    🗑️ Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          type="button"
                          onClick={() => {
                            const newGrade: GradeThreshold = {
                              threshold: 0,
                              letter: 'F',
                              modifier: '0'
                            };
                            setCourseSettingsData({ 
                              ...courseSettingsData, 
                              gradingScale: [...courseSettingsData.gradingScale, newGrade].sort((a, b) => a.threshold - b.threshold)
                            });
                          }}
                          className="px-4 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 rounded-lg font-medium transition-all flex items-center gap-2"
                        >
                          ➕ Add Grade Threshold
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                      <p className="text-sm text-amber-300">
                        ⚠️ <strong>Important:</strong> Grade thresholds define the minimum percentage needed for each letter grade. 
                        Ensure there are no overlaps or gaps between grades. The system validates automatically when you save.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons - Fixed at bottom */}
                <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-700/50 px-6 py-4 -mx-6 -mb-8 mt-8">
                  <div className="flex gap-4 max-w-7xl mx-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCourseSettings(false);
                        setError('');
                        setCourseSettingsTab('aggregation');
                      }}
                      className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg font-medium"
                    >
                      💾 Save All Settings
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      <StudentDetailModal
        isOpen={showStudentDetail}
        onClose={() => {
          setShowStudentDetail(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        exams={exams}
        marks={marks}
        course={course!}
      />

      {/* Grade Breakdown Modal */}
      {showGradeBreakdown && selectedStudentForGrade && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-700/50 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-100">Final Grade Breakdown</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedStudentForGrade.name} ({selectedStudentForGrade.studentId})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGradeBreakdown(false);
                  setSelectedStudentForGrade(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
              >
                ✕ Close
              </button>
            </div>

            {(() => {
              const gradeData = calculateFinalGrade(selectedStudentForGrade._id);
              
              if (gradeData.breakdown.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-400">
                    No marks available for final grade calculation
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Breakdown Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-900/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Exam / Assessment
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Mark Obtained
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Percentage
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Weightage
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Contribution
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {gradeData.breakdown.map((item, idx) => {
                          const percentage = (item.mark / item.totalMarks) * 100;
                          return (
                            <tr key={idx} className={`${idx % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-900/20'} ${item.isAggregated ? 'bg-amber-900/10' : ''}`}>
                              <td className="px-4 py-3 text-sm text-gray-200">
                                <div className="flex items-center gap-2">
                                  {item.isAggregated && <span className="text-xs">📊</span>}
                                  <span className={item.isAggregated ? 'font-semibold' : ''}>
                                    {item.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="px-2 py-1 rounded font-medium text-xs bg-blue-900/30 text-blue-300">
                                  {item.mark.toFixed(2)} / {item.totalMarks}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="px-2 py-1 rounded font-medium text-xs bg-purple-900/30 text-purple-300">
                                  {percentage.toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="px-2 py-1 rounded font-medium text-xs bg-cyan-900/30 text-cyan-300">
                                  {item.weightage}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="px-2 py-1 rounded font-medium text-xs bg-green-900/30 text-green-300">
                                  {item.contribution.toFixed(2)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-900/70">
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-right text-sm font-semibold text-gray-100">
                            Final Grade (Estimated):
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className="px-3 py-2 rounded-lg font-bold text-lg bg-gradient-to-r from-green-900/50 to-emerald-900/50 text-green-200 border border-green-500/30">
                              {gradeData.total.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                    <p className="text-sm text-blue-300">
                      <strong>💡 Calculation Formula:</strong> For each exam/assessment, contribution = (Mark/TotalMarks × 100) × Weightage ÷ 100
                    </p>
                    <p className="text-xs text-blue-400 mt-2">
                      • Aggregated columns (Quiz/Assignment) use their configured weightage from Course Settings
                    </p>
                    <p className="text-xs text-blue-400">
                      • When scaling is enabled, scaled marks are used in calculations
                    </p>
                    <p className="text-xs text-blue-400">
                      • Final grade is the sum of all contributions
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Import Course Modal */}
      {showImportCourseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">📥 Import Course Data</h2>
            
            <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <p className="text-sm text-amber-300 mb-2">
                <strong>⚠️ Warning:</strong> This will replace all current data in this course!
              </p>
              <p className="text-xs text-amber-400">
                • All students, exams, and marks will be replaced
                <br />
                • Course settings will be updated
                <br />
                • This action cannot be undone
                <br />
                • Make sure to export current data first if needed
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Course Backup File (.json)
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportCourseFile(file);
                  }
                }}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
              {importCourseFile && (
                <p className="mt-2 text-sm text-green-400">
                  ✓ Selected: {importCourseFile.name}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImportCourseModal(false);
                  setImportCourseFile(null);
                  setError('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCourse}
                disabled={!importCourseFile || importingCourse}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importingCourse ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  'Import Data'
                )}
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <p className="text-xs text-blue-300">
                <strong>💡 Tip:</strong> Only import files that were exported from this system to ensure compatibility.
              </p>
            </div>
          </div>
        </div>
      )}
    </div> {/* Close modals wrapper */}

    {/* Student Stats Modal */}
    {showStudentStatsModal && selectedStudentForStats && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl shadow-2xl max-w-5xl w-full border border-gray-700/50 p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl">
                👨‍🎓
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-100">{selectedStudentForStats.name}</h2>
                <p className="text-sm text-gray-400 mt-1">Student ID: {selectedStudentForStats.studentId}</p>
                <p className="text-sm text-emerald-400 mt-1">
                  {getStudentMarks(selectedStudentForStats._id).length} / {exams.length} exams completed
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowStudentStatsModal(false);
                setSelectedStudentForStats(null);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all font-medium text-sm"
            >
              Close
            </button>
          </div>

          {/* Exams Grid */}
          {exams.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-400">No exams configured for this course yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map((exam) => {
                const mark = marks.find(m => m.studentId === selectedStudentForStats._id && m.examId === exam._id);
                const stats = getClassStatsForExam(exam._id);
                
                return (
                  <div
                    key={exam._id}
                    className={`p-4 rounded-lg border transition-all ${
                      mark 
                        ? 'border-blue-700/50 bg-gradient-to-br from-blue-900/20 to-purple-900/20 hover:border-blue-500/70' 
                        : 'border-gray-700/50 bg-gray-900/30 hover:border-gray-600'
                    }`}
                  >
                    {/* Exam Header */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-100 text-lg flex items-center gap-2">
                          {exam.displayName}
                        </h4>
                        {exam.examCategory && (
                          <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 flex-shrink-0">
                            {exam.examCategory}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>📝 Total: {exam.totalMarks} marks</span>
                          {exam.scalingTarget && exam.scalingEnabled && (
                            <span className="text-emerald-400">• Scaled to: {exam.scalingTarget}</span>
                          )}
                        </div>
                        <div>⚖️ Weightage: {exam.weightage}%</div>
                      </div>
                    </div>

                    {mark ? (
                      <>
                        {/* Marks Display */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="p-3 rounded-lg bg-blue-900/40 border border-blue-700/50 text-center">
                            <div className="text-xs text-gray-400 mb-1">Raw</div>
                            <div className="text-lg font-bold text-blue-300">
                              {mark.rawMark}
                            </div>
                            <div className="text-xs text-gray-500">/{exam.totalMarks}</div>
                          </div>

                          {exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null ? (
                            <div className="p-3 rounded-lg bg-emerald-900/40 border border-emerald-700/50 text-center">
                              <div className="text-xs text-gray-400 mb-1">Scaled</div>
                              <div className="text-lg font-bold text-emerald-300">
                                {mark.scaledMark.toFixed(2)}
                              </div>
                              {exam.scalingTarget && (
                                <div className="text-xs text-gray-500">/{exam.scalingTarget}</div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-gray-700/30 border border-gray-600/50 text-center">
                              <div className="text-xs text-gray-400 mb-1">Scaled</div>
                              <div className="text-xs text-gray-500 italic">Not scaled</div>
                            </div>
                          )}

                          {exam.scalingEnabled && mark.roundedMark !== undefined && mark.roundedMark !== null ? (
                            <div className="p-3 rounded-lg bg-purple-900/40 border border-purple-700/50 text-center">
                              <div className="text-xs text-gray-400 mb-1">Final</div>
                              <div className="text-lg font-bold text-purple-300">
                                {mark.roundedMark}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-gray-700/30 border border-gray-600/50 text-center">
                              <div className="text-xs text-gray-400 mb-1">Final</div>
                              <div className="text-xs text-gray-500 italic">N/A</div>
                            </div>
                          )}
                        </div>

                        {/* Performance Visualization */}
                        {stats && stats.count > 0 && (() => {
                          const studentMark = exam.scalingEnabled && mark.scaledMark !== undefined && mark.scaledMark !== null
                            ? mark.scaledMark
                            : mark.rawMark;
                          const avgPercent = (stats.average / stats.highest) * 100;
                          const studentPercent = (studentMark / stats.highest) * 100;

                          return (
                            <div className="p-3 rounded-lg bg-indigo-900/20 border border-indigo-700/50">
                              <div className="text-xs font-medium text-gray-300 mb-3 flex items-center gap-2">
                                <span>📊</span>
                                <span>Class Performance</span>
                                <span className="ml-auto text-gray-500">({stats.count} students)</span>
                              </div>
                              
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
                                    <span>This</span>
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
                                    ? 'bg-green-900/40 text-green-300 border border-green-700/50' 
                                    : 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50'
                                }`}>
                                  {studentMark >= stats.average ? '🎯 Above Average' : '📈 Below Average'}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500 italic">
                        <div className="text-3xl mb-2">📝</div>
                        <div className="text-sm">Marks not recorded yet</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Final Grade Summary */}
          {course.showFinalGrade && getStudentMarks(selectedStudentForStats._id).length > 0 && (() => {
            const gradeData = calculateFinalGrade(selectedStudentForStats._id);
            const totalWeightage = calculateTotalWeightage();
            const studentMarksCount = getStudentMarks(selectedStudentForStats._id).length;
            
            return (
              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50">
                <h4 className="text-lg font-semibold text-gray-100 mb-3">📈 Final Grade</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <div>
                    <div className="text-xs text-gray-400">Exams Taken</div>
                    <div className="text-xl font-bold text-blue-300">
                      {studentMarksCount} / {exams.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Total Weightage</div>
                    <div className="text-xl font-bold text-emerald-300">
                      {totalWeightage}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Points Earned</div>
                    <div className="text-xl font-bold text-purple-300">
                      {gradeData.total.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Current Grade</div>
                    <div className="text-2xl font-bold text-cyan-300">
                      {totalWeightage > 0 
                        ? `${((gradeData.total / totalWeightage) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Letter Grade</div>
                    <div className="text-2xl font-bold">
                      {totalWeightage > 0 ? (() => {
                        const percentage = (gradeData.total / totalWeightage) * 100;
                        const letterGrade = calculateLetterGrade(percentage, course.gradingScale);
                        return (
                          <span className={`${getGradeColor(letterGrade.letter)}`}>
                            {getGradeDisplay(letterGrade.letter, letterGrade.modifier)}
                          </span>
                        );
                      })() : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Breakdown Details */}
                {gradeData.breakdown.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-sm font-medium text-gray-300 mb-3">Grade Breakdown</div>
                    <div className="space-y-2">
                      {gradeData.breakdown.map((item: any, idx: number) => (
                        <div key={idx} className={`flex items-center justify-between text-xs p-2 rounded ${
                          item.isAggregated ? 'bg-amber-900/20 border border-amber-700/30' : 'bg-gray-800/50'
                        }`}>
                          <div className="flex items-center gap-2">
                            {item.isAggregated && <span>📊</span>}
                            <span className="text-gray-300">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
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
                      <div className="flex items-center justify-between text-sm p-2 bg-green-900/20 border border-green-700/50 rounded font-semibold mt-3">
                        <span className="text-gray-200">Total Contribution:</span>
                        <span className="text-green-300 text-lg">{gradeData.total.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Estimated Grade Calculator */}
          {(() => {
            const estimate = calculateEstimatedGrade(selectedStudentForStats._id);
            if (!estimate) return null;

            return (
              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-700/50">
                <h4 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Grade Estimator</span>
                </h4>
                
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-purple-900/20 rounded-lg">
                    <div className="text-xs text-gray-400">Current Progress</div>
                    <div className="text-lg font-bold text-purple-300">
                      {estimate.completedExams}/{estimate.totalExams}
                    </div>
                    <div className="text-xs text-gray-500">exams</div>
                  </div>
                  <div className="p-3 bg-blue-900/20 rounded-lg">
                    <div className="text-xs text-gray-400">Current Points</div>
                    <div className="text-lg font-bold text-blue-300">
                      {estimate.currentPoints.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">out of {estimate.completedWeightage}%</div>
                  </div>
                  <div className="p-3 bg-amber-900/20 rounded-lg">
                    <div className="text-xs text-gray-400">Remaining Exams</div>
                    <div className="text-lg font-bold text-amber-300">
                      {estimate.remainingExams}
                    </div>
                    <div className="text-xs text-gray-500">exams</div>
                  </div>
                  <div className="p-3 bg-emerald-900/20 rounded-lg">
                    <div className="text-xs text-gray-400">Remaining Weight</div>
                    <div className="text-lg font-bold text-emerald-300">
                      {estimate.remainingWeightage.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">weightage</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-300 mb-3">
                    Average % needed in remaining exams to achieve:
                  </div>
                  {estimate.estimates.map((est: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border ${
                        est.achievable 
                          ? 'bg-gray-800/50 border-gray-700/50' 
                          : 'bg-red-900/20 border-red-700/30 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-bold ${
                            est.grade === 'A' ? 'text-green-400' :
                            est.grade === 'B' ? 'text-blue-400' :
                            est.grade === 'C' ? 'text-yellow-400' :
                            'text-orange-400'
                          }`}>
                            {est.grade}
                          </span>
                          <div>
                            <div className="text-sm text-gray-300">
                              Grade {est.grade} (≥{est.targetPercentage}%)
                            </div>
                            <div className="text-xs text-gray-500">
                              Need {(est.targetPercentage - estimate.currentPoints).toFixed(1)} more points
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            est.achievable ? 'text-cyan-300' : 'text-red-400'
                          }`}>
                            {est.averageNeeded.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {est.achievable ? 'avg needed' : 'not possible'}
                          </div>
                        </div>
                      </div>
                      {!est.achievable && (
                        <div className="mt-2 text-xs text-red-400">
                          ⚠️ Target not achievable with remaining weightage
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-cyan-900/20 border border-cyan-700/50 rounded-lg">
                  <p className="text-xs text-cyan-300">
                    <strong>💡 How to read:</strong> If this student scores the shown percentage (average) in all remaining exams, 
                    they'll achieve that grade. For example, if "Grade B" shows "75%", scoring an average of 75% 
                    in the remaining {estimate.remainingExams} exam(s) will result in a B grade overall.
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    )}
    </>
  );
}

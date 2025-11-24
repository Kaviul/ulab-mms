'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { parseCSV } from '@/app/utils/csv';
import AddMarkModal from '@/app/components/AddMarkModal';
import StudentDetailModal from '@/app/components/StudentDetailModal';
import OverviewView from './components/OverviewView';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Settings, 
  LogOut, 
  ArrowLeft, 
  Plus, 
  Upload, 
  Download, 
  FileUp, 
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  Trash2,
  BookOpen,
  FlaskConical,
  Edit,
  Menu
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
  const [showSetZeroModal, setShowSetZeroModal] = useState(false);
  const [showResetMarksModal, setShowResetMarksModal] = useState(false);
  const [selectedExamsForAction, setSelectedExamsForAction] = useState<string[]>([]);
  const [confirmationStep, setConfirmationStep] = useState(0);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showBulkAddStudentModal, setShowBulkAddStudentModal] = useState(false);
  const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState(0);
  const [newStudentData, setNewStudentData] = useState({ studentId: '', name: '' });
  
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

  const handleAddIndividualStudent = async () => {
    try {
      if (!newStudentData.studentId.trim() || !newStudentData.name.trim()) {
        alert('Please fill in both Student ID and Name');
        return;
      }

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          students: [{
            studentId: newStudentData.studentId.trim(),
            name: newStudentData.name.trim(),
          }],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchCourseData();
        setShowAddStudentModal(false);
        setNewStudentData({ studentId: '', name: '' });
        alert('Student added successfully!');
      } else {
        alert(`Error: ${data.error || 'Failed to add student'}`);
      }
    } catch (err) {
      console.error('Error adding student:', err);
      alert('Error adding student');
    }
  };

  const handleBulkImportStudents = async () => {
    try {
      const parsedStudents = parseCSV(csvInput);
      
      if (parsedStudents.length === 0) {
        alert('No valid student data found');
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
        await fetchCourseData();
        setShowBulkAddStudentModal(false);
        setCsvInput('');
        alert(`Successfully imported ${parsedStudents.length} students!`);
      } else {
        alert(`Error: ${data.error || 'Failed to import students'}`);
      }
    } catch (err) {
      console.error('Error importing students:', err);
      alert('Error importing students');
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;

    try {
      const response = await fetch(`/api/students/${studentToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCourseData();
        setShowDeleteStudentModal(false);
        setStudentToDelete(null);
        setDeleteConfirmationStep(0);
        alert('Student deleted successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'Failed to delete student'}`);
      }
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Error deleting student');
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

  const handleSetEmptyMarksToZero = async (examIds: string[]) => {
    try {
      const marksToCreate = [];
      const targetExams = examIds.length === 0 ? exams : exams.filter(e => examIds.includes(e._id));
      
      for (const student of students) {
        for (const exam of targetExams) {
          const existingMark = marks.find(
            m => m.studentId === student._id && m.examId === exam._id
          );
          
          if (!existingMark) {
            marksToCreate.push({
              studentId: student._id,
              examId: exam._id,
              rawMark: 0,
            });
          }
        }
      }

      if (marksToCreate.length === 0) {
        alert('All students already have marks for selected exams!');
        setShowSetZeroModal(false);
        setConfirmationStep(0);
        return;
      }

      const response = await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: marksToCreate }),
      });

      if (response.ok) {
        await fetchCourseData();
        alert(`Successfully set ${marksToCreate.length} empty marks to 0!`);
        setShowSetZeroModal(false);
        setConfirmationStep(0);
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'Failed to set marks'}`);
      }
    } catch (err) {
      console.error('Error setting empty marks to zero:', err);
      alert('Error setting empty marks to zero');
    }
  };

  const handleResetMarks = async (examIds: string[]) => {
    try {
      const targetExams = examIds.length === 0 ? exams : exams.filter(e => examIds.includes(e._id));
      const examIdsToDelete = targetExams.map(e => e._id);
      
      const marksToDelete = marks.filter(m => examIdsToDelete.includes(m.examId));

      if (marksToDelete.length === 0) {
        alert('No marks found for selected exams!');
        setShowResetMarksModal(false);
        setConfirmationStep(0);
        return;
      }

      const response = await fetch('/api/marks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markIds: marksToDelete.map(m => m._id) }),
      });

      if (response.ok) {
        await fetchCourseData();
        alert(`Successfully deleted ${marksToDelete.length} marks!`);
        setShowResetMarksModal(false);
        setConfirmationStep(0);
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'Failed to delete marks'}`);
      }
    } catch (err) {
      console.error('Error resetting marks:', err);
      alert('Error resetting marks');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading course data...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Course not found</p>
          </CardContent>
        </Card>
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
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
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
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {course?.courseType === 'Theory' ? (
                    <BookOpen className="w-6 h-6 text-primary" />
                  ) : (
                    <FlaskConical className="w-6 h-6 text-primary" />
                  )}
                  {course.name}
                </h1>
                <p className="text-xs mt-1 text-muted-foreground">
                  {course.code} • {course.semester} {course.year} • 
                  <Badge variant="secondary" className="ml-1">
                    {course.courseType}
                  </Badge>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar + Main Content Layout */}
      <div className="flex h-[calc(100vh-72px)]">
        {/* Left Sidebar */}
        <aside className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } transition-all duration-300 border-r bg-card flex flex-col`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full justify-start"
            >
              <Menu className="w-5 h-5" />
              {sidebarOpen && <span className="ml-2 font-medium">Menu</span>}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <Button
              variant={activeView === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('overview')}
              className="w-full justify-start"
            >
              <span className="text-lg">📊</span>
              {sidebarOpen && <span className="ml-2 font-medium">Overview</span>}
            </Button>
            
            <Button
              variant={activeView === 'exams' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('exams')}
              className="w-full justify-start"
            >
              <span className="text-lg">📝</span>
              {sidebarOpen && (
                <div className="flex-1 flex items-center justify-between ml-2">
                  <span className="font-medium">Exams</span>
                  <Badge variant="secondary" className="ml-2">{exams.length}</Badge>
                </div>
              )}
            </Button>
            
            <Button
              variant={activeView === 'students' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('students')}
              className="w-full justify-start"
            >
              <span className="text-lg">👥</span>
              {sidebarOpen && (
                <div className="flex-1 flex items-center justify-between ml-2">
                  <span className="font-medium">Students</span>
                  <Badge variant="secondary" className="ml-2">{students.length}</Badge>
                </div>
              )}
            </Button>
            
            <Button
              variant={activeView === 'marks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('marks')}
              className="w-full justify-start"
            >
              <span className="text-lg">✏️</span>
              {sidebarOpen && <span className="ml-2 font-medium">Marks</span>}
            </Button>

            {sidebarOpen && <div className="pt-4 mt-4 border-t"></div>}

            <Button
              variant="ghost"
              size="sm"
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
              className="w-full justify-start"
            >
              <Settings className="w-5 h-5" />
              {sidebarOpen && <span className="ml-2 font-medium">Settings</span>}
            </Button>
          </nav>

          {/* Student Search */}
          <div className="px-4 py-3 border-t border-b">
            {sidebarOpen ? (
              <form onSubmit={handleStudentSearch} className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Search Student
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={searchStudentId}
                    onChange={(e) => setSearchStudentId(e.target.value)}
                    placeholder="ID or Name"
                    className="flex-1 h-8 text-sm"
                  />
                  <Button type="submit" size="sm" className="h-8 px-3">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="w-full"
                title="Search Student"
              >
                <Search className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Quick Actions */}
          {sidebarOpen && (
            <div className="p-3 border-t space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCourse}
                disabled={!course || exportingJSON}
                className="w-full"
              >
                {exportingJSON ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportCourseModal(true)}
                className="w-full"
              >
                <FileUp className="w-4 h-4 mr-2" />
                Import
              </Button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            {/* Overview View */}
            {activeView === 'overview' && (
              <OverviewView
                course={course!}
                students={students}
                exams={exams}
                marks={marks}
                onImportStudents={() => setShowImportModal(true)}
                onAddExam={() => setShowExamModal(true)}
                onImportCourse={() => setShowImportCourseModal(true)}
                onExportCSV={handleExportCSV}
                exportingCSV={exportingCSV}
              />
            )}

            {/* Exams View */}
            {activeView === 'exams' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">Exams Management</h1>
                    <p className="text-sm mt-1 text-muted-foreground">
                      Configure and manage {exams.length} exam(s)
                    </p>
                  </div>
                  <Button onClick={() => setShowExamModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Exam
                  </Button>
                </div>

                {exams.length === 0 ? (
                  <Card>
                    <CardContent className="pt-12 pb-12 text-center">
                      <div className="text-6xl mb-4">📝</div>
                      <CardTitle className="text-xl mb-2">No Exams Yet</CardTitle>
                      <CardDescription className="mb-6">
                        Create your first exam to start tracking student performance
                      </CardDescription>
                      <Button onClick={() => setShowExamModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Exam
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {exams.map(exam => (
                      <Card key={exam._id}>
                        {/* Exam Header - Always Visible */}
                        <CardHeader className="p-4">
                          <div className="flex items-center justify-between">
                            <Button
                              variant="ghost"
                              onClick={() => setExpandedExam(expandedExam === exam._id ? null : exam._id)}
                              className="flex-1 justify-start p-0 h-auto hover:bg-transparent"
                            >
                              {expandedExam === exam._id ? (
                                <ChevronDown className="w-5 h-5 mr-2" />
                              ) : (
                                <ChevronRight className="w-5 h-5 mr-2" />
                              )}
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CardTitle className="text-lg">{exam.displayName}</CardTitle>
                                  {exam.isRequired && (
                                    <Badge variant="secondary">Required</Badge>
                                  )}
                                  {exam.examCategory && (
                                    <Badge variant="outline">{exam.examCategory}</Badge>
                                  )}
                                </div>
                                <CardDescription className="mt-1">
                                  {exam.totalMarks} marks • {exam.weightage || 'See Settings'}% weight
                                  {exam.scalingEnabled && <span className="text-primary"> • Scaling On</span>}
                                </CardDescription>
                              </div>
                            </Button>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
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
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              {!exam.isRequired && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteExam(exam._id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        {/* Collapsible Content */}
                        {expandedExam === exam._id && (
                          <CardContent className="px-4 pb-4 border-t pt-4">
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
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Students View */}
            {activeView === 'students' && students.length > 0 && (
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
                      onClick={() => setShowAddStudentModal(true)}
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Student
                    </Button>
                    <Button
                      onClick={() => setShowBulkAddStudentModal(true)}
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
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-0 z-20 bg-muted/50 border-r">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-[100px] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)] bg-muted/50 border-r">Name</th>
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
                      <td className={`px-4 py-3 text-sm font-medium text-primary sticky left-0 z-10 border-r ${idx % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>{student.studentId}</td>
                      <td className={`px-4 py-3 text-sm sticky left-[100px] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)] border-r ${idx % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
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
                          <td key={exam._id} className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                {mark ? (
                                  exam.scalingEnabled ? (
                                    // Scaling is enabled - show Raw/Scaled/Rounded with labels
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
                                    // Scaling is not enabled - show only the raw mark without label
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setInitialExamId(undefined);
                              setInitialStudentId(student._id);
                              setShowMarkModal(true);
                            }}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs rounded-lg transition-all"
                            title="Add/Edit Marks"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              setStudentToDelete(student);
                              setDeleteConfirmationStep(0);
                              setShowDeleteStudentModal(true);
                            }}
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
            )}

            {/* Marks View - Shows same table focused on marks management */}
            {activeView === 'marks' && students.length > 0 && exams.length > 0 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Marks Management</h1>
                  <p className="text-sm mt-1 text-muted-foreground">
                    Add and manage marks for {students.length} student(s) across {exams.length} exam(s). Click on each mark to add or edit.
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={() => {
                      setInitialExamId(undefined);
                      setInitialStudentId(undefined);
                      setShowMarkModal(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Mark
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedExamsForAction([]);
                      setConfirmationStep(0);
                      setShowSetZeroModal(true);
                    }}
                    variant="outline"
                    className="gap-2 border-blue-500/50 hover:bg-blue-500/10"
                  >
                    <span>0️⃣</span>
                    Set Empty Marks to 0
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedExamsForAction([]);
                      setConfirmationStep(0);
                      setShowResetMarksModal(true);
                    }}
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
                                    onClick={() => {
                                      setInitialExamId(exam._id);
                                      setInitialStudentId(student._id);
                                      setShowMarkModal(true);
                                    }}
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
            )}

            {/* Empty States */}
            {activeView === 'students' && students.length === 0 && (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <div className="text-6xl mb-4">👨‍🎓</div>
                  <CardTitle className="text-xl mb-2">No Students Yet</CardTitle>
                  <CardDescription className="mb-6">
                    Import students using CSV to get started
                  </CardDescription>
                  <Button onClick={() => setShowImportModal(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Students
                  </Button>
                </CardContent>
              </Card>
            )}
          </div> {/* Close max-w-7xl */}
        </main>
      </div> {/* Close flex container */}
    </div> {/* Close min-h-screen */}

    {/* Modals - Rendered as siblings for proper z-index */}
    <div>
      {/* Import Students Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label>Paste CSV (Format: StudentID, StudentName)</Label>
              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                className="w-full h-32 px-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground mt-2"
                placeholder="e.g.&#10;S001, John Doe&#10;S002, Jane Smith"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setError('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImportStudents}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Exam Modal */}
      <Dialog open={showExamModal} onOpenChange={setShowExamModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Exam</DialogTitle>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddExam} className="space-y-4">
            <div>
              <Label>Exam Name</Label>
              <Input
                type="text"
                required
                value={examFormData.displayName}
                onChange={(e) => setExamFormData({ ...examFormData, displayName: e.target.value })}
                placeholder="e.g., Quiz 1"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Exam Category</Label>
              <select
                required
                value={examFormData.examCategory}
                onChange={(e) => setExamFormData({ ...examFormData, examCategory: e.target.value })}
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-ring text-foreground mt-2"
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
              <p className="text-xs text-muted-foreground mt-1">Quiz & Assignment types will be aggregated based on course settings</p>
            </div>

            <div>
              <Label>Total Marks</Label>
              <Input
                type="number"
                required
                min="1"
                step="0.01"
                value={examFormData.totalMarks}
                onChange={(e) => setExamFormData({ ...examFormData, totalMarks: e.target.value })}
                placeholder="e.g., 100"
                className="mt-2"
              />
            </div>

            <div>
              <Label>
                Weightage (%)
                {(examFormData.examCategory === 'Quiz' || examFormData.examCategory === 'Assignment') && (
                  <span className="ml-2 text-xs text-amber-500">(Not used for Quiz/Assignment)</span>
                )}
              </Label>
              <Input
                type="number"
                required={examFormData.examCategory !== 'Quiz' && examFormData.examCategory !== 'Assignment'}
                min="0"
                max="100"
                step="0.01"
                value={examFormData.weightage}
                onChange={(e) => setExamFormData({ ...examFormData, weightage: e.target.value })}
                placeholder="e.g., 20"
                disabled={examFormData.examCategory === 'Quiz' || examFormData.examCategory === 'Assignment'}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(examFormData.examCategory === 'Quiz' || examFormData.examCategory === 'Assignment') 
                  ? 'Weightage is set at course level for aggregated Quiz/Assignment columns'
                  : 'Percentage contribution to final grade'}
              </p>
            </div>

            {course?.courseType === 'Theory' && (
              <div>
                <Label>Number of COs (Optional)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={examFormData.numberOfCOs}
                  onChange={(e) => setExamFormData({ ...examFormData, numberOfCOs: e.target.value })}
                  placeholder="e.g., 3"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">For exams with CO-wise marks breakdown</p>
              </div>
            )}

            <div>
              <Label>Number of Questions (Optional)</Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={examFormData.numberOfQuestions}
                onChange={(e) => setExamFormData({ ...examFormData, numberOfQuestions: e.target.value })}
                placeholder="e.g., 5 (leave blank if not needed)"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">For question-wise marks breakdown (usually for MainExam category)</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowExamModal(false);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Exam
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
      <Dialog open={!!showExamSettings} onOpenChange={(open) => !open && setShowExamSettings(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exam Settings</DialogTitle>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input
                type="text"
                value={examSettings.displayName}
                onChange={(e) => setExamSettings({ ...examSettings, displayName: e.target.value })}
                placeholder="Exam name"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Exam Category</Label>
              <select
                required
                value={examSettings.examCategory}
                onChange={(e) => setExamSettings({ ...examSettings, examCategory: e.target.value })}
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-ring text-foreground mt-2"
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
              <p className="text-xs text-muted-foreground mt-1">Quiz & Assignment types will be aggregated</p>
            </div>

            <div>
              <Label>Total Marks</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={examSettings.totalMarks}
                onChange={(e) => setExamSettings({ ...examSettings, totalMarks: e.target.value })}
                placeholder="e.g., 100"
                className="mt-2"
              />
            </div>

            <div>
              <Label>
                Weightage (%)
                {(examSettings.examCategory === 'Quiz' || examSettings.examCategory === 'Assignment') && (
                  <span className="ml-2 text-xs text-amber-500">(Set in Course Settings)</span>
                )}
              </Label>
              {(examSettings.examCategory === 'Quiz' || examSettings.examCategory === 'Assignment') ? (
                <div className="w-full px-4 py-3 bg-muted/50 border rounded-lg text-muted-foreground cursor-not-allowed mt-2">
                  Not applicable - weightage set at course level
                </div>
              ) : (
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={examSettings.weightage}
                  onChange={(e) => setExamSettings({ ...examSettings, weightage: e.target.value })}
                  placeholder="e.g., 30"
                  className="mt-2"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {(examSettings.examCategory === 'Quiz' || examSettings.examCategory === 'Assignment') 
                  ? '💡 Use Course Settings button to configure Quiz/Assignment aggregation weightage'
                  : 'Percentage contribution to final grade'}
              </p>
            </div>

            {course?.courseType === 'Theory' && (
              <div>
                <Label>Number of COs</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={examSettings.numberOfCOs}
                  onChange={(e) => setExamSettings({ ...examSettings, numberOfCOs: e.target.value })}
                  placeholder="e.g., 3"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">For CO-wise marks breakdown</p>
              </div>
            )}

            <div>
              <Label>Number of Questions</Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={examSettings.numberOfQuestions}
                onChange={(e) => setExamSettings({ ...examSettings, numberOfQuestions: e.target.value })}
                placeholder="e.g., 5 (leave blank if not needed)"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">For question-wise marks breakdown (usually for MainExam category)</p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowExamSettings(null);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateExamSettings}>
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Settings Modal */}
      <Dialog open={showCourseSettings} onOpenChange={setShowCourseSettings}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header with Tabs */}
            <div className="border-b bg-muted/50">
              <div className="px-6 py-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-2xl">
                    <span className="text-3xl">⚙️</span>
                    <span>Course Settings</span>
                  </DialogTitle>
                </DialogHeader>
              </div>
              
              {/* Tabs */}
              <div className="px-6">
                <div className="flex gap-2 -mb-px">
                  <button
                    type="button"
                    onClick={() => setCourseSettingsTab('aggregation')}
                    className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
                      courseSettingsTab === 'aggregation'
                        ? 'border-primary text-primary bg-muted/50'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`}
                  >
                    📊 Quiz & Assignment Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseSettingsTab('grading')}
                    className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
                      courseSettingsTab === 'grading'
                        ? 'border-primary text-primary bg-muted/50'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`}
                  >
                    🏆 Grading Scale
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSaveCourseSettings} className="space-y-6 max-w-7xl mx-auto">
                {/* Quiz & Assignment Settings Tab */}
                {courseSettingsTab === 'aggregation' && (
                  <div className="space-y-6">
                    {/* Quiz Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          📝 Quiz Aggregation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <Label>Aggregation Method</Label>
                            <select
                              value={courseSettingsData.quizAggregation}
                              onChange={(e) => setCourseSettingsData({ ...courseSettingsData, quizAggregation: e.target.value as 'average' | 'best' })}
                              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-ring text-foreground mt-2"
                            >
                              <option value="average">Average of all quizzes</option>
                              <option value="best">Best quiz score</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">How to calculate the aggregated Quiz column</p>
                          </div>

                          <div>
                            <Label>Quiz Weightage (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={courseSettingsData.quizWeightage}
                              onChange={(e) => setCourseSettingsData({ ...courseSettingsData, quizWeightage: e.target.value })}
                              placeholder="e.g., 20"
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Weightage for the aggregated Quiz column in final grade</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assignment Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          📋 Assignment Aggregation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <Label>Aggregation Method</Label>
                            <select
                              value={courseSettingsData.assignmentAggregation}
                              onChange={(e) => setCourseSettingsData({ ...courseSettingsData, assignmentAggregation: e.target.value as 'average' | 'best' })}
                              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-ring text-foreground mt-2"
                            >
                              <option value="average">Average of all assignments</option>
                              <option value="best">Best assignment score</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">How to calculate the aggregated Assignment column</p>
                          </div>

                          <div>
                            <Label>Assignment Weightage (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={courseSettingsData.assignmentWeightage}
                              onChange={(e) => setCourseSettingsData({ ...courseSettingsData, assignmentWeightage: e.target.value })}
                              placeholder="e.g., 15"
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Weightage for the aggregated Assignment column in final grade</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Info Box */}
                    <Alert className="border-primary/50 bg-primary/10">
                      <AlertDescription className="text-sm">
                        💡 <strong>Note:</strong> Individual Quiz/Assignment exams don't need weightages. 
                        The aggregated column will use the weightage you set here.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Grading Scale Tab */}
                {courseSettingsTab === 'grading' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-semibold flex items-center gap-3">
                        <span className="text-3xl">📊</span>
                        <span>Grading Scale Management</span>
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCourseSettingsData({ ...courseSettingsData, gradingScale: DEFAULT_GRADING_SCALE });
                        }}
                      >
                        🔄 Reset to Default
                      </Button>
                    </div>

                    <Card>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 font-semibold">Grade</th>
                                <th className="text-left py-2 px-3 font-semibold">Minimum %</th>
                                <th className="text-left py-2 px-3 font-semibold">Range Preview</th>
                                <th className="text-right py-2 px-3 font-semibold">Actions</th>
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
                                    <tr key={index} className="border-b hover:bg-muted/30">
                                      <td className="py-2 px-3">
                                        <Badge variant="outline" className={`${getGradeBgColor(grade.letter)} ${getGradeColor(grade.letter)}`}>
                                          {getGradeDisplay(grade.letter, grade.modifier)}
                                        </Badge>
                                      </td>
                                      <td className="py-2 px-3">
                                        <Input
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
                                          className="w-24"
                                        />
                                      </td>
                                      <td className="py-2 px-3 text-muted-foreground">
                                        {grade.threshold.toFixed(2)}% - {upperBound.toFixed(2)}%
                                      </td>
                                      <td className="py-2 px-3 text-right">
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => {
                                            const updated = courseSettingsData.gradingScale.filter(g => g !== grade);
                                            setCourseSettingsData({ ...courseSettingsData, gradingScale: updated });
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
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
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Grade Threshold
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Alert className="border-amber-500/50 bg-amber-500/10">
                      <AlertDescription className="text-sm">
                        ⚠️ <strong>Important:</strong> Grade thresholds define the minimum percentage needed for each letter grade. 
                        Ensure there are no overlaps or gaps between grades. The system validates automatically when you save.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Action Buttons - Fixed at bottom */}
                <div className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t px-6 py-4 -mx-6 -mb-8 mt-8">
                  <div className="flex gap-4 max-w-7xl mx-auto">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowCourseSettings(false);
                        setError('');
                        setCourseSettingsTab('aggregation');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                    >
                      💾 Save All Settings
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

    {/* Set Empty Marks to Zero Modal */}
    <Dialog open={showSetZeroModal} onOpenChange={(open) => {
      if (!open) {
        setShowSetZeroModal(false);
        setSelectedExamsForAction([]);
        setConfirmationStep(0);
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>0️⃣</span>
            Set Empty Marks to 0
          </DialogTitle>
          <DialogDescription>
            {confirmationStep === 0 && 'Select exams to set empty marks to 0. Empty marks will be created with value 0.'}
            {confirmationStep === 1 && 'Review your selection and confirm the action.'}
            {confirmationStep === 2 && 'FINAL CONFIRMATION: This action cannot be undone!'}
          </DialogDescription>
        </DialogHeader>

        {confirmationStep === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-exams-zero"
                  checked={selectedExamsForAction.length === 0}
                  onCheckedChange={(checked) => {
                    setSelectedExamsForAction(checked ? [] : exams.map(e => e._id));
                  }}
                />
                <Label htmlFor="all-exams-zero" className="font-semibold cursor-pointer">
                  All Exams ({exams.length})
                </Label>
              </div>
              <Badge variant="secondary">{exams.length} exams</Badge>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Individual Exams:</div>
              {exams.map(exam => (
                <div key={exam._id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`exam-zero-${exam._id}`}
                      checked={selectedExamsForAction.length === 0 || selectedExamsForAction.includes(exam._id)}
                      disabled={selectedExamsForAction.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedExamsForAction([...selectedExamsForAction, exam._id]);
                        } else {
                          setSelectedExamsForAction(selectedExamsForAction.filter(id => id !== exam._id));
                        }
                      }}
                    />
                    <Label htmlFor={`exam-zero-${exam._id}`} className="cursor-pointer">
                      {exam.displayName}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{exam.totalMarks} marks</span>
                    {exam.examCategory && (
                      <Badge variant="outline">{exam.examCategory}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {confirmationStep === 1 && (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">You are about to set empty marks to 0 for:</p>
                <ul className="list-disc list-inside space-y-1">
                  {selectedExamsForAction.length === 0 ? (
                    <li>All {exams.length} exams</li>
                  ) : (
                    selectedExamsForAction.map(examId => {
                      const exam = exams.find(e => e._id === examId);
                      return exam ? <li key={examId}>{exam.displayName}</li> : null;
                    })
                  )}
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">
                  This will create mark entries with value 0 for all students who don't have marks for these exams.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {confirmationStep === 2 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-bold text-lg">⚠️ FINAL CONFIRMATION</p>
                <p>This is your last chance to cancel. Once you proceed, empty marks will be set to 0 for the selected exams.</p>
                <p className="text-sm">Type <strong>"CONFIRM"</strong> below to proceed:</p>
                <Input
                  id="final-confirm-zero"
                  placeholder="Type CONFIRM"
                  className="mt-2"
                />
              </div>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex gap-2">
          {confirmationStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setConfirmationStep(confirmationStep - 1)}
            >
              Back
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setShowSetZeroModal(false);
              setSelectedExamsForAction([]);
              setConfirmationStep(0);
            }}
          >
            Cancel
          </Button>
          {confirmationStep < 2 && (
            <Button
              onClick={() => setConfirmationStep(confirmationStep + 1)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
            </Button>
          )}
          {confirmationStep === 2 && (
            <Button
              onClick={() => {
                const input = document.getElementById('final-confirm-zero') as HTMLInputElement;
                if (input?.value === 'CONFIRM') {
                  handleSetEmptyMarksToZero(selectedExamsForAction);
                } else {
                  alert('Please type CONFIRM to proceed');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Set to Zero
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Reset Marks Modal */}
    <Dialog open={showResetMarksModal} onOpenChange={(open) => {
      if (!open) {
        setShowResetMarksModal(false);
        setSelectedExamsForAction([]);
        setConfirmationStep(0);
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Reset Marks (Delete)
          </DialogTitle>
          <DialogDescription>
            {confirmationStep === 0 && 'Select exams to reset. This will DELETE all marks for the selected exams.'}
            {confirmationStep === 1 && 'Review your selection and confirm the deletion.'}
            {confirmationStep === 2 && 'FINAL CONFIRMATION: This action PERMANENTLY deletes marks and CANNOT be undone!'}
          </DialogDescription>
        </DialogHeader>

        {confirmationStep === 0 && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                ⚠️ Warning: This will permanently delete all marks for the selected exams. This action cannot be undone!
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-exams-reset"
                  checked={selectedExamsForAction.length === 0}
                  onCheckedChange={(checked) => {
                    setSelectedExamsForAction(checked ? [] : exams.map(e => e._id));
                  }}
                />
                <Label htmlFor="all-exams-reset" className="font-semibold cursor-pointer">
                  All Exams ({exams.length})
                </Label>
              </div>
              <Badge variant="destructive">{exams.length} exams</Badge>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Individual Exams:</div>
              {exams.map(exam => {
                const examMarksCount = marks.filter(m => m.examId === exam._id).length;
                return (
                  <div key={exam._id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`exam-reset-${exam._id}`}
                        checked={selectedExamsForAction.length === 0 || selectedExamsForAction.includes(exam._id)}
                        disabled={selectedExamsForAction.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExamsForAction([...selectedExamsForAction, exam._id]);
                          } else {
                            setSelectedExamsForAction(selectedExamsForAction.filter(id => id !== exam._id));
                          }
                        }}
                      />
                      <Label htmlFor={`exam-reset-${exam._id}`} className="cursor-pointer">
                        {exam.displayName}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary">{examMarksCount} marks</Badge>
                      {exam.examCategory && (
                        <Badge variant="outline">{exam.examCategory}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {confirmationStep === 1 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">⚠️ You are about to DELETE all marks for:</p>
                <ul className="list-disc list-inside space-y-1">
                  {selectedExamsForAction.length === 0 ? (
                    <li>All {exams.length} exams ({marks.length} total marks)</li>
                  ) : (
                    selectedExamsForAction.map(examId => {
                      const exam = exams.find(e => e._id === examId);
                      const count = marks.filter(m => m.examId === examId).length;
                      return exam ? <li key={examId}>{exam.displayName} ({count} marks)</li> : null;
                    })
                  )}
                </ul>
                <p className="mt-3 font-semibold">
                  Total marks to be deleted: {selectedExamsForAction.length === 0 
                    ? marks.length 
                    : marks.filter(m => selectedExamsForAction.includes(m.examId)).length}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {confirmationStep === 2 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-bold text-lg">🚨 FINAL CONFIRMATION</p>
                <p className="font-semibold">This action will PERMANENTLY DELETE marks and CANNOT be recovered!</p>
                <p className="text-sm">Type <strong>"DELETE"</strong> below to proceed:</p>
                <Input
                  id="final-confirm-reset"
                  placeholder="Type DELETE"
                  className="mt-2 border-red-500"
                />
              </div>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex gap-2">
          {confirmationStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setConfirmationStep(confirmationStep - 1)}
            >
              Back
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setShowResetMarksModal(false);
              setSelectedExamsForAction([]);
              setConfirmationStep(0);
            }}
          >
            Cancel
          </Button>
          {confirmationStep < 2 && (
            <Button
              onClick={() => setConfirmationStep(confirmationStep + 1)}
              variant="destructive"
            >
              Next
            </Button>
          )}
          {confirmationStep === 2 && (
            <Button
              onClick={() => {
                const input = document.getElementById('final-confirm-reset') as HTMLInputElement;
                if (input?.value === 'DELETE') {
                  handleResetMarks(selectedExamsForAction);
                } else {
                  alert('Please type DELETE to proceed');
                }
              }}
              variant="destructive"
            >
              Delete Marks
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Add Individual Student Modal */}
    <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Student
          </DialogTitle>
          <DialogDescription>
            Add a single student to the course
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="student-id">Student ID</Label>
            <Input
              id="student-id"
              value={newStudentData.studentId}
              onChange={(e) => setNewStudentData({ ...newStudentData, studentId: e.target.value })}
              placeholder="e.g., S001"
            />
          </div>
          <div>
            <Label htmlFor="student-name">Student Name</Label>
            <Input
              id="student-name"
              value={newStudentData.name}
              onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
              placeholder="e.g., John Doe"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowAddStudentModal(false);
              setNewStudentData({ studentId: '', name: '' });
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleAddIndividualStudent}>
            Add Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Bulk Import Students Modal */}
    <Dialog open={showBulkAddStudentModal} onOpenChange={setShowBulkAddStudentModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Import Students (CSV)
          </DialogTitle>
          <DialogDescription>
            Import multiple students using CSV format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>CSV Data (Format: StudentID, StudentName)</Label>
            <textarea
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              className="w-full h-32 px-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground mt-2"
              placeholder="e.g.&#10;S001, John Doe&#10;S002, Jane Smith&#10;S003, Bob Johnson"
            />
          </div>
          <Alert>
            <AlertDescription className="text-xs">
              Each line should contain: Student ID, Student Name (comma-separated)
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowBulkAddStudentModal(false);
              setCsvInput('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleBulkImportStudents}>
            <Upload className="w-4 h-4 mr-2" />
            Import Students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Student Modal with Double Confirmation */}
    <Dialog open={showDeleteStudentModal} onOpenChange={(open) => {
      if (!open) {
        setShowDeleteStudentModal(false);
        setStudentToDelete(null);
        setDeleteConfirmationStep(0);
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Delete Student
          </DialogTitle>
          <DialogDescription>
            {deleteConfirmationStep === 0 && 'Are you sure you want to delete this student?'}
            {deleteConfirmationStep === 1 && 'FINAL CONFIRMATION: This action cannot be undone!'}
          </DialogDescription>
        </DialogHeader>

        {studentToDelete && (
          <>
            {deleteConfirmationStep === 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">You are about to delete:</p>
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <p><strong>ID:</strong> {studentToDelete.studentId}</p>
                      <p><strong>Name:</strong> {studentToDelete.name}</p>
                    </div>
                    <p className="text-sm mt-3">
                      This will also delete all marks associated with this student.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {deleteConfirmationStep === 1 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-bold text-lg">⚠️ FINAL CONFIRMATION</p>
                    <p>This will permanently delete <strong>{studentToDelete.name}</strong> and all their marks!</p>
                    <p className="text-sm">Type <strong>"DELETE"</strong> below to proceed:</p>
                    <Input
                      id="delete-student-confirm"
                      placeholder="Type DELETE"
                      className="mt-2 border-red-500"
                    />
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <DialogFooter className="flex gap-2">
          {deleteConfirmationStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmationStep(0)}
            >
              Back
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setShowDeleteStudentModal(false);
              setStudentToDelete(null);
              setDeleteConfirmationStep(0);
            }}
          >
            Cancel
          </Button>
          {deleteConfirmationStep === 0 && (
            <Button
              onClick={() => setDeleteConfirmationStep(1)}
              variant="destructive"
            >
              Next
            </Button>
          )}
          {deleteConfirmationStep === 1 && (
            <Button
              onClick={() => {
                const input = document.getElementById('delete-student-confirm') as HTMLInputElement;
                if (input?.value === 'DELETE') {
                  handleDeleteStudent();
                } else {
                  alert('Please type DELETE to proceed');
                }
              }}
              variant="destructive"
            >
              Delete Student
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

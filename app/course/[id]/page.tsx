'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { parseCSV } from '@/app/utils/csv';

interface Student {
  _id: string;
  studentId: string;
  name: string;
}

interface Exam {
  _id: string;
  name: string;
  totalMarks: number;
  scalingValue: number;
  scalingMethod?: string;
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
  semester: string;
  year: number;
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
  
  const [csvInput, setCsvInput] = useState('');
  const [examFormData, setExamFormData] = useState({
    name: '',
    totalMarks: '',
    scalingValue: '',
  });
  const [markFormData, setMarkFormData] = useState({
    studentId: '',
    examId: '',
    rawMark: '',
  });
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

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          name: examFormData.name,
          totalMarks: parseFloat(examFormData.totalMarks),
          scalingValue: parseFloat(examFormData.scalingValue),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setExams([...exams, data.exam]);
        setShowExamModal(false);
        setExamFormData({ name: '', totalMarks: '', scalingValue: '' });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error creating exam');
    }
  };

  const handleAddMark = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          studentId: markFormData.studentId,
          examId: markFormData.examId,
          rawMark: parseFloat(markFormData.rawMark),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update or add mark
        const existingIndex = marks.findIndex(
          m => m.studentId === data.mark.studentId && m.examId === data.mark.examId
        );
        
        if (existingIndex >= 0) {
          const newMarks = [...marks];
          newMarks[existingIndex] = data.mark;
          setMarks(newMarks);
        } else {
          setMarks([...marks, data.mark]);
        }
        
        setShowMarkModal(false);
        setMarkFormData({ studentId: '', examId: '', rawMark: '' });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error adding mark');
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

  const getMark = (studentId: string, examId: string) => {
    return marks.find(m => m.studentId === studentId && m.examId === examId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Course not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-900/80 border-b border-gray-700">
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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {course.name}
                </h1>
                <p className="text-xs text-gray-400">
                  {course.code} • {course.semester} {course.year}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all font-medium text-sm"
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

      <div className="max-w-7xl mx-auto p-4 pt-8">
        {/* Control Panel */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl shadow-2xl p-6 mb-6 border border-gray-700/50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-100">
            <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></span>
            Control Panel
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
            >
              📥 Import Students (CSV)
            </button>
            <button
              onClick={() => setShowExamModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg font-medium"
            >
              ➕ Add Exam
            </button>
            <button
              onClick={() => setShowMarkModal(true)}
              disabled={students.length === 0 || exams.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✏️ Add Mark
            </button>
          </div>
        </div>

        {/* Exams List */}
        {exams.length > 0 && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl shadow-2xl p-6 mb-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-100">
              <span className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-cyan-500 rounded-full"></span>
              Exams & Scaling
            </h2>
            <div className="space-y-4">
              {exams.map(exam => (
                <div key={exam._id} className="p-4 rounded-lg border bg-gray-900/50 border-gray-700/50 hover:border-gray-600 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-lg text-gray-100">{exam.name}</div>
                      <div className="text-sm mt-1 text-gray-400">
                        Total Marks: <span className="font-medium text-blue-400">{exam.totalMarks}</span> | 
                        Scaling Value: <span className="font-medium text-cyan-400">{exam.scalingValue}</span>
                        {exam.scalingMethod && (
                          <span className="ml-2 text-emerald-400">
                            | Method: {exam.scalingMethod}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Students & Marks Table */}
        {students.length > 0 && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl shadow-2xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-100">
              <span className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
              Students & Marks
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">Name</th>
                    {exams.map(exam => (
                      <th key={exam._id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                        <div>{exam.name}</div>
                        <div className="text-[10px] font-normal mt-0.5 text-gray-500">Raw / Scaled / Rounded</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {students.map((student, idx) => (
                    <tr key={student._id} className={`transition-colors hover:bg-gray-700/30 ${idx % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-900/20'}`}>
                      <td className="px-4 py-3 text-sm font-medium text-blue-300">{student.studentId}</td>
                      <td className="px-4 py-3 text-sm text-gray-200">{student.name}</td>
                      {exams.map(exam => {
                        const mark = getMark(student._id, exam._id);
                        return (
                          <td key={exam._id} className="px-4 py-3 text-sm text-gray-300">
                            {mark ? (
                              <div className="flex flex-col gap-1">
                                <span className="px-2 py-1 rounded font-medium text-xs bg-blue-900/30 text-blue-300">
                                  Raw: {mark.rawMark}
                                </span>
                                {mark.scaledMark !== undefined && mark.scaledMark !== null ? (
                                  <span className="px-2 py-1 rounded font-medium text-xs bg-emerald-900/30 text-emerald-300">
                                    Scaled: {mark.scaledMark}
                                  </span>
                                ) : (
                                  <span className="text-xs italic text-gray-600">Not scaled</span>
                                )}
                                {mark.roundedMark !== undefined && mark.roundedMark !== null ? (
                                  <span className="px-2 py-1 rounded font-medium text-xs bg-purple-900/30 text-purple-300">
                                    Rounded: {mark.roundedMark}
                                  </span>
                                ) : mark.scaledMark !== undefined && mark.scaledMark !== null ? (
                                  <span className="text-xs italic text-gray-600">Not rounded</span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty States */}
        {students.length === 0 && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-xl shadow-2xl p-12 text-center border border-gray-700/50">
            <div className="w-20 h-20 rounded-full bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👨‍🎓</span>
            </div>
            <h3 className="text-lg font-medium text-gray-100 mb-2">No Students Yet</h3>
            <p className="text-gray-400 mb-6">Import students using CSV</p>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
            >
              📥 Import Students
            </button>
          </div>
        )}
      </div>

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
                  value={examFormData.name}
                  onChange={(e) => setExamFormData({ ...examFormData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., Midterm"
                />
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Scaling Value</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={examFormData.scalingValue}
                  onChange={(e) => setExamFormData({ ...examFormData, scalingValue: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., 50"
                />
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

      {/* Add Mark Modal */}
      {showMarkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">Add/Update Mark</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAddMark} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Student</label>
                <select
                  required
                  value={markFormData.studentId}
                  onChange={(e) => setMarkFormData({ ...markFormData, studentId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                >
                  <option value="">-- Select Student --</option>
                  {students.map(student => (
                    <option key={student._id} value={student._id}>
                      {student.studentId} - {student.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exam</label>
                <select
                  required
                  value={markFormData.examId}
                  onChange={(e) => setMarkFormData({ ...markFormData, examId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                >
                  <option value="">-- Select Exam --</option>
                  {exams.map(exam => (
                    <option key={exam._id} value={exam._id}>
                      {exam.name} (Max: {exam.totalMarks})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Raw Mark</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={markFormData.rawMark}
                  onChange={(e) => setMarkFormData({ ...markFormData, rawMark: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="Enter mark"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMarkModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium"
                >
                  Save Mark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

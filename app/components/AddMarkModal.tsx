'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';

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
  numberOfCOs?: number;
  numberOfQuestions?: number;
}

interface Mark {
  _id: string;
  studentId: string;
  examId: string;
  rawMark: number;
  coMarks?: number[];
  questionMarks?: number[];
}

interface AddMarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  exams: Exam[];
  marks: Mark[];
  courseId: string;
  onMarkSaved: () => void;
  initialExamId?: string;
  initialStudentId?: string;
}

export default function AddMarkModal({
  isOpen,
  onClose,
  students,
  exams,
  marks,
  courseId,
  onMarkSaved,
  initialExamId,
  initialStudentId,
}: AddMarkModalProps) {
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || '');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId || '');
  const [rawMark, setRawMark] = useState('');
  const [coMarks, setCoMarks] = useState<string[]>([]);
  const [questionMarks, setQuestionMarks] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStep, setCurrentStep] = useState<'exam' | 'student' | 'marks'>('exam');
  const [focusedCOIndex, setFocusedCOIndex] = useState<number>(-1);

  // Refs for input fields
  const studentSearchRef = useRef<HTMLInputElement>(null);
  const rawMarkRef = useRef<HTMLInputElement>(null);
  const coMarkRefs = useRef<(HTMLInputElement | null)[]>([]);
  const questionMarkRefs = useRef<(HTMLInputElement | null)[]>([]);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const selectedExam = exams.find(e => e._id === selectedExamId);
  const numberOfCOs = selectedExam?.numberOfCOs || 0;
  const numberOfQuestions = selectedExam?.numberOfQuestions || 0;

  // Filter students based on search
  const filteredStudents = students.filter(s => 
    s.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Get marks count for selected exam
  const marksForExam = marks.filter(m => m.examId === selectedExamId);
  const studentsWithMarks = marksForExam.length;
  const studentsRemaining = students.length - studentsWithMarks;

  // Initialize coMarks array when exam is selected
  useEffect(() => {
    if (selectedExamId && numberOfCOs > 0) {
      setCoMarks(new Array(numberOfCOs).fill(''));
    } else {
      setCoMarks([]);
    }
    if (selectedExamId && numberOfQuestions > 0) {
      setQuestionMarks(new Array(numberOfQuestions).fill(''));
    } else {
      setQuestionMarks([]);
    }
  }, [selectedExamId, numberOfCOs, numberOfQuestions]);

  // Load existing marks when student is selected
  useEffect(() => {
    if (selectedStudentId && selectedExamId) {
      const existingMark = marks.find(
        m => m.studentId === selectedStudentId && m.examId === selectedExamId
      );
      
      if (existingMark) {
        setRawMark(existingMark.rawMark.toString());
        if (existingMark.coMarks && existingMark.coMarks.length > 0) {
          setCoMarks(existingMark.coMarks.map(m => m.toString()));
        }
        if (existingMark.questionMarks && existingMark.questionMarks.length > 0) {
          setQuestionMarks(existingMark.questionMarks.map(m => m.toString()));
        }
      } else {
        setRawMark('');
        if (numberOfCOs > 0) {
          setCoMarks(new Array(numberOfCOs).fill(''));
        }
        if (numberOfQuestions > 0) {
          setQuestionMarks(new Array(numberOfQuestions).fill(''));
        }
      }
      setCurrentStep('marks');
    }
  }, [selectedStudentId, selectedExamId, marks, numberOfCOs, numberOfQuestions]);

  // Focus management when step changes
  useEffect(() => {
    if (currentStep === 'student' && studentSearchRef.current) {
      setTimeout(() => studentSearchRef.current?.focus(), 100);
    } else if (currentStep === 'marks' && rawMarkRef.current) {
      setTimeout(() => rawMarkRef.current?.focus(), 100);
    }
  }, [currentStep]);

  // Reset modal state when opened/closed
  useEffect(() => {
    if (isOpen) {
      if (initialExamId) {
        setSelectedExamId(initialExamId);
        setCurrentStep(initialStudentId ? 'marks' : 'student');
      } else {
        setCurrentStep('exam');
      }
      if (initialStudentId) {
        setSelectedStudentId(initialStudentId);
      }
    } else {
      // Don't reset selected exam when closing
      setStudentSearch('');
      setSelectedStudentId('');
      setRawMark('');
      setCoMarks([]);
      setQuestionMarks([]);
      setError('');
      setSuccess('');
      setFocusedCOIndex(-1);
    }
  }, [isOpen, initialExamId, initialStudentId]);

  const handleExamSelect = (examId: string) => {
    setSelectedExamId(examId);
    setCurrentStep('student');
    setError('');
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStudentSearch('');
    setError('');
  };

  const validateAndSave = async () => {
    setError('');
    setSuccess('');

    if (!selectedStudentId || !selectedExamId || !rawMark) {
      setError('Please fill in all required fields');
      return;
    }

    const rawMarkNum = parseFloat(rawMark);
    
    // Validate raw mark
    if (isNaN(rawMarkNum) || rawMarkNum < 0) {
      setError('Raw mark must be a valid positive number');
      return;
    }

    if (selectedExam && rawMarkNum > selectedExam.totalMarks) {
      setError(`Raw mark cannot exceed ${selectedExam.totalMarks}`);
      return;
    }

    // Validate CO marks if applicable
    let coMarksArray: number[] | undefined = undefined;
    if (numberOfCOs > 0) {
      const coMarksNum = coMarks.map(cm => parseFloat(cm || '0'));
      
      // Check if all CO marks are valid numbers
      if (coMarksNum.some(cm => isNaN(cm) || cm < 0)) {
        setError('All CO marks must be valid positive numbers');
        return;
      }

      // Check if CO marks sum equals raw mark
      const coMarksSum = coMarksNum.reduce((sum, cm) => sum + cm, 0);
      if (Math.abs(coMarksSum - rawMarkNum) > 0.01) { // Allow small floating point differences
        setError(`CO marks must sum to ${rawMarkNum}. Current sum: ${coMarksSum.toFixed(2)}`);
        return;
      }

      coMarksArray = coMarksNum;
    }

    // Validate Question marks if applicable
    let questionMarksArray: number[] | undefined = undefined;
    if (numberOfQuestions > 0) {
      const questionMarksNum = questionMarks.map(qm => parseInt(qm || '0'));
      
      // Check if all Question marks are valid integers
      if (questionMarksNum.some(qm => isNaN(qm) || qm < 0)) {
        setError('All Question marks must be valid non-negative integers');
        return;
      }

      // Check if Question marks sum equals raw mark
      const questionMarksSum = questionMarksNum.reduce((sum, qm) => sum + qm, 0);
      if (questionMarksSum !== rawMarkNum) {
        setError(`Question marks must sum to ${rawMarkNum}. Current sum: ${questionMarksSum}`);
        return;
      }

      questionMarksArray = questionMarksNum;
    }

    // Save mark
    try {
      const response = await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          studentId: selectedStudentId,
          examId: selectedExamId,
          rawMark: rawMarkNum,
          coMarks: coMarksArray,
          questionMarks: questionMarksArray,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('✓ Mark saved successfully!');
        onMarkSaved();
        
        // Clear fields for next student after a brief delay
        setTimeout(() => {
          setSelectedStudentId('');
          setStudentSearch('');
          setRawMark('');
          if (numberOfCOs > 0) {
            setCoMarks(new Array(numberOfCOs).fill(''));
          }
          if (numberOfQuestions > 0) {
            setQuestionMarks(new Array(numberOfQuestions).fill(''));
          }
          setSuccess('');
          setCurrentStep('student');
          setFocusedCOIndex(-1);
        }, 800);
      } else {
        setError(data.error || 'Error saving mark');
      }
    } catch (err) {
      setError('Error saving mark');
    }
  };

  const handleKeyDown = (e: KeyboardEvent, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentField === 'save') {
        validateAndSave();
      } else {
        // Move to next field on Enter
        handleTabNavigation(e as any, currentField);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabNavigation(e as any, currentField);
    }
  };

  const handleTabNavigation = (e: KeyboardEvent, currentField: string) => {
    const isShiftTab = e.shiftKey;

    if (currentField === 'studentSearch') {
      if (!isShiftTab && rawMarkRef.current) {
        rawMarkRef.current.focus();
      }
    } else if (currentField === 'rawMark') {
      if (isShiftTab && studentSearchRef.current) {
        studentSearchRef.current.focus();
      } else if (!isShiftTab) {
        if (numberOfCOs > 0 && coMarkRefs.current[0]) {
          coMarkRefs.current[0]?.focus();
          setFocusedCOIndex(0);
        } else if (numberOfQuestions > 0 && questionMarkRefs.current[0]) {
          questionMarkRefs.current[0]?.focus();
        } else if (saveButtonRef.current) {
          saveButtonRef.current.focus();
        }
      }
    } else if (currentField.startsWith('co-')) {
      const coIndex = parseInt(currentField.split('-')[1]);
      
      if (isShiftTab) {
        if (coIndex === 0 && rawMarkRef.current) {
          rawMarkRef.current.focus();
          setFocusedCOIndex(-1);
        } else if (coIndex > 0 && coMarkRefs.current[coIndex - 1]) {
          coMarkRefs.current[coIndex - 1]?.focus();
          setFocusedCOIndex(coIndex - 1);
        }
      } else {
        if (coIndex < numberOfCOs - 1 && coMarkRefs.current[coIndex + 1]) {
          coMarkRefs.current[coIndex + 1]?.focus();
          setFocusedCOIndex(coIndex + 1);
        } else if (numberOfQuestions > 0 && questionMarkRefs.current[0]) {
          questionMarkRefs.current[0]?.focus();
          setFocusedCOIndex(-1);
        } else if (saveButtonRef.current) {
          saveButtonRef.current.focus();
          setFocusedCOIndex(-1);
        }
      }
    } else if (currentField.startsWith('q-')) {
      const qIndex = parseInt(currentField.split('-')[1]);
      
      if (isShiftTab) {
        if (qIndex === 0) {
          if (numberOfCOs > 0 && coMarkRefs.current[numberOfCOs - 1]) {
            coMarkRefs.current[numberOfCOs - 1]?.focus();
            setFocusedCOIndex(numberOfCOs - 1);
          } else if (rawMarkRef.current) {
            rawMarkRef.current.focus();
          }
        } else if (qIndex > 0 && questionMarkRefs.current[qIndex - 1]) {
          questionMarkRefs.current[qIndex - 1]?.focus();
        }
      } else {
        if (qIndex < numberOfQuestions - 1 && questionMarkRefs.current[qIndex + 1]) {
          questionMarkRefs.current[qIndex + 1]?.focus();
        } else if (saveButtonRef.current) {
          saveButtonRef.current.focus();
        }
      }
    } else if (currentField === 'save') {
      if (isShiftTab) {
        if (numberOfQuestions > 0 && questionMarkRefs.current[numberOfQuestions - 1]) {
          questionMarkRefs.current[numberOfQuestions - 1]?.focus();
        } else if (numberOfCOs > 0 && coMarkRefs.current[numberOfCOs - 1]) {
          coMarkRefs.current[numberOfCOs - 1]?.focus();
          setFocusedCOIndex(numberOfCOs - 1);
        } else if (rawMarkRef.current) {
          rawMarkRef.current.focus();
        }
      }
    }
  };

  const handleFinish = () => {
    setSelectedExamId('');
    setCurrentStep('exam');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-700/50 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Add/Edit Marks</h2>
          <button
            onClick={handleFinish}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all font-medium text-sm"
          >
            Finish Adding Marks
          </button>
        </div>

        {/* Step 1: Select Exam */}
        {currentStep === 'exam' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Select an exam to input marks for:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exams.map(exam => {
                const examMarks = marks.filter(m => m.examId === exam._id).length;
                return (
                  <button
                    key={exam._id}
                    onClick={() => handleExamSelect(exam._id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedExamId === exam._id
                        ? 'border-green-500 bg-green-900/30'
                        : 'border-gray-600 bg-gray-900/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-semibold text-gray-100">{exam.displayName}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Total: {exam.totalMarks} marks
                      {exam.numberOfCOs && ` • ${exam.numberOfCOs} COs`}
                      {exam.numberOfQuestions && ` • ${exam.numberOfQuestions} Questions`}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {examMarks}/{students.length} students entered
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2 & 3: Student Search and Mark Entry */}
        {currentStep !== 'exam' && selectedExam && (
          <div>
            {/* Selected Exam Info */}
            <div className="mb-6 p-4 rounded-lg bg-green-900/20 border border-green-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-green-300">{selectedExam.displayName}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Total: {selectedExam.totalMarks} marks
                    {selectedExam.numberOfCOs && ` • ${selectedExam.numberOfCOs} COs`}
                    {selectedExam.numberOfQuestions && ` • ${selectedExam.numberOfQuestions} Questions`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-300">
                    {studentsWithMarks}/{students.length} students
                  </div>
                  <div className="text-xs text-gray-400">
                    {studentsRemaining} remaining
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm font-medium">
                {success}
              </div>
            )}

            {/* Student Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Student (by ID or Name)
              </label>
              <input
                ref={studentSearchRef}
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'studentSearch')}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                placeholder="Type student ID or name..."
                autoComplete="off"
              />
              
              {/* Student Dropdown */}
              {studentSearch && filteredStudents.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto bg-gray-900 border border-gray-600 rounded-lg">
                  {filteredStudents.map(student => (
                    <button
                      key={student._id}
                      onClick={() => handleStudentSelect(student._id)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium text-blue-300">{student.studentId}</div>
                      <div className="text-sm text-gray-400">{student.name}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Student Display */}
              {selectedStudentId && !studentSearch && (
                <div className="mt-2 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-300">
                        {students.find(s => s._id === selectedStudentId)?.studentId}
                      </div>
                      <div className="text-sm text-gray-400">
                        {students.find(s => s._id === selectedStudentId)?.name}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudentId('');
                        setRawMark('');
                        if (numberOfCOs > 0) {
                          setCoMarks(new Array(numberOfCOs).fill(''));
                        }
                      }}
                      className="text-xs text-gray-400 hover:text-gray-200"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mark Entry - Only show when student is selected */}
            {selectedStudentId && (
              <div className="space-y-4">
                {/* Raw Mark */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Raw Mark (Max: {selectedExam.totalMarks})
                  </label>
                  <input
                    ref={rawMarkRef}
                    type="number"
                    min="0"
                    max={selectedExam.totalMarks}
                    step="0.01"
                    value={rawMark}
                    onChange={(e) => setRawMark(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'rawMark')}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                    placeholder="Enter raw mark"
                  />
                </div>

                {/* CO Marks */}
                {numberOfCOs > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CO Marks (Must sum to {rawMark || '0'})
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Array.from({ length: numberOfCOs }, (_, i) => (
                        <div key={i}>
                          <label className="block text-xs text-gray-400 mb-1">CO{i + 1}</label>
                          <input
                            ref={(el) => {
                              coMarkRefs.current[i] = el;
                            }}
                            type="number"
                            min="0"
                            step="0.01"
                            value={coMarks[i] || ''}
                            onChange={(e) => {
                              const newCoMarks = [...coMarks];
                              newCoMarks[i] = e.target.value;
                              setCoMarks(newCoMarks);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, `co-${i}`)}
                            className={`w-full px-3 py-2 bg-gray-900 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500 ${
                              focusedCOIndex === i ? 'border-blue-500' : 'border-gray-600'
                            }`}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                    {rawMark && (
                      <div className="mt-2 text-sm text-gray-400">
                        Current sum: {coMarks.reduce((sum, cm) => sum + (parseFloat(cm) || 0), 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                )}

                {/* Question Marks */}
                {numberOfQuestions > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Question Marks (Must sum to {rawMark || '0'})
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Array.from({ length: numberOfQuestions }, (_, i) => (
                        <div key={i}>
                          <label className="block text-xs text-gray-400 mb-1">Q{i + 1}</label>
                          <input
                            ref={(el) => {
                              questionMarkRefs.current[i] = el;
                            }}
                            type="number"
                            min="0"
                            step="1"
                            value={questionMarks[i] || ''}
                            onChange={(e) => {
                              const newQuestionMarks = [...questionMarks];
                              newQuestionMarks[i] = e.target.value;
                              setQuestionMarks(newQuestionMarks);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, `q-${i}`)}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                    {rawMark && (
                      <div className="mt-2 text-sm text-gray-400">
                        Current sum: {questionMarks.reduce((sum, qm) => sum + (parseInt(qm) || 0), 0)}
                      </div>
                    )}
                  </div>
                )}

                {/* Save Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    ref={saveButtonRef}
                    onClick={validateAndSave}
                    onKeyDown={(e) => handleKeyDown(e, 'save')}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg font-medium text-lg focus:ring-4 focus:ring-green-500"
                  >
                    💾 Save Mark
                  </button>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  Press Tab to move forward • Shift+Tab to move back • Enter to save
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

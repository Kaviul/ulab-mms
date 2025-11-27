'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronDown, ChevronRight, Settings, Trash2 } from 'lucide-react';

interface Exam {
  _id: string;
  displayName: string;
  totalMarks: number;
  weightage: number;
  isRequired?: boolean;
  examCategory?: string;
  scalingEnabled?: boolean;
  scalingTarget?: number | null;
  numberOfCOs?: number;
  numberOfQuestions?: number;
}

interface ExamSettings {
  displayName: string;
  weightage: string;
  totalMarks: string;
  numberOfCOs: string;
  numberOfQuestions: string;
  examCategory: string;
}

interface ExamsViewProps {
  exams: Exam[];
  expandedExam: string | null;
  scalingTargets: Record<string, string | undefined>;
  onSetExpandedExam: (examId: string | null) => void;
  onSetScalingTargets: (targets: Record<string, string | undefined> | ((prev: Record<string, string | undefined>) => Record<string, string | undefined>)) => void;
  onShowExamModal: () => void;
  onShowExamSettings: (examId: string) => void;
  onSetExamSettings: (settings: ExamSettings) => void;
  onDeleteExam: (examId: string) => void;
  onToggleScaling: (examId: string, currentEnabled: boolean) => void;
  onUpdateScalingTarget: (examId: string, target: number) => void;
  onApplyScaling: (examId: string, method: string) => void;
  onApplyRounding: (examId: string) => void;
}

export default function ExamsView({
  exams,
  expandedExam,
  scalingTargets,
  onSetExpandedExam,
  onSetScalingTargets,
  onShowExamModal,
  onShowExamSettings,
  onSetExamSettings,
  onDeleteExam,
  onToggleScaling,
  onUpdateScalingTarget,
  onApplyScaling,
  onApplyRounding,
}: ExamsViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exams Management</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Configure and manage {exams.length} exam(s)
          </p>
        </div>
        <Button onClick={onShowExamModal}>
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
            <Button onClick={onShowExamModal}>
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
                    onClick={() => onSetExpandedExam(expandedExam === exam._id ? null : exam._id)}
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
                        onShowExamSettings(exam._id);
                        onSetExamSettings({
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
                        onClick={() => onDeleteExam(exam._id)}
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
                        onChange={() => onToggleScaling(exam._id, exam.scalingEnabled || false)}
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
                            onSetScalingTargets(prev => ({
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
                              onSetScalingTargets(prev => ({
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
                            onUpdateScalingTarget(exam._id, target);
                          }}
                          disabled={
                            !scalingTargets[exam._id] || 
                            scalingTargets[exam._id] === '' ||
                            parseFloat(scalingTargets[exam._id] || '0') === (exam.scalingTarget !== undefined && exam.scalingTarget !== null ? exam.scalingTarget : exam.totalMarks)
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
                        onClick={() => onApplyScaling(exam._id, 'bellCurve')}
                        className="px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-amber-600 text-white text-xs rounded-lg hover:from-yellow-700 hover:to-amber-700 transition-all shadow-lg"
                      >
                        🎯 Bell Curve
                      </button>
                      <button
                        onClick={() => onApplyScaling(exam._id, 'linearNormalization')}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
                      >
                        📏 Linear
                      </button>
                      <button
                        onClick={() => onApplyScaling(exam._id, 'minMaxNormalization')}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
                      >
                        ⚖️ Min-Max
                      </button>
                      <button
                        onClick={() => onApplyScaling(exam._id, 'percentile')}
                        className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-pink-700 text-white text-xs rounded-lg hover:from-pink-700 hover:to-pink-800 transition-all shadow-lg"
                      >
                        📊 Percentile
                      </button>
                      <button
                        onClick={() => onApplyRounding(exam._id)}
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
  );
}

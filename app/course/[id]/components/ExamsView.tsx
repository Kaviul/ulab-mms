'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Settings, Activity, Info } from 'lucide-react';

interface Exam {
  _id: string;
  name: string;
  totalMarks: number;
  weightage: number;
}

interface ExamsViewProps {
  exams: Exam[];
  showAddExamDialog: boolean;
  showEditExamDialog: boolean;
  showWeightageDialog: boolean;
  showScalingDialog: boolean;
  newExam: {
    name: string;
    totalMarks: string;
    weightage: string;
  };
  editExam: {
    name: string;
    totalMarks: string;
    weightage: string;
  };
  weightageInput: number;
  scalingTargets: { [examId: string]: number };
  selectedExamForEdit: Exam | null;
  onSetShowAddExamDialog: (show: boolean) => void;
  onSetShowEditExamDialog: (show: boolean) => void;
  onSetShowWeightageDialog: (show: boolean) => void;
  onSetShowScalingDialog: (show: boolean) => void;
  onSetNewExam: (exam: any) => void;
  onSetEditExam: (exam: any) => void;
  onSetWeightageInput: (value: number) => void;
  onSetScalingTargets: (targets: { [examId: string]: number }) => void;
  onSetSelectedExamForEdit: (exam: Exam | null) => void;
  onHandleAddExam: () => void;
  onHandleEditExam: () => void;
  onHandleSetWeightage: () => void;
  onHandleScaling: () => void;
  onOpenEditExam: (exam: Exam) => void;
}

export default function ExamsView({
  exams,
  showAddExamDialog,
  showEditExamDialog,
  showWeightageDialog,
  showScalingDialog,
  newExam,
  editExam,
  weightageInput,
  scalingTargets,
  selectedExamForEdit,
  onSetShowAddExamDialog,
  onSetShowEditExamDialog,
  onSetShowWeightageDialog,
  onSetShowScalingDialog,
  onSetNewExam,
  onSetEditExam,
  onSetWeightageInput,
  onSetScalingTargets,
  onSetSelectedExamForEdit,
  onHandleAddExam,
  onHandleEditExam,
  onHandleSetWeightage,
  onHandleScaling,
  onOpenEditExam,
}: ExamsViewProps) {
  const totalWeightage = exams.reduce((sum, exam) => sum + exam.weightage, 0);
  const isWeightageValid = totalWeightage === 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exams</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Configure exam structure and weightages
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onSetShowAddExamDialog(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Exam
          </Button>
          <Button
            onClick={() => onSetShowWeightageDialog(true)}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Set Equal Weightage
          </Button>
          <Button
            onClick={() => onSetShowScalingDialog(true)}
            variant="outline"
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Scale Marks
          </Button>
        </div>
      </div>

      {/* Weightage Alert */}
      {!isWeightageValid && exams.length > 0 && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Total weightage is {totalWeightage}%. Please adjust to 100%.
          </AlertDescription>
        </Alert>
      )}

      {/* Exams Table */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Configuration</CardTitle>
          <CardDescription>
            Manage exam details and weightages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No exams added yet. Click "Add Exam" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Name</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Weightage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam._id}>
                    <TableCell className="font-medium">{exam.name}</TableCell>
                    <TableCell>{exam.totalMarks}</TableCell>
                    <TableCell>
                      <Badge variant={exam.weightage > 0 ? "default" : "secondary"}>
                        {exam.weightage}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => onOpenEditExam(exam)}
                        variant="ghost"
                        size="sm"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>
                    <Badge variant={isWeightageValid ? "default" : "destructive"}>
                      {totalWeightage}%
                    </Badge>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Exam Dialog */}
      <Dialog open={showAddExamDialog} onOpenChange={onSetShowAddExamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Exam</DialogTitle>
            <DialogDescription>
              Create a new exam component for this course
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="examName">Exam Name</Label>
              <Input
                id="examName"
                value={newExam.name}
                onChange={(e) =>
                  onSetNewExam({ ...newExam, name: e.target.value })
                }
                placeholder="e.g., Midterm Exam"
              />
            </div>
            <div>
              <Label htmlFor="totalMarks">Total Marks</Label>
              <Input
                id="totalMarks"
                type="number"
                value={newExam.totalMarks}
                onChange={(e) =>
                  onSetNewExam({ ...newExam, totalMarks: e.target.value })
                }
                placeholder="e.g., 100"
              />
            </div>
            <div>
              <Label htmlFor="weightage">Weightage (%)</Label>
              <Input
                id="weightage"
                type="number"
                value={newExam.weightage}
                onChange={(e) =>
                  onSetNewExam({ ...newExam, weightage: e.target.value })
                }
                placeholder="e.g., 30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onSetShowAddExamDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={onHandleAddExam}>Add Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Exam Dialog */}
      <Dialog open={showEditExamDialog} onOpenChange={onSetShowEditExamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exam</DialogTitle>
            <DialogDescription>
              Update exam details and configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editExamName">Exam Name</Label>
              <Input
                id="editExamName"
                value={editExam.name}
                onChange={(e) =>
                  onSetEditExam({ ...editExam, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="editTotalMarks">Total Marks</Label>
              <Input
                id="editTotalMarks"
                type="number"
                value={editExam.totalMarks}
                onChange={(e) =>
                  onSetEditExam({ ...editExam, totalMarks: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="editWeightage">Weightage (%)</Label>
              <Input
                id="editWeightage"
                type="number"
                value={editExam.weightage}
                onChange={(e) =>
                  onSetEditExam({ ...editExam, weightage: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onSetShowEditExamDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={onHandleEditExam}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Weightage Dialog */}
      <Dialog open={showWeightageDialog} onOpenChange={onSetShowWeightageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Equal Weightage</DialogTitle>
            <DialogDescription>
              Distribute marks equally across all exams
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Number of Exams</Label>
              <p className="text-sm text-muted-foreground">{exams.length} exams</p>
            </div>
            <div>
              <Label htmlFor="weightageValue">Weightage per Exam (%)</Label>
              <Input
                id="weightageValue"
                type="number"
                value={weightageInput}
                onChange={(e) => onSetWeightageInput(parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Total: {(weightageInput * exams.length).toFixed(2)}%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onSetShowWeightageDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={onHandleSetWeightage}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scaling Dialog */}
      <Dialog open={showScalingDialog} onOpenChange={onSetShowScalingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Scale Exam Marks</DialogTitle>
            <DialogDescription>
              Adjust marks to new target values for each exam
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {exams.map((exam) => (
              <div key={exam._id} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>{exam.name}</Label>
                  <p className="text-sm text-muted-foreground">
                    Current: {exam.totalMarks} marks
                  </p>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    placeholder="New total"
                    value={scalingTargets[exam._id] || ''}
                    onChange={(e) =>
                      onSetScalingTargets({
                        ...scalingTargets,
                        [exam._id]: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onSetShowScalingDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={onHandleScaling}>Scale Marks</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

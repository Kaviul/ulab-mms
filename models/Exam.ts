import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExam extends Document {
  displayName: string; // Renamable display name
  totalMarks: number;
  weightage: number; // Percentage weightage (not used for individual Quiz/Assignment exams)
  scalingEnabled: boolean; // Toggle for scaling
  scalingMethod?: 'bellCurve' | 'linearNormalization' | 'minMaxNormalization' | 'percentile';
  scalingTarget?: number; // Target value to scale to (e.g., 80, 90, 100)
  isRequired: boolean; // True for Mid/Final (Theory) or Lab Final/OEL (Lab)
  examType: 'midterm' | 'final' | 'labFinal' | 'oel' | 'custom'; // Type of exam
  examCategory?: 'Quiz' | 'Assignment' | 'Project' | 'Attendance' | 'MainExam' | 'ClassPerformance' | 'Others'; // Category for grouping
  numberOfCOs?: number; // For Theory Mid/Final only
  numberOfQuestions?: number; // For question-wise marking
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema: Schema = new Schema(
  {
    displayName: {
      type: String,
      required: [true, 'Please provide a display name'],
      trim: true,
    },
    totalMarks: {
      type: Number,
      required: [true, 'Please provide total marks'],
      min: [1, 'Total marks must be at least 1'],
    },
    weightage: {
      type: Number,
      required: [true, 'Please provide weightage'],
      min: [0, 'Weightage cannot be negative'],
      max: [100, 'Weightage cannot exceed 100'],
    },
    scalingEnabled: {
      type: Boolean,
      default: false,
    },
    scalingMethod: {
      type: String,
      enum: ['bellCurve', 'linearNormalization', 'minMaxNormalization', 'percentile'],
      default: null,
    },
    scalingTarget: {
      type: Number,
      min: [0, 'Scaling target cannot be negative'],
      default: null,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    examType: {
      type: String,
      enum: ['midterm', 'final', 'labFinal', 'oel', 'custom'],
      required: true,
    },
    examCategory: {
      type: String,
      enum: ['Quiz', 'Assignment', 'Project', 'Attendance', 'MainExam', 'ClassPerformance', 'Others'],
      default: null,
    },
    numberOfCOs: {
      type: Number,
      min: [0, 'Number of COs cannot be negative'],
      default: null,
    },
    numberOfQuestions: {
      type: Number,
      min: [0, 'Number of Questions cannot be negative'],
      default: null,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
ExamSchema.index({ courseId: 1 });

const Exam: Model<IExam> =
  mongoose.models.Exam || mongoose.model<IExam>('Exam', ExamSchema);

export default Exam;

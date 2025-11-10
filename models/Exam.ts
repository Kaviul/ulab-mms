import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExam extends Document {
  name: string;
  totalMarks: number;
  scalingValue: number;
  scalingMethod?: 'bellCurve' | 'linearNormalization' | 'minMaxNormalization' | 'percentile';
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide an exam name'],
      trim: true,
    },
    totalMarks: {
      type: Number,
      required: [true, 'Please provide total marks'],
      min: [1, 'Total marks must be at least 1'],
    },
    scalingValue: {
      type: Number,
      required: [true, 'Please provide a scaling value'],
      min: [1, 'Scaling value must be at least 1'],
    },
    scalingMethod: {
      type: String,
      enum: ['bellCurve', 'linearNormalization', 'minMaxNormalization', 'percentile'],
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

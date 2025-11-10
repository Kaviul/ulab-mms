import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMark extends Document {
  studentId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rawMark: number;
  scaledMark?: number;
  roundedMark?: number;
  createdAt: Date;
  updatedAt: Date;
}

const MarkSchema: Schema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
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
    rawMark: {
      type: Number,
      required: [true, 'Please provide a mark'],
      min: [0, 'Mark cannot be negative'],
    },
    scaledMark: {
      type: Number,
      default: null,
    },
    roundedMark: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a student can't have duplicate marks for the same exam
MarkSchema.index({ studentId: 1, examId: 1 }, { unique: true });
MarkSchema.index({ courseId: 1 });

const Mark: Model<IMark> =
  mongoose.models.Mark || mongoose.model<IMark>('Mark', MarkSchema);

export default Mark;

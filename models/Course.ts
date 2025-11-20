import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICourse extends Document {
  name: string;
  code: string;
  semester: string;
  year: number;
  courseType: 'Theory' | 'Lab';
  showFinalGrade: boolean;
  quizAggregation: 'average' | 'best'; // How to aggregate quiz marks
  quizWeightage: number; // Weightage for aggregated quiz column
  assignmentAggregation: 'average' | 'best'; // How to aggregate assignment marks
  assignmentWeightage: number; // Weightage for aggregated assignment column
  gradingScale?: string; // Encoded grading scale (e.g., "0:F:0|50:D:0|55:C:1|...")
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a course name'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Please provide a course code'],
      trim: true,
    },
    semester: {
      type: String,
      required: [true, 'Please provide a semester'],
      enum: ['Spring', 'Summer', 'Fall'],
    },
    year: {
      type: Number,
      required: [true, 'Please provide a year'],
      min: 2000,
      max: 2100,
    },
    courseType: {
      type: String,
      required: [true, 'Please provide a course type'],
      enum: ['Theory', 'Lab'],
    },
    showFinalGrade: {
      type: Boolean,
      default: false,
    },
    quizAggregation: {
      type: String,
      enum: ['average', 'best'],
      default: 'average',
    },
    quizWeightage: {
      type: Number,
      default: 0,
      min: [0, 'Weightage cannot be negative'],
      max: [100, 'Weightage cannot exceed 100'],
    },
    assignmentAggregation: {
      type: String,
      enum: ['average', 'best'],
      default: 'average',
    },
    assignmentWeightage: {
      type: Number,
      default: 0,
      min: [0, 'Weightage cannot be negative'],
      max: [100, 'Weightage cannot exceed 100'],
    },
    gradingScale: {
      type: String,
      default: '0:F:0|50:D:0|55:C:1|60:C:2|65:B:1|70:B:0|75:B:2|80:A:1|85:A:0|95:A:2',
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

// Create compound index for course code and user
CourseSchema.index({ code: 1, userId: 1 });

const Course: Model<ICourse> =
  mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);

export default Course;

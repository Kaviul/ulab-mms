// models/CommonReport.ts
import mongoose, { Schema } from "mongoose";

const CommonReportSchema = new Schema(
  {
    category: { type: String, required: true, unique: true },
    filename: { type: String, required: true },
    fileData: { type: Buffer, required: true },
    mimetype: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.CommonReport ||
  mongoose.model("CommonReport", CommonReportSchema);

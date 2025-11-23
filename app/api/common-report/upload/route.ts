import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import CommonReport from "@/models/CommonReport";

const ADMIN_KEY = process.env.ADMIN_REPORT_KEY;

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // 1. Admin key check
    const key = req.headers.get("x-admin-key");
    if (!key || key !== ADMIN_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse FormData from request
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;

    if (!file || !category) {
      return NextResponse.json(
        { error: "Missing file or category" },
        { status: 400 }
      );
    }

    // 3. Convert File → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Replace or create a new document for the category
    await CommonReport.findOneAndUpdate(
      { category },
      {
        category,
        filename: file.name,
        mimetype: file.type,
        fileData: buffer,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: "File uploaded successfully",
      category,
    });
  } catch (err: any) {
    console.error("Upload Error:", err);
    return NextResponse.json(
      { error: "Upload failed", details: err.message },
      { status: 500 }
    );
  }
}

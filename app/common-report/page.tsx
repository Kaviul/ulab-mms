"use client";

import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file || !category) {
      setMessage("Please select a file and category.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    const res = await fetch("/api/common-report/upload", {
      method: "POST",
      headers: {
        "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_REPORT_KEY!,
      },
      body: formData,
    });

    const data = await res.json();
    setMessage(data.message || data.error);
  };

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin File Upload</h1>

      <label className="block mb-2">Category</label>
      <input
        type="text"
        className="border p-2 w-full mb-4"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Example: syllabus / routine / handbook"
      />

      <label className="block mb-2">Select File</label>
      <input
        type="file"
        className="border p-2 w-full mb-4"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Upload File
      </button>

      {message && (
        <p className="mt-4 font-medium text-green-600">{message}</p>
      )}
    </div>
  );
}

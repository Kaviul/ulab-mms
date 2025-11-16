'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Course {
  _id: string;
  name: string;
  code: string;
  semester: string;
  year: number;
  courseType: 'Theory' | 'Lab';
  createdAt: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    semester: 'Spring',
    year: new Date().getFullYear(),
    courseType: 'Theory' as 'Theory' | 'Lab',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    semester: 'Spring',
    year: new Date().getFullYear(),
    courseType: 'Theory' as 'Theory' | 'Lab',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCourses();
    }
  }, [status]);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Listen for storage changes and custom events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        setTheme((e.newValue as 'light' | 'dark') || 'dark');
      }
    };

    const handleThemeChange = (e: CustomEvent) => {
      setTheme(e.detail.theme);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themeChange' as any, handleThemeChange as any);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange' as any, handleThemeChange as any);
    };
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create course');
        return;
      }

      setCourses([data.course, ...courses]);
      setShowAddModal(false);
      setFormData({
        name: '',
        code: '',
        semester: 'Spring',
        year: new Date().getFullYear(),
        courseType: 'Theory',
      });
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? All students, exams, and marks will be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCourses(courses.filter((c) => c._id !== courseId));
      }
    } catch (err) {
      console.error('Error deleting course:', err);
    }
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingCourse) return;

    try {
      const response = await fetch(`/api/courses/${editingCourse._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update course');
        return;
      }

      // Update the course in the list
      setCourses(courses.map(c => c._id === editingCourse._id ? data.course : c));
      setShowEditModal(false);
      setEditingCourse(null);
      setEditFormData({
        name: '',
        code: '',
        semester: 'Spring',
        year: new Date().getFullYear(),
        courseType: 'Theory',
      });
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setEditFormData({
      name: course.name,
      code: course.code,
      semester: course.semester,
      year: course.year,
      courseType: course.courseType,
    });
    setShowEditModal(true);
  };

  const handleImportCourse = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    setImporting(true);
    try {
      const fileContent = await importFile.text();
      const courseData = JSON.parse(fileContent);

      // Validate the import file structure
      if (!courseData.version || !courseData.course || !courseData.students || !courseData.exams) {
        alert('Invalid import file format. Please select a valid course backup file.');
        return;
      }

      const response = await fetch('/api/courses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Course "${data.course.name}" imported successfully!`);
        setShowImportModal(false);
        setImportFile(null);
        await fetchCourses(); // Refresh the course list
      } else {
        const data = await response.json();
        alert(data.error || 'Error importing course');
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Error importing course. Please ensure the file is a valid JSON backup.');
    } finally {
      setImporting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
          : 'bg-gradient-to-br from-gray-100 via-slate-100 to-gray-100'
      }`}>
        <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
        : 'bg-gradient-to-br from-gray-100 via-slate-100 to-gray-100'
    }`}>
      {/* Navbar */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${
        theme === 'dark'
          ? 'bg-gray-900/80 border-gray-700'
          : 'bg-white/80 border-gray-300'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/ulab.svg"
                alt="ULAB Logo"
                width={50}
                height={50}
                className="drop-shadow-lg"
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Marks Management System
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Welcome, {session?.user?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className={`px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                }`}
              >
                ⚙️ Settings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-medium text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              My Courses
            </h2>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}>
              Manage your courses and student marks
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-900/50 font-medium"
            >
              📥 Import Course
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-900/50 font-medium"
            >
              ➕ Add Course
            </button>
          </div>
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <div className={`rounded-xl shadow-2xl border p-12 text-center transition-colors ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700/50'
              : 'bg-white border-gray-300'
          }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
            }`}>
              <span className="text-4xl">📚</span>
            </div>
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              No Courses Yet
            </h3>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Get started by creating your first course
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-900/50 font-medium"
            >
              ➕ Create Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course._id}
                className={`rounded-xl shadow-xl border p-6 hover:shadow-2xl transition-all group ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700/50 hover:border-gray-600/50'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    course.courseType === 'Theory' 
                      ? 'bg-gradient-to-br from-blue-600 to-cyan-600' 
                      : 'bg-gradient-to-br from-purple-600 to-pink-600'
                  }`}>
                    <span className="text-2xl">{course.courseType === 'Theory' ? '📖' : '🔬'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(course)}
                      className="px-2 py-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-all"
                      title="Edit course"
                    >
                      ⚙️
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course._id)}
                      className="px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-all"
                      title="Delete course"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                  {course.name}
                </h3>
                <p className="text-blue-400 font-medium mb-1">
                  {course.code}
                </p>
                <p className={`text-xs font-medium mb-4 ${
                  course.courseType === 'Theory' ? 'text-cyan-400' : 'text-pink-400'
                }`}>
                  {course.courseType} Course
                </p>
                <div className="flex items-center gap-2 text-sm mb-4">
                  <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-200 text-gray-800'}`}>
                    {course.semester}
                  </span>
                  <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-200 text-gray-700'}`}>
                    {course.year}
                  </span>
                </div>

                <Link
                  href={`/course/${course._id}`}
                  className="block w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium"
                >
                  Open Course →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full border p-6 transition-colors ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700/50'
              : 'bg-white border-gray-300'
          }`}>
            <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              Add New Course
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Course Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., Data Structures"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Course Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., CSE201"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Semester
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) =>
                    setFormData({ ...formData, semester: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                >
                  <option value="Spring">Spring</option>
                  <option value="Summer">Summer</option>
                  <option value="Fall">Fall</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  required
                  min="2000"
                  max="2100"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Course Type
                </label>
                <select
                  value={formData.courseType}
                  onChange={(e) =>
                    setFormData({ ...formData, courseType: e.target.value as 'Theory' | 'Lab' })
                  }
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                >
                  <option value="Theory">Theory Course</option>
                  <option value="Lab">Lab Course</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  {formData.courseType === 'Theory' 
                    ? '📖 Theory courses include Midterm and Final exams with CO breakdown'
                    : '🔬 Lab courses include Lab Final and OEL/CE Project'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && editingCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">
              Edit Course
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEditCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Course Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., Data Structures"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Course Code
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.code}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, code: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                  placeholder="e.g., CSE201"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Semester
                </label>
                <select
                  value={editFormData.semester}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, semester: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                >
                  <option value="Spring">Spring</option>
                  <option value="Summer">Summer</option>
                  <option value="Fall">Fall</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  required
                  min="2000"
                  max="2100"
                  value={editFormData.year}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, year: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Course Type
                </label>
                <select
                  value={editFormData.courseType}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, courseType: e.target.value as 'Theory' | 'Lab' })
                  }
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100"
                >
                  <option value="Theory">Theory Course</option>
                  <option value="Lab">Lab Course</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  {editFormData.courseType === 'Theory' 
                    ? '📖 Theory courses include Midterm and Final exams with CO breakdown'
                    : '🔬 Lab courses include Lab Final and OEL/CE Project'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCourse(null);
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Course Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">
              Import Course
            </h2>

            <div className="mb-6">
              <p className="text-gray-300 text-sm mb-4">
                Select a course backup JSON file to import. This will create a new course with all students, exams, and marks from the backup.
              </p>
              
              <div className="bg-amber-900/20 border border-amber-600/50 rounded-lg p-4 mb-4">
                <p className="text-amber-200 text-sm">
                  ⚠️ This will create a new course. The imported data will not affect existing courses.
                </p>
              </div>

              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select JSON Backup File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
              />
              {importFile && (
                <p className="mt-2 text-sm text-gray-400">
                  Selected: {importFile.name}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCourse}
                disabled={!importFile || importing}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  'Import Course'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

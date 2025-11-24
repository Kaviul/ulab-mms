'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Settings, LogOut, Plus, Upload, Copy, Edit, Trash2, BookOpen, FlaskConical } from 'lucide-react';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [duplicatingCourse, setDuplicatingCourse] = useState<Course | null>(null);
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
  const [duplicateFormData, setDuplicateFormData] = useState({
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

  const openDuplicateModal = (course: Course) => {
    setDuplicatingCourse(course);
    setDuplicateFormData({
      name: `${course.name} (Copy)`,
      code: `${course.code}-COPY`,
      semester: course.semester,
      year: course.year,
      courseType: course.courseType,
    });
    setShowDuplicateModal(true);
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

  const handleDuplicateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!duplicatingCourse) return;

    setDuplicating(true);
    try {
      // First, export the course data
      const exportResponse = await fetch(`/api/courses/${duplicatingCourse._id}/export`);
      if (!exportResponse.ok) {
        throw new Error('Failed to export course data');
      }
      const courseData = await exportResponse.json();

      // Update the course data with new details
      courseData.course.name = duplicateFormData.name;
      courseData.course.code = duplicateFormData.code;
      courseData.course.semester = duplicateFormData.semester;
      courseData.course.year = duplicateFormData.year;
      courseData.course.courseType = duplicateFormData.courseType;

      // Import as a new course
      const importResponse = await fetch('/api/courses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });

      if (importResponse.ok) {
        const data = await importResponse.json();
        alert(`Course "${data.course.name}" duplicated successfully!`);
        setShowDuplicateModal(false);
        setDuplicatingCourse(null);
        setDuplicateFormData({
          name: '',
          code: '',
          semester: 'Spring',
          year: new Date().getFullYear(),
          courseType: 'Theory',
        });
        await fetchCourses(); // Refresh the course list
      } else {
        const data = await importResponse.json();
        setError(data.error || 'Error duplicating course');
      }
    } catch (err) {
      console.error('Duplicate error:', err);
      setError('Error duplicating course. Please try again.');
    } finally {
      setDuplicating(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b bg-background/80">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/ulab.svg"
                alt="ULAB Logo"
                width={100}
                height={100}
                className="drop-shadow-lg"
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Marks Management System
                </h1>
                <p className="text-xs text-muted-foreground">
                  Welcome, {session?.user?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button
                variant="destructive"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              My Courses
            </h2>
            <p className="text-muted-foreground">
              Manage your courses and student marks
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Course
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
          </div>
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📚</span>
              </div>
              <CardTitle className="mb-2">
                No Courses Yet
              </CardTitle>
              <CardDescription className="mb-6">
                Get started by creating your first course
              </CardDescription>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card
                key={course._id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      course.courseType === 'Theory' 
                        ? 'bg-gradient-to-br from-blue-600 to-cyan-600' 
                        : 'bg-gradient-to-br from-purple-600 to-pink-600'
                    }`}>
                      {course.courseType === 'Theory' ? (
                        <BookOpen className="h-6 w-6 text-white" />
                      ) : (
                        <FlaskConical className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDuplicateModal(course)}
                        title="Duplicate course"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(course)}
                        title="Edit course"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCourse(course._id)}
                        title="Delete course"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="mt-4">{course.name}</CardTitle>
                  <CardDescription>{course.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="mb-4">
                    {course.courseType} Course
                  </Badge>
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <Badge variant="outline">{course.semester}</Badge>
                    <Badge variant="outline">{course.year}</Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/course/${course._id}`}>
                      Open Course →
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddCourse} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course-name">Course Name</Label>
              <Input
                id="course-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Data Structures"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-code">Course Code</Label>
              <Input
                id="course-code"
                type="text"
                required
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="e.g., CSE201"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <select
                id="semester"
                value={formData.semester}
                onChange={(e) =>
                  setFormData({ ...formData, semester: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Fall">Fall</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                required
                min="2000"
                max="2100"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-type">Course Type</Label>
              <select
                id="course-type"
                value={formData.courseType}
                onChange={(e) =>
                  setFormData({ ...formData, courseType: e.target.value as 'Theory' | 'Lab' })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Theory">Theory Course</option>
                <option value="Lab">Lab Course</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {formData.courseType === 'Theory' 
                  ? '📖 Theory courses include Midterm and Final exams with CO breakdown'
                  : '🔬 Lab courses include Lab Final and OEL/CE Project'}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Course</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Course Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleEditCourse} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-course-name">Course Name</Label>
              <Input
                id="edit-course-name"
                type="text"
                required
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                placeholder="e.g., Data Structures"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-course-code">Course Code</Label>
              <Input
                id="edit-course-code"
                type="text"
                required
                value={editFormData.code}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, code: e.target.value })
                }
                placeholder="e.g., CSE201"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-semester">Semester</Label>
              <select
                id="edit-semester"
                value={editFormData.semester}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, semester: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Fall">Fall</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-year">Year</Label>
              <Input
                id="edit-year"
                type="number"
                required
                min="2000"
                max="2100"
                value={editFormData.year}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, year: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-course-type">Course Type</Label>
              <select
                id="edit-course-type"
                value={editFormData.courseType}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, courseType: e.target.value as 'Theory' | 'Lab' })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Theory">Theory Course</option>
                <option value="Lab">Lab Course</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {editFormData.courseType === 'Theory' 
                  ? '📖 Theory courses include Midterm and Final exams with CO breakdown'
                  : '🔬 Lab courses include Lab Final and OEL/CE Project'}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCourse(null);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Course Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Course</DialogTitle>
            <DialogDescription>
              Select a course backup JSON file to import. This will create a new course with all students, exams, and marks from the backup.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertDescription>
              ⚠️ This will create a new course. The imported data will not affect existing courses.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="import-file">Select JSON Backup File</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            {importFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {importFile.name}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportCourse}
              disabled={!importFile || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Course'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Course Modal */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Course</DialogTitle>
            <DialogDescription>
              This will create a new course with all students, exams, and marks from <strong>{duplicatingCourse?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleDuplicateCourse} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dup-course-name">Course Name</Label>
              <Input
                id="dup-course-name"
                type="text"
                required
                value={duplicateFormData.name}
                onChange={(e) =>
                  setDuplicateFormData({ ...duplicateFormData, name: e.target.value })
                }
                placeholder="e.g., Data Structures (Copy)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dup-course-code">Course Code</Label>
              <Input
                id="dup-course-code"
                type="text"
                required
                value={duplicateFormData.code}
                onChange={(e) =>
                  setDuplicateFormData({ ...duplicateFormData, code: e.target.value })
                }
                placeholder="e.g., CSE201-COPY"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dup-semester">Semester</Label>
              <select
                id="dup-semester"
                value={duplicateFormData.semester}
                onChange={(e) =>
                  setDuplicateFormData({ ...duplicateFormData, semester: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Fall">Fall</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dup-year">Year</Label>
              <Input
                id="dup-year"
                type="number"
                required
                min="2000"
                max="2100"
                value={duplicateFormData.year}
                onChange={(e) =>
                  setDuplicateFormData({ ...duplicateFormData, year: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dup-course-type">Course Type</Label>
              <select
                id="dup-course-type"
                value={duplicateFormData.courseType}
                onChange={(e) =>
                  setDuplicateFormData({ ...duplicateFormData, courseType: e.target.value as 'Theory' | 'Lab' })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Theory">Theory Course</option>
                <option value="Lab">Lab Course</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {duplicateFormData.courseType === 'Theory' 
                  ? '📖 Theory courses include Midterm and Final exams with CO breakdown'
                  : '🔬 Lab courses include Lab Final and OEL/CE Project'}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicatingCourse(null);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={duplicating}>
                {duplicating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Duplicating...
                  </>
                ) : (
                  'Duplicate Course'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

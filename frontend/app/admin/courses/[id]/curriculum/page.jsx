'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Pencil, ChevronDown, PlayCircle, FileText,
  HelpCircle, Loader2, GripVertical, Keyboard,
} from 'lucide-react';
import { api } from '@/lib/api';
import LessonEditor from '@/components/admin/LessonEditor';
import QuizManager from '@/components/admin/QuizManager';
import TypingDrillEditor from '@/components/admin/TypingDrillEditor';
import { Spinner, ErrorState } from '@/components/ui';

export default function CurriculumPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI holatlari
  const [newSection, setNewSection] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [addingLessonTo, setAddingLessonTo] = useState(null); // sectionId
  const [editingLesson, setEditingLesson] = useState(null); // lessonId
  const [openQuiz, setOpenQuiz] = useState({}); // lessonId -> bool

  const load = async () => {
    try {
      const res = await api.get(`/admin/courses/${id}/curriculum`);
      setCourse(res.course);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const refresh = () => {
    setAddingLessonTo(null);
    setEditingLesson(null);
    load();
  };

  // ---- Boʻlim amallari ----
  const addSection = async () => {
    if (newSection.trim().length < 2) return;
    setAddingSection(true);
    try {
      await api.post('/admin/sections', { courseId: id, title: newSection.trim() });
      setNewSection('');
      load();
    } catch (err) { alert(err.message); }
    finally { setAddingSection(false); }
  };

  const deleteSection = async (sid, title) => {
    if (!confirm(`"${title}" boʻlimini va uning barcha darslarini oʻchirasizmi?`)) return;
    try { await api.del(`/admin/sections/${sid}`); load(); }
    catch (err) { alert(err.message); }
  };

  const deleteLesson = async (lid, title) => {
    if (!confirm(`"${title}" darsini oʻchirasizmi?`)) return;
    try { await api.del(`/admin/lessons/${lid}`); load(); }
    catch (err) { alert(err.message); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!course) return null;

  // Klaviatura mashqi kursida darsda video/test emas, mashq matni boʻladi
  const isTyping = course.kind === 'TYPING';

  return (
    <div>
      <Link href="/admin/courses" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft size={16} /> Kurslar
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Oʻquv dasturi</h1>
          <p className="mt-1 text-sm text-muted">
            {course.title}
            {isTyping && (
              <span className="ml-2 badge bg-indigo-50 text-indigo-700">
                <Keyboard size={13} /> Klaviatura mashqi
              </span>
            )}
          </p>
        </div>
        <Link href={`/admin/courses/${id}`} className="btn-outline"><Pencil size={16} /> Kurs sozlamalari</Link>
      </div>

      {/* Boʻlimlar */}
      <div className="mt-6 space-y-3">
        {course.sections.length === 0 && (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
            Hali boʻlim yoʻq. Pastdan birinchi boʻlimni qoʻshing.
          </p>
        )}

        {course.sections.map((section, si) => {
          const isOpen = openSections[section.id] ?? true;
          return (
            <div key={section.id} className="card overflow-hidden">
              {/* Boʻlim sarlavhasi */}
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
                <button onClick={() => setOpenSections({ ...openSections, [section.id]: !isOpen })}>
                  <ChevronDown size={18} className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                </button>
                <span className="font-semibold">{si + 1}. {section.title}</span>
                <span className="text-xs text-muted">({section.lessons.length} dars)</span>
                <button onClick={() => deleteSection(section.id, section.title)} className="ml-auto text-red-500 hover:text-red-700" title="Boʻlimni oʻchirish">
                  <Trash2 size={16} />
                </button>
              </div>

              {isOpen && (
                <div className="p-4">
                  {/* Darslar */}
                  <div className="space-y-2">
                    {section.lessons.map((lesson) => (
                      <div key={lesson.id} className="rounded-xl border border-line">
                        {editingLesson === lesson.id ? (
                          <div className="p-3">
                            <LessonEditor lesson={lesson} typing={isTyping} onDone={refresh} onCancel={() => setEditingLesson(null)} />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 px-3 py-2.5">
                              <GripVertical size={15} className="text-slate-300" />
                              {isTyping ? <Keyboard size={16} className="text-primary" />
                                : lesson.videoUrl ? <PlayCircle size={16} className="text-primary" />
                                  : <FileText size={16} className="text-muted" />}
                              <span className="flex-1 text-sm">{lesson.title}</span>
                              {lesson.isFreePreview && <span className="badge bg-indigo-50 text-indigo-700">Bepul</span>}
                              {isTyping ? (
                                // Klaviatura kursida test/material yoʻq — faqat mashq
                                !lesson.typingDrill && (
                                  <span className="badge bg-amber-50 text-amber-700">Mashq yoʻq</span>
                                )
                              ) : (
                                <button
                                  onClick={() => setOpenQuiz({ ...openQuiz, [lesson.id]: !openQuiz[lesson.id] })}
                                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-slate-100"
                                  title="Test"
                                >
                                  <HelpCircle size={14} /> {lesson.questions?.length || 0}
                                </button>
                              )}
                              <button onClick={() => setEditingLesson(lesson.id)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100"><Pencil size={14} /></button>
                              <button onClick={() => deleteLesson(lesson.id, lesson.title)} className="grid h-7 w-7 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                            </div>
                            {isTyping && (
                              <div className="px-3 pb-3">
                                <TypingDrillEditor lesson={lesson} onChange={load} />
                              </div>
                            )}
                            {!isTyping && openQuiz[lesson.id] && (
                              <div className="px-3 pb-3">
                                <QuizManager lesson={lesson} onChange={load} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Dars qoʻshish */}
                  {addingLessonTo === section.id ? (
                    <div className="mt-3">
                      <LessonEditor sectionId={section.id} typing={isTyping} onDone={refresh} onCancel={() => setAddingLessonTo(null)} />
                    </div>
                  ) : (
                    <button onClick={() => setAddingLessonTo(section.id)} className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      <Plus size={15} /> Dars qoʻshish
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Boʻlim qoʻshish */}
      <div className="mt-4 flex gap-2">
        <input
          className="input"
          placeholder="Yangi boʻlim nomi (masalan: Kirish)"
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSection()}
        />
        <button onClick={addSection} disabled={addingSection} className="btn-primary shrink-0">
          {addingSection ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Boʻlim
        </button>
      </div>
    </div>
  );
}

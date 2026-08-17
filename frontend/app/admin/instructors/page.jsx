'use client';

// Eski "Ustozlar" sahifasi "Odamlar" (/admin/users) ichidagi rol yorligʻiga birlashtirildi.
import { useEffect } from 'react';

export default function RedirectInstructors() {
  // Toʻliq navigatsiya — shunda yangi sahifa mount boʻlganida manzil qatorida
  // ?role=INSTRUCTOR aniq turadi va rol yorligʻi oʻsha zahoti tanlanadi.
  useEffect(() => { window.location.replace('/admin/users?role=INSTRUCTOR'); }, []);
  return null;
}

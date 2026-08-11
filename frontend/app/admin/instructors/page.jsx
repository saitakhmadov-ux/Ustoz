'use client';

// Eski "Ustozlar" sahifasi "Odamlar" (/admin/users) ichidagi rol yorlig'iga birlashtirildi.
import { useEffect } from 'react';

export default function RedirectInstructors() {
  // To'liq navigatsiya — shunda yangi sahifa mount bo'lganida manzil qatorida
  // ?role=INSTRUCTOR aniq turadi va rol yorlig'i o'sha zahoti tanlanadi.
  useEffect(() => { window.location.replace('/admin/users?role=INSTRUCTOR'); }, []);
  return null;
}

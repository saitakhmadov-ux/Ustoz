'use client';

// Eski "Toʻlovlar" sahifasi "Moliya" (/admin/earnings) ichidagi yorliqqa birlashtirildi.
import { useEffect } from 'react';

export default function RedirectPayments() {
  useEffect(() => { window.location.replace('/admin/earnings?tab=payments'); }, []);
  return null;
}

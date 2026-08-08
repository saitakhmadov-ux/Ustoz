// Kategoriya va kurs so'rovlari uchun Zod sxemalari
const { z } = require('zod');

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const categorySchema = z.object({
  name: z.string({ required_error: 'Nom shart' }).min(2, 'Nom juda qisqa').max(60),
  slug: z.string().regex(slugRegex, 'Slug faqat kichik harf, raqam va tire').optional(),
  description: z.string().max(300).optional().nullable(),
  icon: z.string().max(20).optional().nullable(),
});

const courseSchema = z.object({
  title: z.string({ required_error: 'Sarlavha shart' }).min(3, 'Sarlavha juda qisqa').max(140),
  slug: z.string().regex(slugRegex, 'Slug faqat kichik harf, raqam va tire').optional(),
  description: z.string({ required_error: 'Tavsif shart' }).min(10, 'Tavsif juda qisqa'),
  thumbnail: z.string().url('Rasm URL noto\'g\'ri').optional().nullable().or(z.literal('')),
  authorName: z.string({ required_error: 'Muallif shart' }).min(2).max(80),
  price: z.number().int().min(0).default(0),
  isFree: z.boolean().default(false),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  // Foydalanish muddati (oy). null/bo'sh bo'lsa daraja bo'yicha standart qo'llanadi.
  accessMonths: z.number().int().min(1, 'Kamida 1 oy').max(60, 'Ko\'pi bilan 60 oy').optional().nullable(),
  // Kod maydoni (dasturlash kursi) yoqilganmi
  codePlayground: z.boolean().optional(),
  categoryId: z.string({ required_error: 'Kategoriya tanlanishi shart' }).min(1),
  published: z.boolean().optional(),
  instructorId: z.string().min(1).optional().nullable().or(z.literal('')),
});

module.exports = { categorySchema, courseSchema };

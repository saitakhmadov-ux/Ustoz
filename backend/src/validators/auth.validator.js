// Auth so'rovlari uchun Zod validatsiya sxemalari
const { z } = require('zod');

const registerSchema = z.object({
  fullName: z
    .string({ required_error: 'Ism-familiya kiritilishi shart' })
    .min(2, 'Ism kamida 2 belgidan iborat bo\'lsin')
    .max(80, 'Ism juda uzun'),
  email: z
    .string({ required_error: 'Email kiritilishi shart' })
    .email('Email formati noto\'g\'ri'),
  password: z
    .string({ required_error: 'Parol kiritilishi shart' })
    .min(6, 'Parol kamida 6 belgidan iborat bo\'lsin')
    .max(100, 'Parol juda uzun'),
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Email kiritilishi shart' }).email('Email formati noto\'g\'ri'),
  password: z.string({ required_error: 'Parol kiritilishi shart' }).min(1, 'Parol kiriting'),
});

module.exports = { registerSchema, loginSchema };

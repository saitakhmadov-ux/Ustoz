// Auth so'rovlari uchun Zod validatsiya sxemalari
const { z } = require('zod');

// Parol qoidasi: kamida 8 belgi va harf ham, raqam ham bo'lishi shart.
// Faqat yangi parollarga qo'llanadi — mavjud foydalanuvchilar avvalgi
// paroli bilan kiraveradi.
const passwordRule = z
  .string({ required_error: 'Parol kiritilishi shart' })
  .min(8, 'Parol kamida 8 belgidan iborat bo\'lsin')
  .max(100, 'Parol juda uzun')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: 'Parolda kamida bitta harf va bitta raqam bo\'lsin',
  });

const emailRule = z
  .string({ required_error: 'Email kiritilishi shart' })
  .trim()
  .toLowerCase()
  .email('Email formati noto\'g\'ri');

// 6 xonali tasdiqlash kodi
const codeRule = z
  .string({ required_error: 'Kod kiritilishi shart' })
  .trim()
  .regex(/^\d{6}$/, 'Kod 6 xonali raqam bo\'lishi kerak');

const registerSchema = z.object({
  fullName: z
    .string({ required_error: 'Ism-familiya kiritilishi shart' })
    .trim()
    .min(2, 'Ism kamida 2 belgidan iborat bo\'lsin')
    .max(80, 'Ism juda uzun'),
  email: emailRule,
  password: passwordRule,
});

const loginSchema = z.object({
  email: emailRule,
  password: z.string({ required_error: 'Parol kiritilishi shart' }).min(1, 'Parol kiriting'),
});

const verifyEmailSchema = z.object({ email: emailRule, code: codeRule });

const emailOnlySchema = z.object({ email: emailRule });

const resetPasswordSchema = z.object({
  email: emailRule,
  code: codeRule,
  password: passwordRule,
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  emailOnlySchema,
  resetPasswordSchema,
};

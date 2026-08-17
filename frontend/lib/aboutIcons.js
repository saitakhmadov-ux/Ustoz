// "Biz haqimizda" kartochkalari uchun ikonkalar.
// Backend faqat shu nomlarni qabul qiladi (settings.js -> ABOUT_ICONS),
// bu yerda nom lucide komponentiga bogʻlanadi.
import {
  Target, Heart, Users, GraduationCap, BookOpen, Award,
  Rocket, Star, Shield, Globe, Lightbulb, TrendingUp,
} from 'lucide-react';

export const ABOUT_ICONS = {
  Target, Heart, Users, GraduationCap, BookOpen, Award,
  Rocket, Star, Shield, Globe, Lightbulb, TrendingUp,
};

export const ABOUT_ICON_NAMES = Object.keys(ABOUT_ICONS);

export function aboutIcon(name) {
  return ABOUT_ICONS[name] || Target;
}

// "Kontaktlar" sahifasi kartochkalari uchun ikonkalar.
// Backend faqat shu nomlarni qabul qiladi (settings.js -> CONTACT_ICONS),
// bu yerda nom lucide komponentiga bogʻlanadi.
import {
  Mail, Phone, MapPin, Send, MessageCircle, Clock,
  Globe, Instagram, Youtube, Facebook, Building2, Headset,
} from 'lucide-react';

export const CONTACT_ICONS = {
  Mail, Phone, MapPin, Send, MessageCircle, Clock,
  Globe, Instagram, Youtube, Facebook, Building2, Headset,
};

export const CONTACT_ICON_NAMES = Object.keys(CONTACT_ICONS);

export function contactIcon(name) {
  return CONTACT_ICONS[name] || Mail;
}

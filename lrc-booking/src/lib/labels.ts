import type { BookingStatus, BookingType, Role } from '../types';

export const ROLE_LABEL: Record<Role, string> = {
  teacher: 'معلم',
  lrc_admin: 'مسؤول مركز المصادر',
  management: 'إدارة المدرسة',
};

export const BOOKING_TYPE_LABEL: Record<BookingType, string> = {
  lesson: 'حصة دراسية',
  activity: 'نشاط',
  workshop: 'مشغل',
  initiative: 'مبادرة',
  awareness: 'حملة توعية',
  other: 'أخرى',
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'بانتظار الموافقة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

export const SCHOOL_NAME = 'مدرسة الشيخ سعيد بن حمد الحارثي';
export const APP_NAME = 'مركز مصادر التعلم';
export const APP_SUBTITLE = 'نظام الحجز الإلكتروني';

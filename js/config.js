/**
 * CONFIG & API ENDPOINTS
 * Direct sync with Google Sheet ID: 1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA via Vercel Environment Variables
 */

const CONFIG = {
  GOOGLE_SHEET_ID: '1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA',
  MAX_SLOT_CAPACITY: 9,

  // Strict Vercel Serverless Endpoints
  API: {
    REGISTER: '/api/register',
    SCHEDULE: '/api/schedule'
  },

  // Course Types & Frequency Mapping
  STUDENT_TYPES: {
    'Cấp tốc': ['4 buổi/tuần', '5 buổi/tuần'],
    'Dài hạn': ['2 buổi/tuần', '3 buổi/tuần']
  },

  // Shifts / Time slots definition: Khung giờ 1 & Khung giờ 2
  DAYS: [
    { key: 'T2', label: 'Thứ 2' },
    { key: 'T3', label: 'Thứ 3' },
    { key: 'T4', label: 'Thứ 4' },
    { key: 'T5', label: 'Thứ 5' },
    { key: 'T6', label: 'Thứ 6' },
    { key: 'T7', label: 'Thứ 7' },
    { key: 'CN', label: 'Chủ Nhật' }
  ],

  SHIFTS: [
    { key: 'KG1', label: 'Khung giờ 1', time: '' },
    { key: 'KG2', label: 'Khung giờ 2', time: '' }
  ]
};

// Global Store
const state = {
  selectedSlots: [],
  targetSessionCount: 4,
  registrations: [],
  dropdownSlots: []
};

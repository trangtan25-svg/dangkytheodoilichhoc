/**
 * CONFIG & API ENDPOINTS
 * Direct sync with Google Sheet ID: 1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA via Vercel Environment Variables
 */

const CONFIG = {
  GOOGLE_SHEET_ID: '1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA',

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

  // Shifts / Time slots definition
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
    { key: 'Sang', label: 'Ca Sáng', time: '08h00 - 10h00' },
    { key: 'Chieu', label: 'Ca Chiều', time: '14h00 - 16h00' },
    { key: 'Toi', label: 'Ca Tối', time: '18h30 - 20h30' },
    { key: 'Muon', label: 'Ca Tối Muộn', time: '20h30 - 22h00' }
  ]
};

// Global Store
const state = {
  selectedSlots: [],
  targetSessionCount: 4,
  registrations: []
};

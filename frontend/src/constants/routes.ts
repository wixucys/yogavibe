export const ROUTES = {
  home: '/',
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    legacyLogin: '/login',
    legacyRegister: '/register',
  },
  user: {
    main: '/mentors',
    legacyMain: '/main',
  },
  booking: {
    create: (mentorId: string | number): string => `/booking/${mentorId}`,
    confirmation: '/booking/confirmation',
    legacyConfirmation: '/booking-confirmation',
  },
  mentor: {
    dashboard: '/mentor/dashboard',
    editProfile: '/mentor/profile/edit',
    profile: (mentorId: string | number): string => `/mentors/${mentorId}`,
    legacyProfile: (mentorId: string | number): string => `/mentor/${mentorId}`,
  },
  admin: {
    dashboard: '/admin/dashboard',
    mentors: '/admin/mentors',
  },
} as const;

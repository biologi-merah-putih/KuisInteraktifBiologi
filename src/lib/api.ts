// Type-safe API Client for Kuis Interaktif Biologi Kelas X

let currentToken: string = localStorage.getItem('bio_auth_token') || 'token-teacher-01';

export function setAuthToken(token: string) {
  currentToken = token;
  localStorage.setItem('bio_auth_token', token);
}

export function getAuthToken(): string {
  return currentToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  role: 'teacher' | 'admin' | 'reviewer';
  avatar?: string;
  xp?: number;
  level?: number;
  nip?: string | null;
  school_name?: string | null;
  created_at?: string;
  updated_at?: string;
  quiz_count?: number;
  classroom_count?: number;
  audit_count?: number;
}

export interface RoleAccount {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin' | 'reviewer';
  avatar?: string;
  xp?: number;
  level?: number;
  nip?: string | null;
  nis?: string | null;
  gender?: string | null;
  school_name?: string | null;
  best_score?: number | null;
  completed_quizzes?: number;
}

export interface RoleAccountsResponse {
  teachers: RoleAccount[];
  admins: RoleAccount[];
  reviewers: RoleAccount[];
  students: RoleAccount[];
  counts: {
    total: number;
    teachers: number;
    admins: number;
    reviewers: number;
    students: number;
  };
}

export const api = {
  // Auth
  async getRoleAccounts(): Promise<RoleAccountsResponse> {
    return request<RoleAccountsResponse>('/api/v1/auth/role-accounts');
  },

  async switchDemo(role: 'teacher' | 'student' | 'admin' | 'reviewer', studentIndex?: number) {
    const res = await request<{ token: string; user: any }>('/api/v1/auth/switch-demo', {
      method: 'POST',
      body: JSON.stringify({ role, studentIndex }),
    });
    setAuthToken(res.token);
    return res.user;
  },

  async switchUser(userId: string) {
    const res = await request<{ token: string; user: any }>('/api/v1/auth/switch-demo', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    setAuthToken(res.token);
    return res.user;
  },

  async login(email: string, password: string) {
    const res = await request<{ token: string; user: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    return res.user;
  },

  async getMe() {
    const res = await request<{ user: any }>('/api/v1/auth/me');
    return res.user;
  },

  async updateProfile(data: { full_name: string; email?: string; nip?: string; school_name?: string; avatar?: string }) {
    const res = await request<{ message: string; user: any }>('/api/v1/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  },

  // Staff Management (Guru, Admin, Reviewer)
  async getStaffList(): Promise<StaffUser[]> {
    return request<StaffUser[]>('/api/v1/staff');
  },

  async createStaff(data: {
    full_name: string;
    email: string;
    role: 'teacher' | 'admin' | 'reviewer';
    nip?: string;
    school_name?: string;
    avatar?: string;
    password?: string;
  }) {
    return request<{ message: string; user: StaffUser }>('/api/v1/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStaff(id: string, data: {
    full_name: string;
    email?: string;
    role?: 'teacher' | 'admin' | 'reviewer';
    nip?: string;
    school_name?: string;
    avatar?: string;
    password?: string;
  }) {
    return request<{ message: string; user: StaffUser }>(`/api/v1/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStaff(id: string) {
    return request<{ message: string; deletedId: string }>(`/api/v1/staff/${id}`, {
      method: 'DELETE',
    });
  },

  // Curriculum & Materials
  async getTopics() {
    return request<any[]>('/api/v1/biology/topics');
  },

  async getMaterials() {
    return request<any[]>('/api/v1/materials');
  },

  async getMaterial(id: string) {
    return request<any>(`/api/v1/materials/${id}`);
  },

  // Questions Bank
  async getQuestions(filters: Record<string, string> = {}) {
    const params = new URLSearchParams(filters);
    return request<any[]>(`/api/v1/questions?${params.toString()}`);
  },

  async createQuestion(questionData: any) {
    return request<{ id: string; message: string }>('/api/v1/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
  },

  async approveQuestion(questionId: string) {
    return request<{ message: string }>(`/api/v1/questions/${questionId}/approve`, {
      method: 'POST',
    });
  },

  // Classrooms
  async getClassrooms() {
    return request<any[]>('/api/v1/classrooms');
  },

  async createClassroom(data: { name: string; academic_year: string; description?: string }) {
    return request<any>('/api/v1/classrooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async joinClassroom(code: string) {
    return request<any>('/api/v1/classrooms/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  // Quizzes
  async getQuizzes() {
    return request<any[]>('/api/v1/quizzes');
  },

  async createQuiz(quizData: any) {
    return request<any>('/api/v1/quizzes', {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
  },

  async batchCreateQuizzes(data: { classroom_id?: string; quizzes: any[] }) {
    return request<{ message: string; quizIds: string[]; count: number }>('/api/v1/quizzes/batch-create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getQuiz(quizId: string) {
    return request<any>(`/api/v1/quizzes/${quizId}`);
  },

  async updateQuiz(quizId: string, data: {
    title: string;
    description?: string;
    duration_minutes?: number;
    passing_score?: number;
    max_attempts?: number;
    classroom_id?: string;
    topic_id?: string;
    question_ids?: string[];
  }) {
    return request<{ message: string; quiz: any }>(`/api/v1/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteQuiz(quizId: string) {
    return request<{ message: string; deletedId: string }>(`/api/v1/quizzes/${quizId}`, {
      method: 'DELETE',
    });
  },

  // Quiz Taking Engine
  async startAttempt(quizId: string) {
    return request<{ attemptId: string; durationMinutes: number; timeLimitAt: string; message: string }>(
      `/api/v1/quizzes/${quizId}/attempts`,
      { method: 'POST' }
    );
  },

  async getAttempt(attemptId: string) {
    return request<any>(`/api/v1/attempts/${attemptId}`);
  },

  async saveAnswer(attemptId: string, questionId: string, answerData: any) {
    return request<{ success: boolean; savedAt: string }>(
      `/api/v1/attempts/${attemptId}/answers/${questionId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ answerData }),
      }
    );
  },

  async submitAttempt(attemptId: string) {
    return request<any>(`/api/v1/attempts/${attemptId}/submit`, {
      method: 'POST',
    });
  },

  async getAttemptResult(attemptId: string) {
    return request<any>(`/api/v1/attempts/${attemptId}/result`);
  },

  // Teacher Essay Grading
  async getPendingEssays() {
    return request<any[]>('/api/v1/teacher/pending-essays');
  },

  async gradeEssay(answerId: string, pointsEarned: number, feedback: string) {
    return request<any>('/api/v1/teacher/grade-essay', {
      method: 'POST',
      body: JSON.stringify({ answerId, pointsEarned, feedback }),
    });
  },

  // AI Service
  async askAiTutor(message: string, topicTitle?: string, curriculumContext?: string) {
    return request<{ reply: string; latencyMs: number; model: string }>('/api/v1/ai/tutor', {
      method: 'POST',
      body: JSON.stringify({ message, topicTitle, curriculumContext }),
    });
  },

  async generateQuestionDraft(params: any) {
    return request<any>('/api/v1/ai/generate-question', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async evaluateEssayWithAi(params: { questionText: string; rubricJson: any; studentAnswer: string }) {
    return request<any>('/api/v1/ai/evaluate-essay', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getAiStatus() {
    return request<{ configured: boolean; model: string; totalCalls: number; avgLatencyMs: number }>('/api/v1/ai/status');
  },

  // Analytics
  async getStudentAnalytics() {
    return request<any>('/api/v1/analytics/student');
  },

  async getTeacherAnalytics() {
    return request<any>('/api/v1/analytics/teacher');
  },

  async getLeaderboard() {
    return request<any[]>('/api/v1/gamification/leaderboard');
  },

  getExportUrl(quizId: string) {
    return `/api/v1/reports/export/quiz/${quizId}`;
  },

  // Classroom Roster & PDF Reports (35 Siswa)
  async getClassroomStudents(classroomId: string = 'cls-x-a', quizId: string = 'quiz-bio-4tipe') {
    return request<any>(`/api/v1/classroom/students?classroom_id=${classroomId}&quiz_id=${quizId}`);
  },

  async batchImportStudents(students: Array<{ name: string; nis?: string; gender?: string }>, classroomId: string = 'cls-x-a', generateScores: boolean = true) {
    return request<{ message: string }>('/api/v1/classroom/students/batch', {
      method: 'POST',
      body: JSON.stringify({ classroomId, students, generateScores }),
    });
  },

  async reset35Students() {
    return request<{ message: string }>('/api/v1/classroom/students/reset-35', {
      method: 'POST',
    });
  },

  async addStudent(data: { name: string; nis?: string; gender?: string; classroomId?: string }) {
    return request<{ message: string; studentId: string }>('/api/v1/classroom/students/add', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStudent(id: string, data: {
    name: string;
    nis?: string;
    gender?: string;
    email?: string;
    pg?: number;
    bs?: number;
    jd?: number;
    es?: number;
    teacher_feedback?: string;
  }) {
    return request<{ message: string; studentId: string }>(`/api/v1/classroom/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStudent(id: string) {
    return request<{ message: string }>(`/api/v1/classroom/students/${id}`, {
      method: 'DELETE',
    });
  },

  async getAttemptPdfData(attemptId: string) {
    return request<any>(`/api/v1/reports/attempt/${attemptId}/pdf-data`);
  },
};

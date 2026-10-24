import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { getDb, query, queryOne, run, transaction, seed35StudentsInternal } from './src/server/db.js';
import { askAiTutor, generateQuestionDraft, evaluateEssayDraft, getAiClient } from './src/server/ai.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Token management in-memory map (sessionId -> userId)
const sessions = new Map<string, string>();

// Seed default session tokens for quick instant login
sessions.set('token-teacher-01', 'usr-teacher-01');
sessions.set('token-usr-teacher-01', 'usr-teacher-01');
sessions.set('token-student-01', 'usr-student-01');
sessions.set('token-usr-student-01', 'usr-student-01');
sessions.set('token-student-02', 'usr-student-02');
sessions.set('token-usr-student-02', 'usr-student-02');
sessions.set('token-admin-01', 'usr-admin-01');
sessions.set('token-usr-admin-01', 'usr-admin-01');
sessions.set('token-reviewer-01', 'usr-reviewer-01');
sessions.set('token-usr-reviewer-01', 'usr-reviewer-01');

interface AuthRequest extends Request {
  user?: any;
}

// Authentication middleware
function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autentikasi diperlukan. Sesi tidak ditemukan.' });
  }
  const token = authHeader.substring(7);
  const userId = sessions.get(token);
  if (!userId) {
    return res.status(401).json({ error: 'Sesi telah kedaluwarsa atau tidak valid.' });
  }
  const user = queryOne('SELECT id, email, full_name, role, avatar, xp, level, nis, gender, nip, school_name FROM users WHERE id = ?;', [userId]);
  if (!user) {
    return res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
  }
  req.user = user;
  next();
}

function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak. Peran Anda tidak memiliki izin untuk tindakan ini.' });
    }
    next();
  };
}

// ==========================================
// 1. AUTHENTICATION & DEMO ROLES
// ==========================================

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }
  const user = queryOne('SELECT * FROM users WHERE email = ?;', [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Kredensial salah. Email atau password tidak cocok.' });
  }

  const token = `token-${user.id}-${Date.now()}`;
  sessions.set(token, user.id);

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.post('/api/v1/auth/switch-demo', (req, res) => {
  const { role, studentIndex, userId } = req.body;
  let targetId = 'usr-student-01';
  if (userId) targetId = userId;
  else if (role === 'teacher') targetId = 'usr-teacher-01';
  else if (role === 'admin') targetId = 'usr-admin-01';
  else if (role === 'reviewer') targetId = 'usr-reviewer-01';
  else if (role === 'student' && studentIndex === 2) targetId = 'usr-student-02';

  const user = queryOne('SELECT id, email, full_name, role, avatar, xp, level, nis, gender, nip, school_name FROM users WHERE id = ?;', [targetId]);
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

  const token = `token-${targetId}`;
  sessions.set(token, targetId);

  res.json({ token, user });
});

app.get('/api/v1/auth/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// Get all verified role accounts in the system (Guru, Admin, Reviewer, and Siswa)
app.get('/api/v1/auth/role-accounts', (req, res) => {
  try {
    // 1. Staff users (Guru, Admin, Reviewer)
    const staff = query(`
      SELECT id, email, full_name, role, avatar, xp, level, nip, school_name, created_at
      FROM users
      WHERE role IN ('teacher', 'admin', 'reviewer')
      ORDER BY 
        CASE role 
          WHEN 'teacher' THEN 1 
          WHEN 'admin' THEN 2 
          WHEN 'reviewer' THEN 3 
          ELSE 4 
        END,
        full_name ASC;
    `);

    // 2. Students registered in the system / classroom
    const students = query(`
      SELECT u.id, u.email, u.full_name, u.role, u.avatar, u.xp, u.level, u.nis, u.gender,
             (SELECT qa.score FROM quiz_attempts qa WHERE qa.student_id = u.id AND qa.status = 'evaluated' ORDER BY qa.score DESC LIMIT 1) as best_score,
             (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.student_id = u.id AND qa.status = 'evaluated') as completed_quizzes
      FROM users u
      WHERE u.role = 'student'
      ORDER BY u.nis ASC, u.full_name ASC;
    `);

    const teachers = staff.filter(s => s.role === 'teacher');
    const admins = staff.filter(s => s.role === 'admin');
    const reviewers = staff.filter(s => s.role === 'reviewer');

    res.json({
      teachers,
      admins,
      reviewers,
      students,
      counts: {
        total: staff.length + students.length,
        teachers: teachers.length,
        admins: admins.length,
        reviewers: reviewers.length,
        students: students.length,
      }
    });
  } catch (err: any) {
    console.error('Error fetching role accounts:', err);
    res.status(500).json({ error: 'Gagal memuat daftar akun peran: ' + err.message });
  }
});

// Update Teacher / User Profile
app.put('/api/v1/auth/profile', authMiddleware, (req: AuthRequest, res) => {
  const { full_name, email, nip, school_name, avatar } = req.body;
  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Nama akun guru / pengampu wajib diisi.' });
  }

  const userId = req.user.id;
  const cleanName = full_name.trim();
  const cleanEmail = email && email.trim() ? email.trim() : null;
  const cleanNip = nip !== undefined ? (nip.trim() || null) : null;
  const cleanSchool = school_name !== undefined ? (school_name.trim() || null) : null;
  const cleanAvatar = avatar && avatar.trim() ? avatar.trim() : null;

  try {
    // If email is provided and different, check unique constraint
    if (cleanEmail && cleanEmail !== req.user.email) {
      const existing = queryOne('SELECT id FROM users WHERE email = ? AND id != ?;', [cleanEmail, userId]);
      if (existing) {
        return res.status(400).json({ error: 'Email tersebut sudah digunakan oleh akun lain.' });
      }
    }

    run(`
      UPDATE users 
      SET full_name = ?,
          email = COALESCE(?, email),
          nip = COALESCE(?, nip),
          school_name = COALESCE(?, school_name),
          avatar = COALESCE(?, avatar),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `, [cleanName, cleanEmail, cleanNip, cleanSchool, cleanAvatar, userId]);

    const updatedUser = queryOne(
      'SELECT id, email, full_name, role, avatar, xp, level, nis, gender, nip, school_name FROM users WHERE id = ?;',
      [userId]
    );

    res.json({
      message: 'Profil akun guru berhasil diperbarui.',
      user: updatedUser,
    });
  } catch (err: any) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Gagal menyimpan pembaruan profil: ' + err.message });
  }
});

// ==========================================
// 1.1 STAFF MANAGEMENT (GURU, ADMIN, REVIEWER)
// ==========================================

// Get all staff users (Guru, Admin, Reviewer)
app.get('/api/v1/staff', authMiddleware, (req: AuthRequest, res) => {
  try {
    const staffList = query(`
      SELECT 
        u.id, u.email, u.full_name, u.role, u.avatar, u.xp, u.level, u.nip, u.school_name, u.created_at, u.updated_at,
        (SELECT COUNT(*) FROM quizzes q WHERE q.teacher_id = u.id) as quiz_count,
        (SELECT COUNT(*) FROM classrooms c WHERE c.teacher_id = u.id) as classroom_count,
        (SELECT COUNT(*) FROM audit_logs a WHERE a.user_id = u.id) as audit_count
      FROM users u
      WHERE u.role IN ('teacher', 'admin', 'reviewer')
      ORDER BY 
        CASE u.role 
          WHEN 'admin' THEN 1 
          WHEN 'teacher' THEN 2 
          WHEN 'reviewer' THEN 3 
          ELSE 4 
        END,
        u.full_name ASC;
    `);
    res.json(staffList);
  } catch (err: any) {
    console.error('Error fetching staff list:', err);
    res.status(500).json({ error: 'Gagal memuat data staf: ' + err.message });
  }
});

// Create new staff member (Guru, Admin, or Reviewer)
app.post('/api/v1/staff', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { full_name, email, role, nip, school_name, avatar, password } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Nama lengkap staf wajib diisi.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email staf wajib diisi.' });
    }
    const cleanRole = (role || '').trim().toLowerCase();
    if (!['teacher', 'admin', 'reviewer'].includes(cleanRole)) {
      return res.status(400).json({ error: 'Peran staf tidak valid. Pilih salah satu: Guru (teacher), Admin (admin), atau Reviewer (reviewer).' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();
    const cleanNip = nip && nip.trim() ? nip.trim() : null;
    const cleanSchool = school_name && school_name.trim() ? school_name.trim() : (cleanRole === 'teacher' ? 'SMA Negeri 1 Teladan' : 'Dinas Pendidikan / Instansi');
    const cleanAvatar = avatar && avatar.trim() ? avatar.trim() : (
      cleanRole === 'teacher' 
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' 
        : cleanRole === 'admin' 
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' 
        : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    );

    // Check unique email
    const existing = queryOne('SELECT id FROM users WHERE email = ?;', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: `Email "${cleanEmail}" sudah terdaftar pada akun lain.` });
    }

    const newId = `usr-${cleanRole}-${Date.now().toString(36)}`;
    const salt = bcrypt.genSaltSync(10);
    const passHash = bcrypt.hashSync(password && password.trim() ? password.trim() : 'Biologi2026!', salt);

    run(`
      INSERT INTO users (id, email, password_hash, full_name, role, avatar, xp, level, nip, school_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      newId,
      cleanEmail,
      passHash,
      cleanName,
      cleanRole,
      cleanAvatar,
      cleanRole === 'teacher' ? 1000 : cleanRole === 'admin' ? 2500 : 1500,
      cleanRole === 'teacher' ? 5 : cleanRole === 'admin' ? 10 : 7,
      cleanNip,
      cleanSchool
    ]);

    // Pre-seed session token for instant testing
    sessions.set(`token-${newId}`, newId);

    // Audit log
    try {
      run(`
        INSERT INTO audit_logs (id, user_id, action, resource, details)
        VALUES (?, ?, 'CREATE_STAFF', 'users', ?);
      `, [
        `aud-${Date.now().toString(36)}`,
        req.user.id,
        JSON.stringify({ created_id: newId, name: cleanName, role: cleanRole, email: cleanEmail })
      ]);
    } catch {}

    const createdUser = queryOne(
      'SELECT id, email, full_name, role, avatar, xp, level, nip, school_name, created_at FROM users WHERE id = ?;',
      [newId]
    );

    res.status(201).json({
      message: `Akun ${cleanRole === 'teacher' ? 'Guru' : cleanRole === 'admin' ? 'Administrator' : 'Reviewer'} "${cleanName}" berhasil ditambahkan.`,
      user: createdUser,
    });
  } catch (err: any) {
    console.error('Error creating staff:', err);
    res.status(500).json({ error: 'Gagal menambahkan data staf: ' + err.message });
  }
});

// Update staff member
app.put('/api/v1/staff/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const targetId = req.params.id;
    const existing = queryOne('SELECT * FROM users WHERE id = ?;', [targetId]);
    if (!existing) {
      return res.status(404).json({ error: 'Pengguna staf tidak ditemukan.' });
    }

    const { full_name, email, role, nip, school_name, avatar, password } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Nama staf tidak boleh kosong.' });
    }

    let targetRole = existing.role;
    if (role && ['teacher', 'admin', 'reviewer'].includes(role.trim().toLowerCase())) {
      targetRole = role.trim().toLowerCase();
    }

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : existing.email;
    if (cleanEmail !== existing.email) {
      const emailInUse = queryOne('SELECT id FROM users WHERE email = ? AND id != ?;', [cleanEmail, targetId]);
      if (emailInUse) {
        return res.status(400).json({ error: `Email "${cleanEmail}" sudah digunakan oleh akun lain.` });
      }
    }

    const cleanName = full_name.trim();
    const cleanNip = nip !== undefined ? (nip ? nip.trim() : null) : existing.nip;
    const cleanSchool = school_name !== undefined ? (school_name ? school_name.trim() : null) : existing.school_name;
    const cleanAvatar = avatar && avatar.trim() ? avatar.trim() : existing.avatar;

    let newPassHash = existing.password_hash;
    if (password && password.trim()) {
      const salt = bcrypt.genSaltSync(10);
      newPassHash = bcrypt.hashSync(password.trim(), salt);
    }

    run(`
      UPDATE users 
      SET full_name = ?,
          email = ?,
          role = ?,
          nip = ?,
          school_name = ?,
          avatar = ?,
          password_hash = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `, [cleanName, cleanEmail, targetRole, cleanNip, cleanSchool, cleanAvatar, newPassHash, targetId]);

    // Audit log
    try {
      run(`
        INSERT INTO audit_logs (id, user_id, action, resource, details)
        VALUES (?, ?, 'UPDATE_STAFF', 'users', ?);
      `, [
        `aud-${Date.now().toString(36)}`,
        req.user.id,
        JSON.stringify({ target_id: targetId, name: cleanName, role: targetRole, email: cleanEmail })
      ]);
    } catch {}

    const updatedUser = queryOne(
      'SELECT id, email, full_name, role, avatar, xp, level, nip, school_name, created_at, updated_at FROM users WHERE id = ?;',
      [targetId]
    );

    res.json({
      message: `Data staf "${cleanName}" berhasil diperbarui.`,
      user: updatedUser,
    });
  } catch (err: any) {
    console.error('Error updating staff:', err);
    res.status(500).json({ error: 'Gagal memperbarui data staf: ' + err.message });
  }
});

// Delete staff member
app.delete('/api/v1/staff/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const targetId = req.params.id;

    // Safety 1: Prevent self-deletion
    if (req.user && req.user.id === targetId) {
      return res.status(400).json({
        error: 'Tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan. Silakan beralih ke akun lain terlebih dahulu jika ingin menghapus akun ini.'
      });
    }

    const targetUser = queryOne('SELECT * FROM users WHERE id = ?;', [targetId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Pengguna staf tidak ditemukan.' });
    }

    if (!['teacher', 'admin', 'reviewer'].includes(targetUser.role)) {
      return res.status(400).json({ error: 'Endpoint ini khusus untuk menghapus data staf (Guru, Admin, Reviewer).' });
    }

    // Safety 2: Ensure at least 1 Admin remains
    if (targetUser.role === 'admin') {
      const adminCount = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'admin';")?.count || 0;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Tidak dapat menghapus admin terakhir. Sistem membutuhkan minimal satu Administrator aktif.' });
      }
    }

    // Safety 3: Ensure at least 1 Teacher remains
    if (targetUser.role === 'teacher') {
      const teacherCount = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'teacher';")?.count || 0;
      if (teacherCount <= 1) {
        return res.status(400).json({ error: 'Tidak dapat menghapus guru terakhir. Sistem membutuhkan minimal satu Guru aktif.' });
      }
      
      // Reassign quizzes and classrooms to another teacher so relational integrity stays intact
      const fallbackTeacher = queryOne("SELECT id FROM users WHERE role = 'teacher' AND id != ? LIMIT 1;", [targetId]);
      if (fallbackTeacher) {
        run('UPDATE quizzes SET teacher_id = ? WHERE teacher_id = ?;', [fallbackTeacher.id, targetId]);
        run('UPDATE classrooms SET teacher_id = ? WHERE teacher_id = ?;', [fallbackTeacher.id, targetId]);
      }
    }

    // Clean up references
    try {
      run('UPDATE learning_materials SET created_by = NULL WHERE created_by = ?;', [targetId]);
      run('UPDATE question_reviews SET reviewer_id = NULL WHERE reviewer_id = ?;', [targetId]);
      run('DELETE FROM classroom_members WHERE user_id = ?;', [targetId]);
      run('DELETE FROM user_achievements WHERE user_id = ?;', [targetId]);
      run('DELETE FROM xp_events WHERE user_id = ?;', [targetId]);
    } catch (e) {
      console.warn('Foreign key cleanup notice:', e);
    }

    // Perform delete
    run('DELETE FROM users WHERE id = ?;', [targetId]);

    // Invalidate sessions for targetId
    for (const [token, uid] of sessions.entries()) {
      if (uid === targetId) {
        sessions.delete(token);
      }
    }

    // Audit log
    try {
      run(`
        INSERT INTO audit_logs (id, user_id, action, resource, details)
        VALUES (?, ?, 'DELETE_STAFF', 'users', ?);
      `, [
        `aud-${Date.now().toString(36)}`,
        req.user.id,
        JSON.stringify({ deleted_id: targetId, name: targetUser.full_name, role: targetUser.role })
      ]);
    } catch {}

    res.json({
      message: `Akun ${targetUser.role === 'teacher' ? 'Guru' : targetUser.role === 'admin' ? 'Administrator' : 'Reviewer'} "${targetUser.full_name}" berhasil dihapus.`,
      deletedId: targetId,
    });
  } catch (err: any) {
    console.error('Error deleting staff:', err);
    res.status(500).json({ error: 'Gagal menghapus data staf: ' + err.message });
  }
});

// ==========================================
// 2. CURRICULUM, TOPICS & MATERIALS
// ==========================================

app.get('/api/v1/curricula', (req, res) => {
  const curricula = query('SELECT * FROM curricula WHERE is_active = 1;');
  res.json(curricula);
});

app.get('/api/v1/biology/topics', (req, res) => {
  const topics = query(`
    SELECT t.*,
      (SELECT COUNT(*) FROM learning_objectives lo WHERE lo.topic_id = t.id) as objective_count,
      (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND q.status = 'approved') as question_count,
      (SELECT id FROM learning_materials lm WHERE lm.topic_id = t.id LIMIT 1) as material_id
    FROM topics t
    ORDER BY t.order_num ASC;
  `);
  res.json(topics);
});

app.get('/api/v1/materials', (req, res) => {
  const materials = query(`
    SELECT lm.id, lm.topic_id, lm.title, lm.summary, lm.key_terms, lm.source_reference, lm.verified_status,
           t.title as topic_title, t.code as topic_code
    FROM learning_materials lm
    JOIN topics t ON lm.topic_id = t.id
    ORDER BY t.order_num ASC;
  `);
  res.json(materials);
});

app.get('/api/v1/materials/:id', (req, res) => {
  const material = queryOne(`
    SELECT lm.*, t.title as topic_title, t.code as topic_code, t.image_url as topic_image
    FROM learning_materials lm
    JOIN topics t ON lm.topic_id = t.id
    WHERE lm.id = ?;
  `, [req.params.id]);

  if (!material) return res.status(404).json({ error: 'Materi pembelajaran tidak ditemukan.' });

  // Get learning objectives for this topic
  const objectives = query(`
    SELECT * FROM learning_objectives WHERE topic_id = ? ORDER BY code ASC;
  `, [material.topic_id]);

  res.json({ ...material, objectives });
});

// ==========================================
// 3. QUESTION BANK (BANK SOAL)
// ==========================================

app.get('/api/v1/questions', authMiddleware, (req: AuthRequest, res) => {
  const { topic_id, question_type, cognitive_level, status } = req.query;
  let sqlStr = `
    SELECT q.*, t.title as topic_title, lo.code as objective_code, u.full_name as author_name
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN learning_objectives lo ON q.objective_id = lo.id
    LEFT JOIN users u ON q.author_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (topic_id) {
    sqlStr += ` AND q.topic_id = ?`;
    params.push(topic_id);
  }
  if (question_type) {
    sqlStr += ` AND q.question_type = ?`;
    params.push(question_type);
  }
  if (cognitive_level) {
    sqlStr += ` AND q.cognitive_level = ?`;
    params.push(cognitive_level);
  }

  // Student can only see approved questions and NEVER gets answer keys in this list
  if (req.user.role === 'student') {
    sqlStr += ` AND q.status = 'approved'`;
  } else if (status) {
    sqlStr += ` AND q.status = ?`;
    params.push(status);
  }

  sqlStr += ` ORDER BY q.created_at DESC;`;

  const rows = query(sqlStr, params);
  const sanitized = rows.map(r => {
    const parsedOptions = r.options_json ? JSON.parse(r.options_json) : null;
    if (req.user.role === 'student') {
      const { answer_key_json, ...rest } = r;
      return { ...rest, options: parsedOptions };
    }
    return {
      ...r,
      options: parsedOptions,
      answer_key: JSON.parse(r.answer_key_json),
      distractor_rationale: r.distractor_rationale_json ? JSON.parse(r.distractor_rationale_json) : null,
      rubric: r.rubric_json ? JSON.parse(r.rubric_json) : null,
    };
  });

  res.json(sanitized);
});

app.post('/api/v1/questions', authMiddleware, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
  const {
    topic_id, objective_id, question_type, cognitive_level, difficulty,
    stimulus, question_text, options, answer_key, explanation, distractor_rationale, rubric, source_ref, status
  } = req.body;

  if (!topic_id || !objective_id || !question_type || !cognitive_level || !difficulty || !question_text || !answer_key || !explanation || !source_ref) {
    return res.status(400).json({ error: 'Semua field wajib soal biologi harus diisi lengkap.' });
  }

  const id = `qst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const finalStatus = status || 'draft';

  run(`
    INSERT INTO questions (
      id, topic_id, objective_id, question_type, cognitive_level, difficulty,
      stimulus, question_text, options_json, answer_key_json, explanation,
      distractor_rationale_json, rubric_json, source_ref, status, author_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    id, topic_id, objective_id, question_type, cognitive_level, difficulty,
    stimulus || null, question_text,
    options ? JSON.stringify(options) : null,
    JSON.stringify(answer_key),
    explanation,
    distractor_rationale ? JSON.stringify(distractor_rationale) : null,
    rubric ? JSON.stringify(rubric) : null,
    source_ref,
    finalStatus,
    req.user.id
  ]);

  res.status(201).json({ id, message: 'Soal biologi berhasil disimpan.' });
});

app.post('/api/v1/questions/:id/approve', authMiddleware, requireRole('reviewer', 'admin'), (req: AuthRequest, res) => {
  const question = queryOne('SELECT id FROM questions WHERE id = ?;', [req.params.id]);
  if (!question) return res.status(404).json({ error: 'Soal tidak ditemukan.' });

  run('UPDATE questions SET status = ?, reviewer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [
    'approved', req.user.id, req.params.id
  ]);

  res.json({ message: 'Soal telah disetujui (Approved) dan dapat digunakan dalam kuis resmi.' });
});

// ==========================================
// 4. CLASSROOMS
// ==========================================

app.get('/api/v1/classrooms', authMiddleware, (req: AuthRequest, res) => {
  let classrooms;
  if (req.user.role === 'teacher') {
    classrooms = query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM classroom_members cm WHERE cm.classroom_id = c.id) as student_count,
        (SELECT COUNT(*) FROM quizzes q WHERE q.classroom_id = c.id) as quiz_count
      FROM classrooms c
      WHERE c.teacher_id = ?
      ORDER BY c.created_at DESC;
    `, [req.user.id]);
  } else {
    classrooms = query(`
      SELECT c.*, u.full_name as teacher_name,
        (SELECT COUNT(*) FROM classroom_members cm WHERE cm.classroom_id = c.id) as student_count
      FROM classrooms c
      JOIN classroom_members cm ON cm.classroom_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE cm.user_id = ?
      ORDER BY c.created_at DESC;
    `, [req.user.id]);
  }
  res.json(classrooms);
});

app.post('/api/v1/classrooms', authMiddleware, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
  const { name, academic_year, description } = req.body;
  if (!name || !academic_year) {
    return res.status(400).json({ error: 'Nama kelas dan tahun ajaran wajib diisi.' });
  }

  const id = `cls-${Date.now()}`;
  const code = `BIO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  run(`
    INSERT INTO classrooms (id, name, code, teacher_id, academic_year, description)
    VALUES (?, ?, ?, ?, ?, ?);
  `, [id, name, code, req.user.id, academic_year, description || '']);

  res.status(201).json({ id, code, message: 'Kelas berhasil dibuat.' });
});

app.post('/api/v1/classrooms/join', authMiddleware, requireRole('student'), (req: AuthRequest, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Kode undangan kelas wajib diisi.' });

  const classroom = queryOne('SELECT id, name FROM classrooms WHERE UPPER(code) = UPPER(?);', [code.trim()]);
  if (!classroom) return res.status(404).json({ error: 'Kode kelas tidak valid.' });

  const existing = queryOne('SELECT id FROM classroom_members WHERE classroom_id = ? AND user_id = ?;', [classroom.id, req.user.id]);
  if (existing) return res.status(400).json({ error: 'Anda sudah terdaftar dalam kelas ini.' });

  run('INSERT INTO classroom_members (id, classroom_id, user_id) VALUES (?, ?, ?);', [
    `cm-${Date.now()}`, classroom.id, req.user.id
  ]);

  res.json({ message: `Berhasil bergabung dengan kelas ${classroom.name}` });
});

// ==========================================
// 5. QUIZZES & ASSESSMENT ENGINE
// ==========================================

app.get('/api/v1/quizzes', authMiddleware, (req: AuthRequest, res) => {
  let quizzes;
  if (req.user.role === 'teacher') {
    quizzes = query(`
      SELECT q.*, c.name as classroom_name, t.title as topic_title,
        (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count,
        (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.status IN ('submitted', 'evaluated')) as completed_attempts
      FROM quizzes q
      LEFT JOIN classrooms c ON q.classroom_id = c.id
      LEFT JOIN topics t ON q.topic_id = t.id
      WHERE q.teacher_id = ?
      ORDER BY q.created_at DESC;
    `, [req.user.id]);
  } else {
    // For student: list published quizzes in their classes
    quizzes = query(`
      SELECT q.id, q.title, q.description, q.duration_minutes, q.max_attempts, q.passing_score,
             q.status, q.show_discussion_after, c.name as classroom_name, t.title as topic_title,
             (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count,
             (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = ?) as user_attempt_count,
             (SELECT MAX(qa.score) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = ? AND qa.status = 'evaluated') as best_score
      FROM quizzes q
      JOIN classroom_members cm ON q.classroom_id = cm.classroom_id
      LEFT JOIN classrooms c ON q.classroom_id = c.id
      LEFT JOIN topics t ON q.topic_id = t.id
      WHERE cm.user_id = ? AND q.status = 'published'
      ORDER BY q.created_at DESC;
    `, [req.user.id, req.user.id, req.user.id]);
  }
  res.json(quizzes);
});

app.post('/api/v1/quizzes', authMiddleware, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
  const {
    classroom_id, topic_id, title, description, duration_minutes,
    max_attempts, passing_score, shuffle_questions, shuffle_options, question_ids
  } = req.body;

  if (!title || !question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
    return res.status(400).json({ error: 'Judul kuis dan minimal 1 butir soal wajib disertakan.' });
  }

  const quizId = `quiz-${Date.now()}`;
  transaction(() => {
    run(`
      INSERT INTO quizzes (
        id, classroom_id, teacher_id, topic_id, title, description,
        duration_minutes, max_attempts, passing_score, shuffle_questions, shuffle_options, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published');
    `, [
      quizId, classroom_id || null, req.user.id, topic_id || null, title, description || '',
      duration_minutes || 30, max_attempts || 1, passing_score || 75,
      shuffle_questions ? 1 : 0, shuffle_options ? 1 : 0
    ]);

    const pointPerQuestion = Math.round(100 / question_ids.length);
    question_ids.forEach((qid: string, idx: number) => {
      run(`
        INSERT INTO quiz_questions (id, quiz_id, question_id, order_num, points)
        VALUES (?, ?, ?, ?, ?);
      `, [`qq-${quizId}-${idx}`, quizId, qid, idx + 1, pointPerQuestion]);
    });
  });

  res.status(201).json({ id: quizId, message: 'Kuis berhasil dibuat dan dipublikasikan.' });
});

// Batch create quizzes (Pilih berapa jumlah kuis yang akan dibuat)
app.post('/api/v1/quizzes/batch-create', authMiddleware, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
  const { classroom_id, quizzes } = req.body;
  if (!Array.isArray(quizzes) || quizzes.length === 0) {
    return res.status(400).json({ error: 'Daftar paket kuis tidak boleh kosong.' });
  }

  const createdQuizIds: string[] = [];

  try {
    transaction(() => {
      quizzes.forEach((qz: any, qIdx: number) => {
        const quizId = `quiz-${Date.now()}-${qIdx}-${Math.random().toString(36).substring(2, 6)}`;
        const title = qz.title || `Kuis Asesmen Biologi Paket ${String.fromCharCode(65 + qIdx)}`;
        const desc = qz.description || 'Kuis asesmen terstruktur Biologi Kelas X Fase E';
        const duration = Number(qz.duration_minutes) || 30;
        const passing = Number(qz.passing_score) || 75;
        const maxAtt = Number(qz.max_attempts) || 1;
        const topicId = qz.topic_id || null;
        const questionIds = Array.isArray(qz.question_ids) ? qz.question_ids : [];

        run(`
          INSERT INTO quizzes (
            id, classroom_id, teacher_id, topic_id, title, description,
            duration_minutes, max_attempts, passing_score, shuffle_questions, shuffle_options, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'published');
        `, [
          quizId,
          classroom_id || qz.classroom_id || 'cls-x-a',
          req.user.id,
          topicId,
          title,
          desc,
          duration,
          maxAtt,
          passing
        ]);

        if (questionIds.length > 0) {
          const pointPerQ = Math.round(100 / questionIds.length);
          questionIds.forEach((qid: string, idx: number) => {
            run(`
              INSERT INTO quiz_questions (id, quiz_id, question_id, order_num, points)
              VALUES (?, ?, ?, ?, ?);
            `, [`qq-${quizId}-${idx}`, quizId, qid, idx + 1, pointPerQ]);
          });
        }

        createdQuizIds.push(quizId);
      });
    });

    res.status(201).json({
      message: `Berhasil membuat dan menerbitkan ${createdQuizIds.length} paket kuis baru!`,
      quizIds: createdQuizIds,
      count: createdQuizIds.length
    });
  } catch (err: any) {
    console.error('Error batch creating quizzes:', err);
    res.status(500).json({ error: 'Gagal membuat kuis masal: ' + err.message });
  }
});

// Delete quiz endpoint
app.delete('/api/v1/quizzes/:id', authMiddleware, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
  const quizId = req.params.id;
  const quiz = queryOne('SELECT * FROM quizzes WHERE id = ?;', [quizId]);
  if (!quiz) return res.status(404).json({ error: 'Kuis tidak ditemukan.' });

  try {
    transaction(() => {
      run('DELETE FROM student_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE quiz_id = ?);', [quizId]);
      run('DELETE FROM quiz_attempts WHERE quiz_id = ?;', [quizId]);
      run('DELETE FROM quiz_questions WHERE quiz_id = ?;', [quizId]);
      run('DELETE FROM quizzes WHERE id = ?;', [quizId]);
    });

    res.json({ message: `Kuis "${quiz.title}" berhasil dihapus.`, deletedId: quizId });
  } catch (err: any) {
    console.error('Error deleting quiz:', err);
    res.status(500).json({ error: 'Gagal menghapus kuis: ' + err.message });
  }
});

// GET Quiz Detail with Questions
app.get('/api/v1/quizzes/:id', authMiddleware, (req: AuthRequest, res) => {
  const quiz = queryOne(`
    SELECT q.*, c.name as classroom_name, t.title as topic_title
    FROM quizzes q
    LEFT JOIN classrooms c ON q.classroom_id = c.id
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE q.id = ?;
  `, [req.params.id]);

  if (!quiz) return res.status(404).json({ error: 'Kuis tidak ditemukan.' });

  const quizQuestions = query(`
    SELECT qq.order_num, qq.points, q.*
    FROM quiz_questions qq
    JOIN questions q ON qq.question_id = q.id
    WHERE qq.quiz_id = ?
    ORDER BY qq.order_num ASC;
  `, [req.params.id]);

  res.json({
    ...quiz,
    questions: quizQuestions.map(q => ({
      ...q,
      options: q.options_json ? JSON.parse(q.options_json) : null,
      answer_key: q.answer_key_json ? JSON.parse(q.answer_key_json) : null,
    })),
  });
});

// PUT Update Quiz (Edit Nama Kuis, Jumlah Soal, Durasi, KKM, dsb)
app.put('/api/v1/quizzes/:id', authMiddleware, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
  const quizId = req.params.id;
  const existing = queryOne('SELECT * FROM quizzes WHERE id = ?;', [quizId]);
  if (!existing) return res.status(404).json({ error: 'Kuis tidak ditemukan.' });

  const {
    title, description, duration_minutes, passing_score, max_attempts,
    classroom_id, topic_id, question_ids
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Nama kuis tidak boleh kosong.' });
  }

  try {
    transaction(() => {
      run(`
        UPDATE quizzes
        SET title = ?,
            description = COALESCE(?, description),
            duration_minutes = COALESCE(?, duration_minutes),
            passing_score = COALESCE(?, passing_score),
            max_attempts = COALESCE(?, max_attempts),
            classroom_id = COALESCE(?, classroom_id),
            topic_id = COALESCE(?, topic_id)
        WHERE id = ?;
      `, [
        title.trim(),
        description !== undefined ? description.trim() : null,
        duration_minutes ? Number(duration_minutes) : null,
        passing_score ? Number(passing_score) : null,
        max_attempts ? Number(max_attempts) : null,
        classroom_id || null,
        topic_id || null,
        quizId
      ]);

      if (Array.isArray(question_ids) && question_ids.length > 0) {
        // Re-assign questions
        run('DELETE FROM quiz_questions WHERE quiz_id = ?;', [quizId]);
        const pointPerQ = Math.round(100 / question_ids.length);
        question_ids.forEach((qid: string, idx: number) => {
          run(`
            INSERT INTO quiz_questions (id, quiz_id, question_id, order_num, points)
            VALUES (?, ?, ?, ?, ?);
          `, [`qq-${quizId}-${idx}`, quizId, qid, idx + 1, pointPerQ]);
        });
      }
    });

    const updated = queryOne('SELECT * FROM quizzes WHERE id = ?;', [quizId]);
    res.json({ message: `Kuis "${title.trim()}" berhasil diperbarui.`, quiz: updated });
  } catch (err: any) {
    console.error('Error updating quiz:', err);
    res.status(500).json({ error: 'Gagal memperbarui kuis: ' + err.message });
  }
});

// START ATTEMPT (Siswa Memulai Pengerjaan)
app.post('/api/v1/quizzes/:id/attempts', authMiddleware, requireRole('student'), (req: AuthRequest, res) => {
  const quiz = queryOne('SELECT * FROM quizzes WHERE id = ?;', [req.params.id]);
  if (!quiz) return res.status(404).json({ error: 'Kuis tidak ditemukan.' });
  if (quiz.status !== 'published') return res.status(400).json({ error: 'Kuis saat ini tidak aktif untuk dikerjakan.' });

  // Check existing attempts
  const pastAttempts = query('SELECT * FROM quiz_attempts WHERE quiz_id = ? AND student_id = ? ORDER BY attempt_number DESC;', [quiz.id, req.user.id]);
  
  // If there is an active in_progress attempt, recover it!
  const activeAttempt = pastAttempts.find(a => a.status === 'in_progress');
  if (activeAttempt) {
    // Check if expired
    const timeLimit = new Date(activeAttempt.time_limit_at).getTime();
    if (Date.now() > timeLimit) {
      run('UPDATE quiz_attempts SET status = "expired" WHERE id = ?;', [activeAttempt.id]);
    } else {
      return res.json({ attemptId: activeAttempt.id, message: 'Melanjutkan pengerjaan kuis yang sedang aktif.' });
    }
  }

  if (pastAttempts.filter(a => a.status !== 'in_progress').length >= quiz.max_attempts) {
    return res.status(400).json({ error: 'Anda telah mencapai batas maksimum percobaan untuk kuis ini.' });
  }

  const nextAttemptNum = pastAttempts.length + 1;
  const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Fetch questions to build immutable snapshot for this attempt
  const questionsList = query(`
    SELECT q.id, q.question_type, q.cognitive_level, q.difficulty, q.stimulus, q.question_text,
           q.options_json, qq.points, qq.order_num
    FROM quiz_questions qq
    JOIN questions q ON qq.question_id = q.id
    WHERE qq.quiz_id = ?
    ORDER BY qq.order_num ASC;
  `, [quiz.id]);

  let processedQuestions = questionsList.map(q => {
    let opts = q.options_json ? JSON.parse(q.options_json) : null;
    if (quiz.shuffle_options && Array.isArray(opts)) {
      opts = [...opts].sort(() => Math.random() - 0.5);
    }
    return {
      id: q.id,
      question_type: q.question_type,
      cognitive_level: q.cognitive_level,
      difficulty: q.difficulty,
      stimulus: q.stimulus,
      question_text: q.question_text,
      options: opts,
      points: q.points,
    };
  });

  if (quiz.shuffle_questions) {
    processedQuestions = processedQuestions.sort(() => Math.random() - 0.5);
  }

  const durationMs = quiz.duration_minutes * 60 * 1000;
  const timeLimitDate = new Date(Date.now() + durationMs).toISOString();

  run(`
    INSERT INTO quiz_attempts (
      id, quiz_id, student_id, attempt_number, status, time_limit_at, questions_snapshot_json
    ) VALUES (?, ?, ?, ?, 'in_progress', ?, ?);
  `, [attemptId, quiz.id, req.user.id, nextAttemptNum, timeLimitDate, JSON.stringify(processedQuestions)]);

  res.status(201).json({
    attemptId,
    durationMinutes: quiz.duration_minutes,
    timeLimitAt: timeLimitDate,
    message: 'Attempt kuis berhasil dibuat di server.'
  });
});

// GET ATTEMPT (Mengambil Soal & Status Jawaban yang Tersimpan)
app.get('/api/v1/attempts/:id', authMiddleware, (req: AuthRequest, res) => {
  const attempt = queryOne(`
    SELECT qa.*, q.title as quiz_title, q.duration_minutes
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    WHERE qa.id = ?;
  `, [req.params.id]);

  if (!attempt) return res.status(404).json({ error: 'Attempt tidak ditemukan.' });

  // Security check: student can only view their own attempt
  if (req.user.role === 'student' && attempt.student_id !== req.user.id) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  // Check time limit
  const isExpired = Date.now() > new Date(attempt.time_limit_at).getTime();
  if (isExpired && attempt.status === 'in_progress') {
    run('UPDATE quiz_attempts SET status = "expired" WHERE id = ?;', [attempt.id]);
    attempt.status = 'expired';
  }

  const savedAnswers = query(`
    SELECT question_id, answer_data_json, saved_at FROM student_answers WHERE attempt_id = ?;
  `, [attempt.id]);

  const answerMap: Record<string, any> = {};
  for (const a of savedAnswers) {
    try {
      answerMap[a.question_id] = JSON.parse(a.answer_data_json);
    } catch {
      answerMap[a.question_id] = a.answer_data_json;
    }
  }

  const questions = JSON.parse(attempt.questions_snapshot_json || '[]');

  res.json({
    attemptId: attempt.id,
    quizId: attempt.quiz_id,
    quizTitle: attempt.quiz_title,
    status: attempt.status,
    timeLimitAt: attempt.time_limit_at,
    remainingSeconds: Math.max(0, Math.floor((new Date(attempt.time_limit_at).getTime() - Date.now()) / 1000)),
    questions,
    savedAnswers: answerMap,
  });
});

// AUTOSAVE JAWABAN (Server-Authoritative Save)
app.put('/api/v1/attempts/:id/answers/:questionId', authMiddleware, requireRole('student'), (req: AuthRequest, res) => {
  const { id: attemptId, questionId } = req.params;
  const { answerData } = req.body;

  const attempt = queryOne('SELECT * FROM quiz_attempts WHERE id = ? AND student_id = ?;', [attemptId, req.user.id]);
  if (!attempt) return res.status(404).json({ error: 'Attempt tidak ditemukan.' });
  if (attempt.status !== 'in_progress') {
    return res.status(400).json({ error: 'Pengerjaan kuis sudah diselesaikan atau waktu telah habis.' });
  }

  if (Date.now() > new Date(attempt.time_limit_at).getTime()) {
    run('UPDATE quiz_attempts SET status = "expired" WHERE id = ?;', [attempt.id]);
    return res.status(400).json({ error: 'Waktu pengerjaan telah habis.' });
  }

  const existing = queryOne('SELECT id FROM student_answers WHERE attempt_id = ? AND question_id = ?;', [attemptId, questionId]);
  const jsonStr = JSON.stringify(answerData);

  if (existing) {
    run('UPDATE student_answers SET answer_data_json = ?, saved_at = CURRENT_TIMESTAMP WHERE id = ?;', [jsonStr, existing.id]);
  } else {
    run(`
      INSERT INTO student_answers (id, attempt_id, question_id, answer_data_json)
      VALUES (?, ?, ?, ?);
    `, [`sa-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, attemptId, questionId, jsonStr]);
  }

  res.json({ success: true, savedAt: new Date().toISOString() });
});

// SUBMIT & DETERMINISTIC GRADING ENGINE
app.post('/api/v1/attempts/:id/submit', authMiddleware, requireRole('student'), (req: AuthRequest, res) => {
  const attemptId = req.params.id;
  const attempt = queryOne('SELECT * FROM quiz_attempts WHERE id = ? AND student_id = ?;', [attemptId, req.user.id]);
  if (!attempt) return res.status(404).json({ error: 'Attempt tidak ditemukan.' });
  if (attempt.status !== 'in_progress') {
    return res.status(400).json({ error: 'Attempt sudah pernah dikirimkan sebelumnya.' });
  }

  const quiz = queryOne('SELECT * FROM quizzes WHERE id = ?;', [attempt.quiz_id]);
  const quizQuestions = query(`
    SELECT qq.points, q.*
    FROM quiz_questions qq
    JOIN questions q ON qq.question_id = q.id
    WHERE qq.quiz_id = ?;
  `, [attempt.quiz_id]);

  const studentAnswers = query('SELECT * FROM student_answers WHERE attempt_id = ?;', [attemptId]);
  const answerMap = new Map<string, any>();
  studentAnswers.forEach(sa => {
    try {
      answerMap.set(sa.question_id, JSON.parse(sa.answer_data_json));
    } catch {
      answerMap.set(sa.question_id, sa.answer_data_json);
    }
  });

  let totalScore = 0;
  let totalMaxScore = 0;
  let hasEssay = false;

  transaction(() => {
    for (const q of quizQuestions) {
      totalMaxScore += q.points;
      const stuAns = answerMap.get(q.id);
      const answerKey = JSON.parse(q.answer_key_json);

      let isCorrect = 0;
      let pointsEarned = 0;

      if (!stuAns) {
        // Not answered
        pointsEarned = 0;
        isCorrect = 0;
      } else if (q.question_type === 'single_choice') {
        if (stuAns.selectedOptionId === answerKey.correctOptionId) {
          isCorrect = 1;
          pointsEarned = q.points;
        }
      } else if (q.question_type === 'true_false') {
        if (Boolean(stuAns.isTrue) === Boolean(answerKey.isTrue)) {
          isCorrect = 1;
          pointsEarned = q.points;
        }
      } else if (q.question_type === 'complex_multiple') {
        const correctIds = (answerKey.correctOptionIds || []).sort().join(',');
        const chosenIds = (stuAns.selectedOptionIds || []).sort().join(',');
        if (correctIds === chosenIds && correctIds.length > 0) {
          isCorrect = 1;
          pointsEarned = q.points;
        } else if (stuAns.selectedOptionIds && stuAns.selectedOptionIds.length > 0) {
          // Partial credit: fraction of correct choices
          const correctCount = (answerKey.correctOptionIds || []).filter((id: string) => stuAns.selectedOptionIds.includes(id)).length;
          const wrongCount = stuAns.selectedOptionIds.filter((id: string) => !(answerKey.correctOptionIds || []).includes(id)).length;
          const fraction = Math.max(0, (correctCount - wrongCount) / (answerKey.correctOptionIds || []).length);
          pointsEarned = Math.round(fraction * q.points * 10) / 10;
          if (fraction === 1) isCorrect = 1;
        }
      } else if (q.question_type === 'ordering') {
        const expectedOrder = (answerKey.correctOrder || []).join(',');
        const studentOrder = (stuAns.orderedIds || []).join(',');
        if (expectedOrder === studentOrder) {
          isCorrect = 1;
          pointsEarned = q.points;
        }
      } else if (q.question_type === 'matching') {
        const expected = answerKey.matches || {};
        const actual = stuAns.matches || {};
        const keys = Object.keys(expected);
        let matchesCount = 0;
        keys.forEach(k => {
          if (actual[k] === expected[k]) matchesCount++;
        });
        if (keys.length > 0) {
          pointsEarned = Math.round((matchesCount / keys.length) * q.points * 10) / 10;
          if (matchesCount === keys.length) isCorrect = 1;
        }
      } else if (q.question_type === 'short_answer') {
        const normalized = (stuAns.text || '').toLowerCase().trim();
        const accepted = (answerKey.acceptedAnswers || []).map((a: string) => a.toLowerCase().trim());
        if (accepted.includes(normalized)) {
          isCorrect = 1;
          pointsEarned = q.points;
        }
      } else if (q.question_type === 'essay') {
        hasEssay = true;
        // Essay is pending teacher grade
        pointsEarned = 0;
        isCorrect = 0;
      }

      totalScore += pointsEarned;

      // Update student answer in DB
      const existing = queryOne('SELECT id FROM student_answers WHERE attempt_id = ? AND question_id = ?;', [attemptId, q.id]);
      if (existing) {
        run('UPDATE student_answers SET is_correct = ?, points_earned = ? WHERE id = ?;', [isCorrect, pointsEarned, existing.id]);
      } else {
        run(`
          INSERT INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned)
          VALUES (?, ?, ?, '{}', ?, ?);
        `, [`sa-${Date.now()}-${q.id}`, attemptId, q.id, isCorrect, pointsEarned]);
      }
    }

    const percentage = Math.round((totalScore / (totalMaxScore || 100)) * 1000) / 10;
    const finalStatus = hasEssay ? 'submitted' : 'evaluated';

    // Award XP if passed or finished
    let xpGained = Math.round(percentage * 2);
    if (percentage >= (quiz?.passing_score || 75)) {
      xpGained += 50; // Bonus kelulusan kuis
    }

    run(`
      UPDATE quiz_attempts
      SET status = ?, end_time = CURRENT_TIMESTAMP, score = ?, max_score = ?, percentage = ?, evaluated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `, [finalStatus, totalScore, totalMaxScore, percentage, attemptId]);

    // Give XP to student
    run('UPDATE users SET xp = xp + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [xpGained, req.user.id]);
    run(`
      INSERT INTO xp_events (id, user_id, event_type, xp_amount, description)
      VALUES (?, ?, 'quiz_completion', ?, ?);
    `, [`xp-${Date.now()}`, req.user.id, xpGained, `Menyelesaikan kuis: ${quiz?.title || 'Biologi'}`]);

    // Check achievement unlock: FIRST_QUIZ
    const hasFirstAch = queryOne('SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = "ach-01";', [req.user.id]);
    if (!hasFirstAch) {
      run('INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, "ach-01");', [`uach-${Date.now()}`, req.user.id]);
    }

    // If 100%, unlock PERFECT_SCORE
    if (percentage >= 100) {
      const hasPerfectAch = queryOne('SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = "ach-02";', [req.user.id]);
      if (!hasPerfectAch) {
        run('INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, "ach-02");', [`uach-${Date.now()}-perf`, req.user.id]);
      }
    }
  });

  res.json({
    attemptId,
    score: totalScore,
    maxScore: totalMaxScore,
    percentage: Math.round((totalScore / (totalMaxScore || 100)) * 100),
    hasEssay,
    message: hasEssay
      ? 'Kuis berhasil dikirimkan. Soal objektif telah dinilai otomatis, soal uraian sedang menunggu koreksi guru.'
      : 'Kuis berhasil diselesaikan dan dinilai secara otomatis di server!'
  });
});

// GET ATTEMPT RESULT WITH OFFICIAL EXPLANATIONS
app.get('/api/v1/attempts/:id/result', authMiddleware, (req: AuthRequest, res) => {
  const attempt = queryOne(`
    SELECT qa.*, q.title as quiz_title, q.passing_score, q.show_discussion_after, u.full_name as student_name
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN users u ON qa.student_id = u.id
    WHERE qa.id = ?;
  `, [req.params.id]);

  if (!attempt) return res.status(404).json({ error: 'Hasil attempt tidak ditemukan.' });

  // Security check: only the student themselves or a teacher/admin can inspect results
  if (req.user.role === 'student' && attempt.student_id !== req.user.id) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const answers = query(`
    SELECT sa.*, q.question_type, q.cognitive_level, q.difficulty, q.stimulus, q.question_text,
           q.options_json, q.answer_key_json, q.explanation, q.distractor_rationale_json, q.rubric_json, q.source_ref,
           qq.points as max_points
    FROM student_answers sa
    JOIN questions q ON sa.question_id = q.id
    JOIN quiz_questions qq ON (qq.quiz_id = ? AND qq.question_id = q.id)
    WHERE sa.attempt_id = ?
    ORDER BY qq.order_num ASC;
  `, [attempt.quiz_id, attempt.id]);

  const items = answers.map(a => {
    let studentAns = null;
    try { studentAns = JSON.parse(a.answer_data_json); } catch {}

    const canSeeDiscussion = attempt.show_discussion_after === 1 || req.user.role !== 'student';

    return {
      questionId: a.question_id,
      questionType: a.question_type,
      cognitiveLevel: a.cognitive_level,
      difficulty: a.difficulty,
      stimulus: a.stimulus,
      questionText: a.question_text,
      options: a.options_json ? JSON.parse(a.options_json) : null,
      studentAnswer: studentAns,
      isCorrect: a.is_correct === 1,
      pointsEarned: a.points_earned,
      maxPoints: a.max_points,
      teacherFeedback: a.teacher_feedback,
      // Official key & explanation only if allowed
      answerKey: canSeeDiscussion ? JSON.parse(a.answer_key_json) : null,
      explanation: canSeeDiscussion ? a.explanation : null,
      distractorRationale: canSeeDiscussion && a.distractor_rationale_json ? JSON.parse(a.distractor_rationale_json) : null,
      rubric: a.rubric_json ? JSON.parse(a.rubric_json) : null,
      sourceRef: canSeeDiscussion ? a.source_ref : null,
    };
  });

  res.json({
    attemptId: attempt.id,
    quizTitle: attempt.quiz_title,
    studentName: attempt.student_name,
    score: attempt.score,
    maxScore: attempt.max_score,
    percentage: attempt.percentage,
    passingScore: attempt.passing_score,
    passed: attempt.percentage >= attempt.passing_score,
    status: attempt.status,
    startTime: attempt.start_time,
    endTime: attempt.end_time,
    items,
  });
});

// ==========================================
// 6. TEACHER ESSAY CORRECTION & REVIEW
app.get('/api/v1/teacher/pending-essays', authMiddleware, (req: AuthRequest, res) => {
  if (req.user.role === 'student') {
    return res.json([]);
  }
  const pending = query(`
    SELECT sa.id as answer_id, sa.attempt_id, sa.question_id, sa.answer_data_json, sa.points_earned, sa.teacher_feedback,
           q.question_text, q.rubric_json, q.answer_key_json,
           qa.student_id, qa.score, qa.max_score,
           u.full_name as student_name, qz.title as quiz_title, qq.points as max_points
    FROM student_answers sa
    JOIN quiz_attempts qa ON sa.attempt_id = qa.id
    JOIN questions q ON sa.question_id = q.id
    JOIN quizzes qz ON qa.quiz_id = qz.id
    JOIN quiz_questions qq ON (qq.quiz_id = qz.id AND qq.question_id = q.id)
    JOIN users u ON qa.student_id = u.id
    WHERE q.question_type = 'essay' AND qa.status = 'submitted'
    ORDER BY qa.created_at ASC;
  `);

  const list = pending.map(p => ({
    ...p,
    studentAnswer: JSON.parse(p.answer_data_json || '{}'),
    rubric: p.rubric_json ? JSON.parse(p.rubric_json) : null,
    answerKey: JSON.parse(p.answer_key_json || '{}'),
  }));

  res.json(list);
});

app.post('/api/v1/teacher/grade-essay', authMiddleware, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
  const { answerId, pointsEarned, feedback } = req.body;
  if (!answerId || pointsEarned === undefined) {
    return res.status(400).json({ error: 'ID jawaban dan nilai wajib diisi.' });
  }

  const answer = queryOne('SELECT * FROM student_answers WHERE id = ?;', [answerId]);
  if (!answer) return res.status(404).json({ error: 'Jawaban tidak ditemukan.' });

  transaction(() => {
    run(`
      UPDATE student_answers
      SET points_earned = ?, is_correct = ?, teacher_feedback = ?, saved_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `, [pointsEarned, pointsEarned > 0 ? 1 : 0, feedback || '', answerId]);

    // Recompute attempt total score
    const allAnswers = query('SELECT points_earned FROM student_answers WHERE attempt_id = ?;', [answer.attempt_id]);
    const attempt = queryOne('SELECT max_score FROM quiz_attempts WHERE id = ?;', [answer.attempt_id]);
    const newTotal = allAnswers.reduce((sum, a) => sum + (a.points_earned || 0), 0);
    const newPercentage = Math.round((newTotal / (attempt?.max_score || 100)) * 1000) / 10;

    // Check if any other essay is still pending
    const remainingEssays = query(`
      SELECT sa.id FROM student_answers sa
      JOIN questions q ON sa.question_id = q.id
      WHERE sa.attempt_id = ? AND q.question_type = 'essay' AND sa.teacher_feedback IS NULL;
    `, [answer.attempt_id]);

    const newStatus = remainingEssays.length === 0 ? 'evaluated' : 'submitted';

    run(`
      UPDATE quiz_attempts
      SET score = ?, percentage = ?, status = ?, evaluated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `, [newTotal, newPercentage, newStatus, answer.attempt_id]);

    // Audit log
    run(`
      INSERT INTO audit_logs (id, user_id, action, resource, details)
      VALUES (?, ?, 'grade_essay', ?, ?);
    `, [`audit-${Date.now()}`, req.user.id, `attempt:${answer.attempt_id}`, `Guru memberikan nilai ${pointsEarned} untuk esai.`]);
  });

  res.json({ message: 'Nilai dan umpan balik esai berhasil disimpan.' });
});

// ==========================================
// 7. AI INTEGRATION ENDPOINTS (BACKEND-ONLY)
// ==========================================

app.post('/api/v1/ai/tutor', authMiddleware, async (req: AuthRequest, res) => {
  const { message, topicTitle, curriculumContext } = req.body;
  if (!message) return res.status(400).json({ error: 'Pesan pertanyaan wajib diisi.' });

  try {
    const result = await askAiTutor({
      userId: req.user.id,
      message,
      topicTitle,
      curriculumContext,
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Layanan AI Tutor sementara tidak tersedia.' });
  }
});

app.post('/api/v1/ai/generate-question', authMiddleware, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  const { topicTitle, objectiveCode, cognitiveLevel, difficulty, questionType } = req.body;
  if (!topicTitle || !objectiveCode || !cognitiveLevel || !difficulty || !questionType) {
    return res.status(400).json({ error: 'Parameter topik, capaian, kognitif, kesulitan, dan tipe soal wajib disertakan.' });
  }

  try {
    const draft = await generateQuestionDraft({
      userId: req.user.id,
      topicTitle,
      objectiveCode,
      cognitiveLevel,
      difficulty,
      questionType,
    });
    res.json(draft);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Gagal menghasilkan draf soal AI.' });
  }
});

app.post('/api/v1/ai/evaluate-essay', authMiddleware, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  const { questionText, rubricJson, studentAnswer } = req.body;
  if (!questionText || !rubricJson || !studentAnswer) {
    return res.status(400).json({ error: 'Teks soal, rubrik, dan jawaban siswa wajib diisi.' });
  }

  try {
    const evalResult = await evaluateEssayDraft({
      userId: req.user.id,
      questionText,
      rubricJson: typeof rubricJson === 'string' ? rubricJson : JSON.stringify(rubricJson),
      studentAnswer,
    });
    res.json(evalResult);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Gagal mengevaluasi esai dengan AI.' });
  }
});

app.get('/api/v1/ai/status', authMiddleware, (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  const totalLogs = queryOne('SELECT COUNT(*) as total_calls, AVG(latency_ms) as avg_latency FROM ai_logs;') || { total_calls: 0, avg_latency: 0 };
  res.json({
    configured: hasKey,
    model: 'gemini-3.8-flash',
    totalCalls: totalLogs.total_calls,
    avgLatencyMs: Math.round(totalLogs.avg_latency || 0),
  });
});

// ==========================================
// 8. LEARNING ANALYTICS & GAMIFICATION
// ==========================================

app.get('/api/v1/analytics/student', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user.id;

  // Real mastery calculation per topic based on student answers
  const topicMastery = query(`
    SELECT t.id as topic_id, t.title as topic_title, t.code as topic_code,
           COUNT(sa.id) as total_answered,
           SUM(sa.is_correct) as correct_count,
           AVG(sa.points_earned) as avg_points
    FROM topics t
    LEFT JOIN questions q ON q.topic_id = t.id
    LEFT JOIN student_answers sa ON (sa.question_id = q.id AND sa.attempt_id IN (SELECT id FROM quiz_attempts WHERE student_id = ?))
    GROUP BY t.id
    ORDER BY t.order_num ASC;
  `, [userId]);

  // Quiz history & score progression
  const quizHistory = query(`
    SELECT qa.id, qa.score, qa.max_score, qa.percentage, qa.created_at, q.title as quiz_title
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    WHERE qa.student_id = ? AND qa.status = 'evaluated'
    ORDER BY qa.created_at ASC;
  `, [userId]);

  // Unlocked achievements
  const userAchievements = query(`
    SELECT a.*, ua.unlocked_at
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = ?
    ORDER BY ua.unlocked_at DESC;
  `, [userId]);

  res.json({
    user: req.user,
    topicMastery: topicMastery.map(tm => ({
      ...tm,
      masteryPercentage: tm.total_answered > 0 ? Math.round((tm.correct_count / tm.total_answered) * 100) : 0,
    })),
    quizHistory,
    userAchievements,
  });
});

app.get('/api/v1/analytics/teacher', authMiddleware, (req: AuthRequest, res) => {
  const isTeacher = req.user.role === 'teacher';
  const teacherId = isTeacher ? req.user.id : null;

  // Performance stats across all quizzes by this teacher or entire class
  const summary = queryOne(`
    SELECT COUNT(DISTINCT qz.id) as total_quizzes,
           COUNT(qa.id) as total_attempts,
           AVG(qa.percentage) as avg_class_score,
           SUM(CASE WHEN qa.percentage >= qz.passing_score THEN 1 ELSE 0 END) as passed_count
    FROM quizzes qz
    LEFT JOIN quiz_attempts qa ON qa.quiz_id = qz.id AND qa.status = 'evaluated'
    ${teacherId ? 'WHERE qz.teacher_id = ?' : ''};
  `, teacherId ? [teacherId] : []);

  // Question difficulty analysis: most missed questions
  const missedQuestions = query(`
    SELECT q.id, q.question_text, q.question_type, q.cognitive_level, t.title as topic_title,
           COUNT(sa.id) as total_attempts,
           SUM(CASE WHEN sa.is_correct = 0 THEN 1 ELSE 0 END) as wrong_count
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN student_answers sa ON sa.question_id = q.id
    GROUP BY q.id
    HAVING total_attempts > 0
    ORDER BY (CAST(SUM(CASE WHEN sa.is_correct = 0 THEN 1 ELSE 0 END) AS REAL) / COUNT(sa.id)) DESC
    LIMIT 5;
  `);

  res.json({
    summary: {
      totalQuizzes: summary?.total_quizzes || 0,
      totalAttempts: summary?.total_attempts || 0,
      avgClassScore: Math.round(summary?.avg_class_score || 0),
      passedCount: summary?.passed_count || 0,
    },
    missedQuestions,
  });
});

app.get('/api/v1/gamification/leaderboard', authMiddleware, (req, res) => {
  const leaders = query(`
    SELECT id, full_name, role, avatar, xp, level
    FROM users
    WHERE role = 'student'
    ORDER BY xp DESC
    LIMIT 10;
  `);
  res.json(leaders);
});

// CSV EXPORT FOR TEACHER (with CSV injection formula protection)
app.get('/api/v1/reports/export/quiz/:id', authMiddleware, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
  const quiz = queryOne('SELECT * FROM quizzes WHERE id = ?;', [req.params.id]);
  if (!quiz) return res.status(404).send('Kuis tidak ditemukan');

  const attempts = query(`
    SELECT u.full_name, u.email, qa.attempt_number, qa.score, qa.max_score, qa.percentage, qa.status, qa.created_at
    FROM quiz_attempts qa
    JOIN users u ON qa.student_id = u.id
    WHERE qa.quiz_id = ?
    ORDER BY u.full_name ASC;
  `, [quiz.id]);

  // CSV injection sanitization: escape '=' '+' '-' '@'
  const sanitize = (val: any) => {
    let str = String(val ?? '');
    if (/^[=+@-].*/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headers = ['Nama Siswa', 'Email', 'Percobaan Ke', 'Skor Mentah', 'Skor Maksimum', 'Nilai (%)', 'Status', 'Tanggal'];
  const rows = attempts.map(a => [
    sanitize(a.full_name),
    sanitize(a.email),
    sanitize(a.attempt_number),
    sanitize(a.score),
    sanitize(a.max_score),
    sanitize(a.percentage),
    sanitize(a.status),
    sanitize(a.created_at),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="rekap_nilai_${quiz.id}.csv"`);
  res.send(csvContent);
});

// ==========================================
// 9. STUDENT ROSTER MANAGEMENT & PDF DATA (35 MURID)
// ==========================================

// Get all students in classroom with latest quiz scores and KKM status
app.get('/api/v1/classroom/students', authMiddleware, (req: AuthRequest, res) => {
  const classroomId = (req.query.classroom_id as string) || 'cls-x-a';
  const quizId = (req.query.quiz_id as string) || 'quiz-bio-4tipe';

  const classroom = queryOne('SELECT * FROM classrooms WHERE id = ?;', [classroomId]) || {
    id: 'cls-x-a',
    name: 'Kelas X-A Biologi',
    code: 'BIO-XA-2026',
    academic_year: '2026/2027'
  };

  const quiz = queryOne('SELECT id, title, passing_score FROM quizzes WHERE id = ?;', [quizId]) || {
    id: 'quiz-bio-4tipe',
    title: 'Kuis Standar Biologi: PG, Benar/Salah, Menjodohkan & Uraian',
    passing_score: 75
  };

  const students = query(`
    SELECT u.id, u.full_name, u.email, u.nis, u.gender, u.avatar, u.xp, u.level,
           cm.joined_at,
           qa.id as attempt_id, qa.score, qa.max_score, qa.percentage, qa.status as attempt_status,
           qa.created_at as attempt_date, qa.feedback as teacher_note
    FROM classroom_members cm
    JOIN users u ON cm.user_id = u.id
    LEFT JOIN quiz_attempts qa ON qa.id = (
      SELECT id FROM quiz_attempts
      WHERE student_id = u.id AND quiz_id = ?
      ORDER BY attempt_number DESC, created_at DESC
      LIMIT 1
    )
    WHERE cm.classroom_id = ?
    ORDER BY u.nis ASC, u.full_name ASC;
  `, [quiz.id, classroom.id]);

  // For each student, get score breakdown across 4 types if attempt exists
  const enrichedStudents = students.map((st, idx) => {
    let pg = 0, bs = 0, jd = 0, es = 0;
    if (st.attempt_id) {
      const answers = query(`
        SELECT q.question_type, sa.points_earned
        FROM student_answers sa
        JOIN questions q ON sa.question_id = q.id
        WHERE sa.attempt_id = ?;
      `, [st.attempt_id]);

      answers.forEach(a => {
        if (a.question_type === 'single_choice' || a.question_type === 'complex_multiple') pg += a.points_earned;
        else if (a.question_type === 'true_false') bs += a.points_earned;
        else if (a.question_type === 'matching' || a.question_type === 'ordering') jd += a.points_earned;
        else if (a.question_type === 'essay' || a.question_type === 'short_answer') es += a.points_earned;
      });
    }

    const hasAttempted = Boolean(st.attempt_id);
    const score = hasAttempted ? Math.round(st.score || 0) : null;
    const isPassed = hasAttempted && (st.percentage >= quiz.passing_score);

    return {
      no: idx + 1,
      id: st.id,
      nis: st.nis || `2401${String(idx + 1).padStart(2, '0')}`,
      name: st.full_name,
      gender: st.gender || (idx % 2 === 0 ? 'L' : 'P'),
      email: st.email,
      avatar: st.avatar,
      xp: st.xp,
      hasAttempted,
      attemptId: st.attempt_id,
      attemptDate: st.attempt_date,
      score,
      maxScore: st.max_score || 100,
      percentage: st.percentage,
      passingScore: quiz.passing_score,
      isPassed,
      kkmStatus: hasAttempted ? (isPassed ? 'TUNTAS' : 'REMEDIAL') : 'BELUM MENGERJAKAN',
      breakdown: { pg, bs, jd, es },
      teacherNote: st.teacher_note,
    };
  });

  // Calculate class statistics
  const attemptedCount = enrichedStudents.filter(s => s.hasAttempted).length;
  const passedCount = enrichedStudents.filter(s => s.hasAttempted && s.isPassed).length;
  const remedialCount = attemptedCount - passedCount;
  const scoresOnly = enrichedStudents.filter(s => s.hasAttempted && s.score !== null).map(s => s.score as number);
  const avgScore = scoresOnly.length > 0 ? Math.round((scoresOnly.reduce((a, b) => a + b, 0) / scoresOnly.length) * 10) / 10 : 0;
  const highestScore = scoresOnly.length > 0 ? Math.max(...scoresOnly) : 0;
  const lowestScore = scoresOnly.length > 0 ? Math.min(...scoresOnly) : 0;

  res.json({
    classroom,
    quiz,
    totalStudents: enrichedStudents.length,
    attemptedCount,
    passedCount,
    remedialCount,
    passRate: attemptedCount > 0 ? Math.round((passedCount / attemptedCount) * 100) : 0,
    averageScore: avgScore,
    highestScore,
    lowestScore,
    students: enrichedStudents,
  });
});

// Batch import or input students (e.g. 35 students)
app.post('/api/v1/classroom/students/batch', authMiddleware, (req: AuthRequest, res) => {
  const { classroomId = 'cls-x-a', students, names, rawNames, generateScores = true } = req.body;
  
  let studentList: Array<{ name: string; nis?: string; gender?: string }> = [];
  if (Array.isArray(students)) {
    studentList = students.map((s: any) => typeof s === 'string' ? { name: s } : s);
  } else if (Array.isArray(names)) {
    studentList = names.map((s: any) => typeof s === 'string' ? { name: s } : s);
  } else if (typeof rawNames === 'string') {
    studentList = rawNames.split(/\r?\n/).map(l => l.replace(/^(\d+[\.\)]\s*|\-\s*)/, '').trim()).filter(Boolean).map(n => ({ name: n }));
  }

  if (studentList.length === 0) {
    return res.status(400).json({ error: 'Daftar nama murid wajib berupa array tidak kosong.' });
  }

  const salt = bcrypt.genSaltSync(8);
  const defaultPass = bcrypt.hashSync('Biologi2026!', salt);
  const quizId = 'quiz-bio-4tipe';

  try {
    transaction(() => {
      // 1. Clear previous classroom memberships for this classroom so the new list of students applies cleanly
      run('DELETE FROM classroom_members WHERE classroom_id = ?;', [classroomId]);

      // 2. Loop through each student to insert/update
      studentList.forEach((st: any, idx: number) => {
        const rawName = (st.name || st.full_name || '').trim();
        if (!rawName) return;

        const nis = st.nis || `2401${String(idx + 1).padStart(2, '0')}`;
        const gender = st.gender || (idx % 2 === 0 ? 'L' : 'P');
        const studentId = `usr-stu-${String(idx + 1).padStart(2, '0')}`;
        const sanitizedName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'murid';
        const email = `siswa.${sanitizedName}.${idx + 1}@sekolah.id`;

        run(`
          INSERT INTO users (id, email, password_hash, full_name, role, avatar, xp, level, nis, gender)
          VALUES (?, ?, ?, ?, 'student', ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            full_name = excluded.full_name, 
            email = excluded.email, 
            nis = excluded.nis, 
            gender = excluded.gender;
        `, [
          studentId,
          email,
          defaultPass,
          rawName,
          gender === 'P' ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          300 + idx * 10,
          2,
          nis,
          gender
        ]);

        // Insert classroom membership
        run(`
          INSERT OR REPLACE INTO classroom_members (id, classroom_id, user_id)
          VALUES (?, ?, ?);
        `, [`cm-${studentId}`, classroomId, studentId]);

        if (generateScores) {
          // Realistic distribution: 80% pass (KKM 75), ~20% remedial
          const isRemedial = (idx % 5 === 2) || (idx === 11) || (idx === 16);
          const pg = isRemedial ? (idx % 2 === 0 ? 0 : 25) : 25;
          const bs = isRemedial ? 0 : 25;
          const jd = isRemedial ? 0 : 25;
          const es = isRemedial ? 10 + (idx % 10) : 18 + (idx % 8);
          const total = pg + bs + jd + es;

          const attemptId = `att-4t-${studentId}`;
          run(`
            INSERT OR REPLACE INTO quiz_attempts (
              id, quiz_id, student_id, attempt_number, status, start_time, end_time, time_limit_at,
              questions_snapshot_json, score, max_score, percentage, feedback, evaluated_at
            ) VALUES (
              ?, ?, ?, 1, 'evaluated',
              datetime('now', '-1 days'), datetime('now', '-1 days', '+25 minutes'), datetime('now', '-1 days', '+30 minutes'),
              '[]', ?, 100, ?, ?, datetime('now', '-1 days', '+30 minutes')
            );
          `, [
            attemptId, quizId, studentId, total, total,
            total >= 75 ? 'Memenuhi Kriteria Ketuntasan Minimal (Tuntas).' : 'Belum mencapai KKM 75. Perlu program bimbingan remedial.'
          ]);

          // Student answers for 4 types
          run(`
            INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
            VALUES (?, ?, 'qst-01', ?, ?, ?, ?);
          `, [`ans-${attemptId}-01`, attemptId, pg === 25 ? '{"selectedOptionId":"opt-B"}' : '{"selectedOptionId":"opt-A"}', pg === 25 ? 1 : 0, pg, 'Pilihan Ganda']);

          run(`
            INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
            VALUES (?, ?, 'qst-02', ?, ?, ?, ?);
          `, [`ans-${attemptId}-02`, attemptId, bs === 25 ? '{"isTrue":false}' : '{"isTrue":true}', bs === 25 ? 1 : 0, bs, 'Benar / Salah']);

          run(`
            INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
            VALUES (?, ?, 'qst-05', ?, ?, ?, ?);
          `, [`ans-${attemptId}-05`, attemptId, jd === 25 ? '{"matches":{"pair-1":"Daur Litik","pair-2":"Daur Lisogenik","pair-3":"Kapsid Protein"}}' : '{"matches":{}}', jd === 25 ? 1 : 0, jd, 'Menjodohkan']);

          run(`
            INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
            VALUES (?, ?, 'qst-07', ?, ?, ?, ?);
          `, [`ans-${attemptId}-07`, attemptId, JSON.stringify({ text: `Jawaban uraian konsep biologi dari ${rawName}.` }), es >= 20 ? 1 : 0, es, `Nilai uraian ${es}/25.`]);
        }
      });

      // Audit log
      try {
        run(`
          INSERT INTO audit_logs (id, user_id, action, resource, details)
          VALUES (?, ?, 'batch_import_students', ?, ?);
        `, [`audit-${Date.now()}`, req.user.id, `classroom:${classroomId}`, `Menerapkan ${studentList.length} murid ke dalam rombel.`]);
      } catch {}
    });

    res.json({ message: `Berhasil menyimpan dan menerapkan ${studentList.length} nama murid ke dalam kelas.` });
  } catch (err: any) {
    console.error('Error batch importing students:', err);
    res.status(500).json({ error: 'Gagal menerapkan murid: ' + err.message });
  }
});

// Reset classroom to standard 35 students with complete quiz evaluations
app.post('/api/v1/classroom/students/reset-35', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  db.then(database => {
    seed35StudentsInternal(database);
    res.json({ message: 'Daftar 35 murid dan data hasil asesmen berhasil disinkronisasi ulang.' });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// Add single student
app.post('/api/v1/classroom/students/add', authMiddleware, (req: AuthRequest, res) => {
  const { name, nis, gender = 'L', classroomId = 'cls-x-a' } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nama murid wajib diisi.' });
  }

  const cleanName = name.trim();
  const cleanNis = nis ? nis.trim() : `2401${Math.floor(100 + Math.random() * 900)}`;
  const studentId = `usr-stu-${Date.now()}`;
  const sanitizedName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'murid';
  const email = `siswa.${sanitizedName}.${Date.now().toString(36)}@sekolah.id`;
  const defaultPass = bcrypt.hashSync('Biologi2026!', 8);

  try {
    transaction(() => {
      run(`
        INSERT INTO users (id, email, password_hash, full_name, role, avatar, xp, level, nis, gender)
        VALUES (?, ?, ?, ?, 'student', ?, 200, 1, ?, ?);
      `, [
        studentId, email, defaultPass, cleanName,
        gender === 'P' ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        cleanNis, gender
      ]);

      run(`
        INSERT INTO classroom_members (id, classroom_id, user_id)
        VALUES (?, ?, ?);
      `, [`cm-${studentId}`, classroomId, studentId]);
    });

    res.json({ message: 'Murid baru berhasil ditambahkan.', studentId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit student data (name, NIS, gender, email, breakdown scores)
app.put('/api/v1/classroom/students/:id', authMiddleware, (req: AuthRequest, res) => {
  const studentId = req.params.id;
  const { name, full_name, nis, gender, email, pg, bs, jd, es, teacher_feedback } = req.body;
  const cleanName = (name || full_name || '').trim();

  if (!cleanName) {
    return res.status(400).json({ error: 'Nama murid tidak boleh kosong.' });
  }

  const existing = queryOne('SELECT * FROM users WHERE id = ?;', [studentId]);
  if (!existing) {
    return res.status(404).json({ error: 'Data murid tidak ditemukan.' });
  }

  const cleanNis = nis !== undefined ? (nis ? nis.trim() : null) : existing.nis;
  const cleanGender = gender ? gender.trim().toUpperCase() : (existing.gender || 'L');
  const cleanEmail = email ? email.trim().toLowerCase() : existing.email;

  try {
    transaction(() => {
      // 1. Update user
      run(`
        UPDATE users
        SET full_name = ?,
            nis = ?,
            gender = ?,
            email = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
      `, [cleanName, cleanNis, cleanGender, cleanEmail, studentId]);

      // 2. If score breakdown is provided, update or insert quiz attempt
      if (pg !== undefined || bs !== undefined || jd !== undefined || es !== undefined) {
        const quizId = 'quiz-bio-4tipe';
        const numPg = Number(pg) || 0;
        const numBs = Number(bs) || 0;
        const numJd = Number(jd) || 0;
        const numEs = Number(es) || 0;
        const total = numPg + numBs + numJd + numEs;
        const attemptId = `att-4t-${studentId}`;
        const feedback = teacher_feedback || (total >= 75 ? 'Memenuhi Kriteria Ketuntasan Minimal (Tuntas).' : 'Belum mencapai KKM 75. Perlu program bimbingan remedial.');

        run(`
          INSERT INTO quiz_attempts (
            id, quiz_id, student_id, attempt_number, status, start_time, end_time, time_limit_at,
            questions_snapshot_json, score, max_score, percentage, feedback, evaluated_at
          ) VALUES (
            ?, ?, ?, 1, 'evaluated',
            datetime('now', '-1 days'), datetime('now', '-1 days', '+25 minutes'), datetime('now', '-1 days', '+30 minutes'),
            '[]', ?, 100, ?, ?, datetime('now')
          )
          ON CONFLICT(id) DO UPDATE SET
            score = excluded.score,
            percentage = excluded.percentage,
            feedback = excluded.feedback,
            evaluated_at = datetime('now');
        `, [attemptId, quizId, studentId, total, total, feedback]);

        // Update student answers
        run(`
          INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
          VALUES (?, ?, 'qst-01', ?, ?, ?, ?);
        `, [`ans-${attemptId}-01`, attemptId, numPg === 25 ? '{"selectedOptionId":"opt-B"}' : '{"selectedOptionId":"opt-A"}', numPg === 25 ? 1 : 0, numPg, 'Pilihan Ganda']);

        run(`
          INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
          VALUES (?, ?, 'qst-02', ?, ?, ?, ?);
        `, [`ans-${attemptId}-02`, attemptId, numBs === 25 ? '{"isTrue":false}' : '{"isTrue":true}', numBs === 25 ? 1 : 0, numBs, 'Benar / Salah']);

        run(`
          INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
          VALUES (?, ?, 'qst-05', ?, ?, ?, ?);
        `, [`ans-${attemptId}-05`, attemptId, numJd === 25 ? '{"matches":{"pair-1":"Daur Litik","pair-2":"Daur Lisogenik","pair-3":"Kapsid Protein"}}' : '{"matches":{}}', numJd === 25 ? 1 : 0, numJd, 'Menjodohkan']);

        run(`
          INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
          VALUES (?, ?, 'qst-07', ?, ?, ?, ?);
        `, [`ans-${attemptId}-07`, attemptId, JSON.stringify({ text: `Jawaban uraian biologi dari ${cleanName}.` }), numEs >= 20 ? 1 : 0, numEs, feedback]);
      }
    });

    res.json({ message: `Data murid "${cleanName}" berhasil diperbarui.`, studentId });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memperbarui data murid: ' + err.message });
  }
});

// Delete student
app.delete('/api/v1/classroom/students/:id', authMiddleware, (req: AuthRequest, res) => {
  const studentId = req.params.id;
  try {
    transaction(() => {
      run('DELETE FROM classroom_members WHERE user_id = ?;', [studentId]);
      run('DELETE FROM student_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE student_id = ?);', [studentId]);
      run('DELETE FROM quiz_attempts WHERE student_id = ?;', [studentId]);
      run('DELETE FROM users WHERE id = ?;', [studentId]);
    });
    res.json({ message: 'Data murid berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Detailed PDF report data for an individual attempt
app.get('/api/v1/reports/attempt/:attemptId/pdf-data', authMiddleware, (req: AuthRequest, res) => {
  const attempt = queryOne(`
    SELECT qa.*, q.title as quiz_title, q.duration_minutes, q.passing_score,
           u.full_name as student_name, u.email as student_email, u.nis as student_nis, u.gender as student_gender,
           c.name as classroom_name, c.academic_year,
           t.title as topic_title, t.code as topic_code,
           tch.full_name as teacher_name, tch.nip as teacher_nip, tch.school_name as teacher_school
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN users u ON qa.student_id = u.id
    LEFT JOIN classrooms c ON q.classroom_id = c.id
    LEFT JOIN topics t ON q.topic_id = t.id
    LEFT JOIN users tch ON q.teacher_id = tch.id
    WHERE qa.id = ?;
  `, [req.params.attemptId]);

  if (!attempt) return res.status(404).json({ error: 'Pengerjaan kuis tidak ditemukan.' });

  // Security: students can only fetch their own PDF data
  if (req.user.role === 'student' && attempt.student_id !== req.user.id) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const answers = query(`
    SELECT sa.*, q.question_type, q.cognitive_level, q.stimulus, q.question_text,
           q.answer_key_json, q.explanation, q.source_ref,
           qq.points as max_points
    FROM student_answers sa
    JOIN questions q ON sa.question_id = q.id
    JOIN quiz_questions qq ON (qq.quiz_id = ? AND qq.question_id = q.id)
    WHERE sa.attempt_id = ?
    ORDER BY qq.order_num ASC;
  `, [attempt.quiz_id, attempt.id]);

  const items = answers.map((a, idx) => {
    let studentAns = null;
    let answerKey = null;
    try { studentAns = JSON.parse(a.answer_data_json); } catch {}
    try { answerKey = JSON.parse(a.answer_key_json); } catch {}

    return {
      no: idx + 1,
      type: a.question_type,
      cognitiveLevel: a.cognitive_level,
      questionText: a.question_text,
      pointsEarned: a.points_earned,
      maxPoints: a.max_points,
      isCorrect: a.is_correct === 1,
      studentAnswer: studentAns,
      answerKey,
      explanation: a.explanation,
      teacherFeedback: a.teacher_feedback,
    };
  });

  res.json({
    attemptId: attempt.id,
    student: {
      name: attempt.student_name,
      nis: attempt.student_nis || '240101',
      gender: attempt.student_gender || 'L',
      email: attempt.student_email,
      classroom: attempt.classroom_name || 'Kelas X-A Biologi',
      academicYear: attempt.academic_year || '2026/2027',
    },
    quiz: {
      id: attempt.quiz_id,
      title: attempt.quiz_title,
      topic: attempt.topic_title || 'Biologi Fase E',
      passingScore: attempt.passing_score,
      durationMinutes: attempt.duration_minutes,
      teacherName: attempt.teacher_name || 'Dr. Ratna Dewi, M.Pd.',
      teacherNip: attempt.teacher_nip || '19820815 200801 2 015',
      schoolName: attempt.teacher_school || 'SMA Negeri 1 Teladan',
    },
    result: {
      score: attempt.score,
      maxScore: attempt.max_score,
      percentage: attempt.percentage,
      isPassed: attempt.percentage >= attempt.passing_score,
      kkmStatus: attempt.percentage >= attempt.passing_score ? 'MENCAPAI KKM (TUNTAS)' : 'BELUM MENCAPAI KKM (REMEDIAL)',
      feedback: attempt.feedback,
      startTime: attempt.start_time,
      endTime: attempt.end_time,
      evaluatedAt: attempt.evaluated_at,
    },
    items,
  });
});

async function startServer() {
  await getDb(); // Ensure DB is initialized before listening

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Kuis Interaktif Biologi Kelas X backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

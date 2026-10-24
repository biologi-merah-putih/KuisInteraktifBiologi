# DOKUMEN ARSITEKTUR & SPESIFIKASI SISTEM
## APLIKASI KUIS INTERAKTIF BIOLOGI KELAS X (SMA/MA)

---

### 1. RINGKASAN AUDIT REPOSITORI DAN LINGKUNGAN
- **Runtime Lingkungan**: Node.js v22+ / Bun runtime pada container Linux.
- **Port Layanan**: Port 3000 (Iframe dev server terintegrasi).
- **Frontend Stack**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion.
- **Backend Stack**: Express 4.x running under `tsx server.ts`, REST API berversi `/api/v1/*`.
- **Database Engine**: Relational SQLite persistent database (`sql.js` WebAssembly + file sync `data/biology_quiz.sqlite`) yang menjamin kepatuhan ACID, Foreign Key constraints, Unique constraints, dan Transaksi Rollback/Commit tanpa dependensi kompilasi native C++.
- **AI Integration**: Google GenAI SDK (`@google/genai` v2.4.0) via backend proxy menggunakan model `gemini-3.8-flash` dengan `User-Agent: aistudio-build`. API key dikelola di server melalui `process.env.GEMINI_API_KEY`, tanpa eksposur ke frontend.
- **Aset Visual**: Dihasilkan secara autentik dan beresolusi tinggi menggunakan `generate_image` untuk struktur sel, mikrobiologi virus/bakteri, keanekaragaman hayati tropis, dan laboratorium biologi.

---

### 2. DAFTAR KEBUTUHAN FUNGSIONAL & NONFUNGSIONAL

#### 2.1 Kebutuhan Fungsional
1. **Autentikasi & RBAC (Role-Based Access Control)**:
   - 4 Peran Terakreditasi: Siswa, Guru, Reviewer, dan Administrator.
   - Sesi terenkripsi, proteksi IDOR, dan audit log perubahan nilai/otorisasi.
2. **Kurikulum & Materi Terstruktur**:
   - Berdasarkan Kurikulum Merdeka Fase E (Kelas X SMA/MA).
   - 6 Topik Utama: Ruang Lingkup Biologi, Keanekaragaman Hayati, Virus, Bakteri/Mikrobiologi, Ekosistem & Aliran Energi, serta Perubahan Lingkungan & Konservasi.
   - Dukungan metadata tujuan pembelajaran, tingkat kognitif Bloom (C1 s.d. C6), miskonsepsi umum, pertanyaan reflektif, dan sumber literatur resmi (Kemendikbudristek & Campbell Biology 12th Ed).
3. **Modul Bank Soal Multiformat**:
   - Format: Pilihan Ganda, Benar/Salah, Pilihan Ganda Kompleks (Multi-jawaban), Menjodohkan, Mengurutkan Tahapan, Isian Singkat, dan Uraian (Rubrik Penilaian).
   - Alur hidup soal: Draft $\to$ Pengajuan Review $\to$ Disetujui (Approved) $\to$ Dipublikasikan.
4. **Mesin Asesmen & Pengerjaan Kuis**:
   - Snapshot soal pada saat attempt dimulai (mencegah perubahan soal di tengah ujian).
   - Validasi batas waktu server-authoritative (tidak mengandalkan timer browser).
   - Server-based autosave dengan konfirmasi status tersimpan real-time.
   - Penilaian deterministik di backend untuk soal objektif.
   - Antarmuka koreksi manual bagi guru untuk soal uraian dengan panduan rubrik.
5. **AI Tutor & Asisten Guru Terkontrol (Backend-Only)**:
   - Asistensi tanya-konsep biologi berpagar kurikulum (guardrailed).
   - Pembuatan draf soal AI dengan status wajib review guru sebelum masuk kuis resmi.
   - Asistensi evaluasi esai berbasis rubrik sebagai rekomendasi (guru memegang otoritas penuh).
6. **Gamifikasi Berintegritas & Analitik Capaian**:
   - Poin Pengalaman (XP), level belajar, dan lencana pencapaian berbasis capaian nyata.
   - Analitik penguasaan materi per topik & capaian tujuan pembelajaran (C1-C6).
   - Ekspor rekap nilai kelas ke CSV tersanitasi.

#### 2.2 Kebutuhan Nonfungsional
- **Keamanan (Security-by-Design)**: Proteksi OWASP Top 10, sanitasi input/output, proteksi formula injection pada ekspor CSV, parameterisasi query SQL.
- **Aksesibilitas & UI**: Memenuhi standar WCAG 2.2 Level AA, tipografi Plus Jakarta Sans dan JetBrains Mono (angka tabular), zero-pill metadata discipline.
- **Observability**: Structured logs, request correlation ID, tracking latensi dan token AI.

---

### 3. DIAGRAM ARSITEKTUR SISTEM

```
[ FRONTEND CLIENT: React 19 + TypeScript + Tailwind CSS ]
   |
   | (REST API via Fetch / JSON + Bearer Auth Token)
   v
[ BACKEND SERVER: Express 4.x + Vite Middleware on Port 3000 ]
   |
   +---> [ Auth & RBAC Guard: Token validation, Role permissions, IDOR check ]
   |
   +---> [ Quiz & Assessment Engine: Time limit validation, Autosave, Deterministic Grading ]
   |
   +---> [ AI Service Adapter: @google/genai, prompt guardrails, Gemini 3.8 Flash ]
   |
   +---> [ Relational Database Engine: sql.js WebAssembly + Persistent SQLite Storage ]
            (Foreign keys, Unique constraints, ACID Transactions)
```

---

### 4. SKEMA RELASIONAL (ERD) INTI

- `users` (id, email, password_hash, full_name, role, xp, level, created_at)
- `classrooms` (id, name, code, teacher_id, academic_year, description, created_at)
- `classroom_members` (id, classroom_id, user_id, joined_at)
- `curricula` (id, name, phase, description, is_active)
- `topics` (id, curriculum_id, code, title, order_num, description, image_url)
- `learning_objectives` (id, topic_id, code, description, cognitive_level)
- `learning_materials` (id, topic_id, title, summary, key_terms, deep_dive, common_misconceptions, reflection_questions, source_ref)
- `questions` (id, topic_id, objective_id, question_type, cognitive_level, difficulty, question_text, options_json, answer_key_json, explanation, distractor_rationale_json, status, author_id, reviewer_id, version)
- `quizzes` (id, classroom_id, teacher_id, title, topic_id, duration_minutes, max_attempts, passing_score, shuffle_questions, shuffle_options, show_discussion_after, status)
- `quiz_questions` (id, quiz_id, question_id, order_num, points)
- `quiz_attempts` (id, quiz_id, student_id, attempt_number, status, start_time, end_time, time_limit_at, questions_snapshot_json, score, max_score, percentage)
- `student_answers` (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback, saved_at)
- `achievements` (id, code, title, description, badge_icon, xp_reward)
- `user_achievements` (id, user_id, achievement_id, unlocked_at)
- `xp_events` (id, user_id, event_type, xp_amount, description, created_at)
- `audit_logs` (id, user_id, action, resource, details, ip_address, created_at)

---

### 5. STRATEGI IMPLEMENTASI BERTAHAP
- **Tahap 1**: Database storage engine, skema relasional, inisialisasi tabel, dan seeding kurikulum biologi terverifikasi.
- **Tahap 2**: Backend REST API (Auth, Kurikulum, Bank Soal, Kelas, Mesin Kuis, Asistensi AI, Analitik).
- **Tahap 3**: Komponen UI frontend interaktif, portal siswa (materi, pengerjaan kuis real-time, tutor AI), portal guru (bank soal, pembuat kuis, koreksi uraian, analitik), dan panel admin.
- **Tahap 4**: Validasi pengujian unit, konsistensi data, dan audit kepatuhan.

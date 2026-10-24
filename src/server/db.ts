import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import bcrypt from 'bcryptjs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'biology_quiz.sqlite');
const BACKUP_DB_FILE = path.resolve(DB_DIR, 'biology_quiz_backup.sqlite');
const USERS_BACKUP_FILE = path.resolve(DB_DIR, 'saved_users_backup.json');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else if (fs.existsSync(BACKUP_DB_FILE)) {
    const fileBuffer = fs.readFileSync(BACKUP_DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
    initSchema(dbInstance);
    seedInitialData(dbInstance);
    restoreSavedUsersFromBackup(dbInstance);
    persistDb(dbInstance);
  }

  // Ensure 4-type core quiz exists (Pilihan Ganda, Benar/Salah, Menjodohkan, Uraian)
  ensureCore4TypeQuiz(dbInstance);
  ensureClassroomAndStudentColumns(dbInstance);
  ensureExpandedBiologyQuestions(dbInstance);

  return dbInstance;
}

function ensureCore4TypeQuiz(db: Database) {
  try {
    const stmt = db.prepare("SELECT id FROM quizzes WHERE id = 'quiz-bio-4tipe';");
    const exists = stmt.step();
    stmt.free();

    if (!exists) {
      db.run(`
        INSERT INTO quizzes (
          id, classroom_id, teacher_id, topic_id, title, description, duration_minutes, max_attempts, passing_score,
          shuffle_questions, shuffle_options, show_discussion_after, allow_retake, status
        ) VALUES (
          'quiz-bio-4tipe',
          'cls-x-a',
          'usr-teacher-01',
          'top-03',
          'Kuis Standar Biologi: PG, Benar/Salah, Menjodohkan & Uraian',
          'Asesmen terstruktur 4 format soal esensial: Pilihan Ganda (25 poin), Benar/Salah (25 poin), Menjodohkan (25 poin), dan Uraian (25 poin) dengan KKM 75.',
          30,
          3,
          75,
          0,
          1,
          1,
          1,
          'published'
        );
        INSERT OR IGNORE INTO quiz_questions (id, quiz_id, question_id, order_num, points) VALUES
          ('qq4-01', 'quiz-bio-4tipe', 'qst-01', 1, 25),
          ('qq4-02', 'quiz-bio-4tipe', 'qst-02', 2, 25),
          ('qq4-05', 'quiz-bio-4tipe', 'qst-05', 3, 25),
          ('qq4-07', 'quiz-bio-4tipe', 'qst-07', 4, 25);
      `);
      persistDb(db);
    }
  } catch (err) {
    console.error('Error ensuring core quiz', err);
  }
}

function ensureExpandedBiologyQuestions(db: Database) {
  try {
    const stmt = db.prepare("SELECT id FROM questions WHERE id = 'qst-08';");
    const exists = stmt.step();
    stmt.free();

    if (!exists) {
      const extraQuestions = [
        {
          id: 'qst-08',
          topic_id: 'top-01',
          objective_id: 'obj-01',
          question_type: 'single_choice',
          cognitive_level: 'C2',
          difficulty: 'easy',
          stimulus: 'Tingkatan organisasi kehidupan tersusun hierarkis dari molekul hingga biosfer.',
          question_text: 'Tingkat organisasi kehidupan yang merupakan kumpulan dari individu sejenis yang hidup pada suatu wilayah tertentu dan waktu yang sama disebut...',
          options_json: JSON.stringify([
            { id: 'opt-A', text: 'Komunitas' },
            { id: 'opt-B', text: 'Populasi' },
            { id: 'opt-C', text: 'Ekosistem' },
            { id: 'opt-D', text: 'Bioma' },
            { id: 'opt-E', text: 'Biosfer' }
          ]),
          answer_key_json: JSON.stringify({ correctOptionId: 'opt-B' }),
          explanation: 'Populasi didefinisikan sebagai kumpulan individu dari spesies yang sama yang mendiami suatu habitat tertentu pada kurun waktu yang sama.',
          source_ref: 'Campbell Biology 12th Ed Bab 1; Kurikulum Merdeka Fase E.'
        },
        {
          id: 'qst-09',
          topic_id: 'top-01',
          objective_id: 'obj-02',
          question_type: 'true_false',
          cognitive_level: 'C3',
          difficulty: 'medium',
          stimulus: 'Dalam eksperimen biologi, variabel percobaan diklasifikasikan menjadi variabel bebas, terikat, dan kontrol.',
          question_text: 'Variabel kontrol adalah variabel yang sengaja diubah-ubah oleh peneliti untuk mengamati dampaknya terhadap variabel terikat.',
          options_json: JSON.stringify([
            { id: 'opt-T', text: 'Benar' },
            { id: 'opt-F', text: 'Salah' }
          ]),
          answer_key_json: JSON.stringify({ isTrue: false }),
          explanation: 'Pernyataan ini SALAH. Variabel yang sengaja diubah-ubah adalah variabel bebas (independen), sedangkan variabel kontrol harus dijaga tetap konstan.',
          source_ref: 'Metodologi Penelitian Sains Biologi SMA Kemendikbud 2022.'
        },
        {
          id: 'qst-10',
          topic_id: 'top-02',
          objective_id: 'obj-03',
          question_type: 'single_choice',
          cognitive_level: 'C2',
          difficulty: 'medium',
          stimulus: 'Indonesia kaya akan keanekaragaman fauna yang dipisahkan oleh garis biogeografi.',
          question_text: 'Fauna Indonesia tipe Asiatis memiliki karakteristik didominasi oleh mamalia bertubuh besar. Contoh satwa yang termasuk tipe Asiatis adalah...',
          options_json: JSON.stringify([
            { id: 'opt-A', text: 'Kuskus dan Kanguru Pohon' },
            { id: 'opt-B', text: 'Burung Cenderawasih dan Kasuari' },
            { id: 'opt-C', text: 'Orangutan Sumatera dan Badak Bercula Satu' },
            { id: 'opt-D', text: 'Anoa dan Babirusa' },
            { id: 'opt-E', text: 'Komodo dan Maleo' }
          ]),
          answer_key_json: JSON.stringify({ correctOptionId: 'opt-C' }),
          explanation: 'Orangutan (Pongo abelii) dan Badak bercula satu (Rhinoceros sondaicus) adalah fauna khas tipe Asiatis (zona Sunda) di sebelah barat Garis Wallace.',
          source_ref: 'Biogeografi Indonesia; Campbell Biology Bab 25.'
        },
        {
          id: 'qst-11',
          topic_id: 'top-02',
          objective_id: 'obj-04',
          question_type: 'matching',
          cognitive_level: 'C3',
          difficulty: 'medium',
          stimulus: 'Terdapat berbagai kawasan konservasi hayati di Indonesia dengan fokus fauna dan flora terancam punah.',
          question_text: 'Jodohkan kawasan konservasi berikut dengan satwa langka yang dilindungi di dalamnya:',
          options_json: JSON.stringify({
            pairs: [
              { id: 'p1', premise: 'Taman Nasional Tanjung Puting (Kalimantan)', expectedChoice: 'Orangutan' },
              { id: 'p2', premise: 'Taman Nasional Way Kambas (Lampung)', expectedChoice: 'Gajah Sumatera' },
              { id: 'p3', premise: 'Taman Nasional Komodo (NTT)', expectedChoice: 'Biawak Komodo' },
              { id: 'p4', premise: 'Taman Nasional Lorentz (Papua)', expectedChoice: 'Burung Cenderawasih' }
            ],
            choices: ['Orangutan', 'Gajah Sumatera', 'Biawak Komodo', 'Burung Cenderawasih']
          }),
          answer_key_json: JSON.stringify({
            matches: {
              'p1': 'Orangutan',
              'p2': 'Gajah Sumatera',
              'p3': 'Biawak Komodo',
              'p4': 'Burung Cenderawasih'
            }
          }),
          explanation: 'Tanjung Puting terkenal dengan pusat rehabilitasi Orangutan, Way Kambas untuk suaka gajah Sumatera, TN Komodo habitat asli Varanus komodoensis, dan Lorentz melindungi burung Cenderawasih.',
          source_ref: 'Kementerian LHK RI - Konservasi Kawasan Hayati.'
        },
        {
          id: 'qst-12',
          topic_id: 'top-03',
          objective_id: 'obj-05',
          question_type: 'single_choice',
          cognitive_level: 'C3',
          difficulty: 'hard',
          stimulus: 'Struktur virus tersusun dari asam nukleat yang diselubungi oleh selubung pelindung protein.',
          question_text: 'Selubung protein pembungkus materi genetik virus yang tersusun atas subunit-subunit protein disebut...',
          options_json: JSON.stringify([
            { id: 'opt-A', text: 'Kapsid yang tersusun dari kapsomer' },
            { id: 'opt-B', text: 'Peptidoglikan yang tersusun dari asam amino' },
            { id: 'opt-C', text: 'Lipopolisakarida yang tersusun dari glikolipid' },
            { id: 'opt-D', text: 'Glikokaliks yang tersusun dari polisakarida' },
            { id: 'opt-E', text: 'Kloroplas yang tersusun dari grana' }
          ]),
          answer_key_json: JSON.stringify({ correctOptionId: 'opt-A' }),
          explanation: 'Kapsid adalah mantel pelindung protein virus yang tersusun dari unit-unit kecil berulang yang disebut kapsomer.',
          source_ref: 'Campbell Biology Bab 19.'
        },
        {
          id: 'qst-13',
          topic_id: 'top-03',
          objective_id: 'obj-06',
          question_type: 'essay',
          cognitive_level: 'C4',
          difficulty: 'medium',
          stimulus: 'Selain sebagai patogen pembawa penyakit, partikel virus dapat dimanfaatkan dalam bioteknologi modern.',
          question_text: 'Jelaskan minimal 2 contoh peranan virus yang menguntungkan bagi manusia dalam bidang kesehatan dan rekayasa genetika!',
          options_json: null,
          answer_key_json: JSON.stringify({
            keyPoints: [
              'Vektor dalam terapi gen untuk menyisipkan gen normal ke dalam sel target',
              'Pembuatan vaksin aktif/dilemahkan untuk memicu kekebalan tubuh adaptif',
              'Bakteriofag sebagai terapi fag pembasmi bakteri patogen resisten antibiotik'
            ]
          }),
          rubric_json: JSON.stringify({
            maxScore: 25,
            criteria: [
              { point: 15, description: 'Menjelaskan peran vektor terapi gen atau vaksinasi secara ilmiah' },
              { point: 10, description: 'Menjelaskan mekanisme terapi fag atau pembasmi hama biologis' }
            ]
          }),
          explanation: 'Virus dimanfaatkan sebagai vektor terapi gen (Adenovirus, Retrovirus), agen terapi fag penyerang bakteri patogen, serta bahan dasar rekayasa vaksin rekombinan.',
          source_ref: 'Campbell Biology 12th Ed Bab 19 & 20.'
        },
        {
          id: 'qst-14',
          topic_id: 'top-04',
          objective_id: 'obj-07',
          question_type: 'single_choice',
          cognitive_level: 'C3',
          difficulty: 'medium',
          stimulus: 'Pewarnaan Gram membagi bakteri menjadi dua kelompok: Gram positif dan Gram negatif.',
          question_text: 'Bakteri Gram positif tampak berwarna ungu saat pengamatan mikroskop setelah pewarnaan Gram karena...',
          options_json: JSON.stringify([
            { id: 'opt-A', text: 'Memiliki lapisan peptidoglikan tebal yang mengikat kuat kompleks kristal violet-iodin' },
            { id: 'opt-B', text: 'Memiliki membran luar lipid yang melarutkan zat warna pembanding safranin' },
            { id: 'opt-C', text: 'Tidak memiliki dinding sel sehingga menyerap seluruh zat pewarna dasar' },
            { id: 'opt-D', text: 'Mengandung pigmen klorofil alami di membran sitoplasma' },
            { id: 'opt-E', text: 'Mengalami lisis saat dibilas dengan alkohol etanol 96%' }
          ]),
          answer_key_json: JSON.stringify({ correctOptionId: 'opt-A' }),
          explanation: 'Bakteri Gram positif memiliki dinding sel tebal yang tersusun atas peptidoglikan berlapis banyak (90%) sehingga mengikat kuat kristal violet-iodin dan tidak mudah luntur oleh alkohol.',
          source_ref: 'Brock Biology of Microorganisms 15th Ed; Campbell Bab 27.'
        },
        {
          id: 'qst-15',
          topic_id: 'top-04',
          objective_id: 'obj-07',
          question_type: 'true_false',
          cognitive_level: 'C2',
          difficulty: 'easy',
          stimulus: 'Bakteri bereproduksi secara vegetatif (aseksual) dan mengalami rekombinasi materi genetik.',
          question_text: 'Konjugasi adalah perpindahan materi genetik plasmid antar dua sel bakteri melalui kontak langsung menggunakan pilus seks.',
          options_json: JSON.stringify([
            { id: 'opt-T', text: 'Benar' },
            { id: 'opt-F', text: 'Salah' }
          ]),
          answer_key_json: JSON.stringify({ isTrue: true }),
          explanation: 'Pernyataan ini BENAR. Konjugasi mentransfer plasmid DNA dari bakteri donor (F+) ke bakteri resipien (F-) melalui jembatan pilus konjugasi.',
          source_ref: 'Campbell Biology Bab 27 Reproduksi Prokariota.'
        },
        {
          id: 'qst-16',
          topic_id: 'top-04',
          objective_id: 'obj-07',
          question_type: 'short_answer',
          cognitive_level: 'C3',
          difficulty: 'medium',
          stimulus: 'Daur nitrogen tanah bergantung pada aktivitas bakteri fiksasi nitrogen simbiotik pada bintil akar tanaman polong-polongan (Fabaceae).',
          question_text: 'Genus bakteri yang bersimbiosis mutualisme dengan akar tanaman kacang-kacangan untuk memfiksasi nitrogen bebas (N2) dari udara adalah...',
          options_json: null,
          answer_key_json: JSON.stringify({ acceptedAnswers: ['Rhizobium', 'Rhizobium leguminosarum', 'bakteri rhizobium'] }),
          explanation: 'Rhizobium bersimbiosis pada bintil akar legum, mengubah gas nitrogen (N2) atmosfer menjadi amonia (NH3) yang dapat diserap tanaman.',
          source_ref: 'Campbell Biology Bab 37 Nutrisi Tumbuhan.'
        },
        {
          id: 'qst-17',
          topic_id: 'top-05',
          objective_id: 'obj-08',
          question_type: 'single_choice',
          cognitive_level: 'C2',
          difficulty: 'easy',
          stimulus: 'Ekosistem terdiri dari komponen biotik dan komponen abiotik yang saling berinteraksi.',
          question_text: 'Organisme autotrof yang mampu mengubah energi cahaya matahari menjadi energi kimia dalam bentuk molekul organik glukosa disebut...',
          options_json: JSON.stringify([
            { id: 'opt-A', text: 'Dekomposer' },
            { id: 'opt-B', text: 'Produsen Primer' },
            { id: 'opt-C', text: 'Konsumen Primer' },
            { id: 'opt-D', text: 'Detritivor' },
            { id: 'opt-E', text: 'Karnivora Puncak' }
          ]),
          answer_key_json: JSON.stringify({ correctOptionId: 'opt-B' }),
          explanation: 'Produsen primer (tumbuhan hijau, alga, fitoplankton) menyerap energi surya melalui fotosintesis untuk memproduksi biomassa primer.',
          source_ref: 'Campbell Biology Bab 55 Ekosistem.'
        },
        {
          id: 'qst-18',
          topic_id: 'top-05',
          objective_id: 'obj-08',
          question_type: 'complex_multiple',
          cognitive_level: 'C4',
          difficulty: 'hard',
          stimulus: 'Piramida ekologi menggambarkan struktur trofik suatu ekosistem.',
          question_text: 'Manakah dari pernyataan berikut yang TEPAT mengenai piramida energi dan aliran energi ekosistem? (Pilih semua yang benar)',
          options_json: JSON.stringify([
            { id: 'opt-1', text: 'Piramida energi selalu berbentuk tegak dan tidak pernah terbalik' },
            { id: 'opt-2', text: 'Efisiensi perpindahan energi antar tingkat trofik rata-rata berkisar 10%' },
            { id: 'opt-3', text: 'Energi yang hilang pada setiap tingkat trofik dilepaskan dalam bentuk panas respirasi' },
            { id: 'opt-4', text: 'Konsumen tersier memiliki biomassa energi yang lebih besar daripada produsen' }
          ]),
          answer_key_json: JSON.stringify({ correctOptionIds: ['opt-1', 'opt-2', 'opt-3'] }),
          explanation: 'Pernyataan 1, 2, dan 3 tepat. Pernyataan 4 salah karena energi berkurang pada setiap trofik sesuai Hukum Termodinamika II.',
          source_ref: 'Hukum Lindeman; Campbell Biology Bab 55.'
        },
        {
          id: 'qst-19',
          topic_id: 'top-05',
          objective_id: 'obj-08',
          question_type: 'ordering',
          cognitive_level: 'C3',
          difficulty: 'medium',
          stimulus: 'Aliran energi trofik pada ekosistem padang rumput savanna.',
          question_text: 'Urutkan rantai makanan berikut dari tingkat trofik terendah (produsen) hingga konsumen puncak:',
          options_json: JSON.stringify([
            { id: 'ord-1', text: 'Rumput Savana (Produsen)' },
            { id: 'ord-2', text: 'Zebra (Konsumen Primer / Herbivora)' },
            { id: 'ord-3', text: 'Singa (Konsumen Sekunder / Karnivora)' },
            { id: 'ord-4', text: 'Bakteri & Jamur Pengurai (Dekomposer)' }
          ]),
          answer_key_json: JSON.stringify({ correctOrder: ['ord-1', 'ord-2', 'ord-3', 'ord-4'] }),
          explanation: 'Urutan baku trofik: Produsen -> Herbivora -> Karnivora -> Dekomposer.',
          source_ref: 'Prinsip Ekologi Hewan Smith & Smith 2015.'
        },
        {
          id: 'qst-20',
          topic_id: 'top-06',
          objective_id: 'obj-09',
          question_type: 'single_choice',
          cognitive_level: 'C4',
          difficulty: 'medium',
          stimulus: 'Limbah pupuk fosfat dan nitrogen dari lahan pertanian kerap terbawa limpasan air hujan ke danau.',
          question_text: 'Peningkatan konsentrasi nutrien fosfat dan nitrat di perairan danau yang memicu ledakan alga (blooming) dan penurunan drastis oksigen terlarut disebut...',
          options_json: JSON.stringify([
            { id: 'opt-A', text: 'Biomagnifikasi' },
            { id: 'opt-B', text: 'Eutrofikasi' },
            { id: 'opt-C', text: 'Bioakumulasi' },
            { id: 'opt-D', text: 'Asidifikasi' },
            { id: 'opt-E', text: 'Salinisasi' }
          ]),
          answer_key_json: JSON.stringify({ correctOptionId: 'opt-B' }),
          explanation: 'Eutrofikasi adalah pengayaan nutrien di perairan yang memicu blooming fitoplankton. Dekomposisi alga mati oleh bakteri menghabiskan oksigen (anoksia).',
          source_ref: 'Campbell Biology Bab 56 Biologi Konservasi.'
        },
        {
          id: 'qst-21',
          topic_id: 'top-06',
          objective_id: 'obj-09',
          question_type: 'essay',
          cognitive_level: 'C5',
          difficulty: 'hard',
          stimulus: 'Senyawa kimia persisten seperti pestisida DDT dan mikroplastik tidak mudah terurai dalam tubuh makhluk hidup.',
          question_text: 'Jelaskan konsep fenomena biomagnifikasi (pemekatan hayati) dalam rantai makanan dan mengapa konsentrasi zat toksik tertinggi selalu ditemukan pada konsumen puncak (seperti elang atau manusia)!',
          options_json: null,
          answer_key_json: JSON.stringify({
            keyPoints: [
              'Zat toksik persisten tidak dapat diekskresikan dan terakumulasi dalam jaringan lemak (bioakumulasi)',
              'Konsumen memakan banyak biomassa dari tingkat trofik di bawahnya',
              'Konsentrasi toksin meningkat secara eksponensial di setiap tingkatan trofik (biomagnifikasi)',
              'Konsumen puncak berada di ujung rantai sehingga menimbun konsentrasi toksin tertinggi'
            ]
          }),
          rubric_json: JSON.stringify({
            maxScore: 25,
            criteria: [
              { point: 10, description: 'Menjelaskan sifat toksin lipofilik dan kegagalan ekskresi' },
              { point: 10, description: 'Menjelaskan pelipatgandaan konsentrasi sepanjang rantai trofik' },
              { point: 5, description: 'Menyimpulkan dampak fisiologis pada konsumen puncak' }
            ]
          }),
          explanation: 'Biomagnifikasi adalah proses peningkatan konsentrasi bahan kimia beracun sepanjang rantai makanan karena zat tersebut tidak dapat didegradasi.',
          source_ref: 'Rachel Carson (Silent Spring); Campbell Biology Bab 56.'
        },
        {
          id: 'qst-22',
          topic_id: 'top-06',
          objective_id: 'obj-09',
          question_type: 'true_false',
          cognitive_level: 'C4',
          difficulty: 'easy',
          stimulus: 'Pemanasan global dipicu oleh peningkatan konsentrasi gas rumah kaca di atmosfer bumi.',
          question_text: 'Gas Karbon Dioksida (CO2) dan Metana (CH4) memerangkap radiasi gelombang panjang inframerah yang dipantulkan bumi sehingga meningkatkan suhu rata-rata atmosfer.',
          options_json: JSON.stringify([
            { id: 'opt-T', text: 'Benar' },
            { id: 'opt-F', text: 'Salah' }
          ]),
          answer_key_json: JSON.stringify({ isTrue: true }),
          explanation: 'Pernyataan ini BENAR. Gas rumah kaca mengizinkan radiasi gelombang pendek surya masuk, namun menyerap radiasi inframerah keluar dan memancarkannya kembali ke permukaan bumi.',
          source_ref: 'IPCC Sixth Assessment Report; Campbell Biology Bab 56.'
        }
      ];

      for (const q of extraQuestions) {
        db.run(
          `INSERT OR IGNORE INTO questions (
            id, topic_id, objective_id, question_type, cognitive_level, difficulty, stimulus, question_text,
            options_json, answer_key_json, explanation, rubric_json, source_ref, status, author_id, reviewer_id, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'usr-teacher-01', 'usr-reviewer-01', 1);`,
          [
            q.id, q.topic_id, q.objective_id, q.question_type, q.cognitive_level, q.difficulty, q.stimulus, q.question_text,
            q.options_json, q.answer_key_json, q.explanation, q.rubric_json || null, q.source_ref
          ]
        );
      }
      persistDb(db);
    }
  } catch (err) {
    console.error('Error in ensureExpandedBiologyQuestions:', err);
  }
}

export const INITIAL_35_STUDENTS = [
  { nis: '240101', name: 'SITI AISYAH', gender: 'L', pg: 25, bs: 25, jd: 25, es: 18 },
  { nis: '240102', name: 'Aisyah Nur Rahmah', gender: 'P', pg: 25, bs: 25, jd: 25, es: 25 },
  { nis: '240103', name: 'Alifian Raka Putra', gender: 'L', pg: 25, bs: 25, jd: 25, es: 15 },
  { nis: '240104', name: 'Amanda Putri Maharani', gender: 'P', pg: 25, bs: 25, jd: 25, es: 22 },
  { nis: '240105', name: 'Andi Pratama', gender: 'L', pg: 25, bs: 25, jd: 25, es: 10 },
  { nis: '240106', name: 'Annisa Dwi Lestari', gender: 'P', pg: 25, bs: 25, jd: 25, es: 24 },
  { nis: '240107', name: 'Bagas Setiawan', gender: 'L', pg: 25, bs: 0, jd: 25, es: 15 }, // 65 (Remedial)
  { nis: '240108', name: 'Bima Arya Sena', gender: 'L', pg: 25, bs: 25, jd: 25, es: 18 },
  { nis: '240109', name: 'I GEDE AGUS ADNYANA', gender: 'L', pg: 25, bs: 25, jd: 25, es: 18 },
  { nis: '240110', name: 'Cantika Dewi Anggraini', gender: 'P', pg: 25, bs: 25, jd: 25, es: 23 },
  { nis: '240111', name: 'Daffa Rizky Ramadhan', gender: 'L', pg: 25, bs: 25, jd: 25, es: 20 },
  { nis: '240112', name: 'Denis Pratama', gender: 'L', pg: 0, bs: 25, jd: 25, es: 15 }, // 65 (Remedial)
  { nis: '240113', name: 'Devi Anggraini', gender: 'P', pg: 25, bs: 25, jd: 25, es: 22 },
  { nis: '240114', name: 'Dimas Wahyu Utomo', gender: 'L', pg: 25, bs: 25, jd: 25, es: 18 },
  { nis: '240115', name: 'Eka Putri Salsabila', gender: 'P', pg: 25, bs: 25, jd: 25, es: 25 },
  { nis: '240116', name: 'Fadhil Muhammad', gender: 'L', pg: 25, bs: 25, jd: 25, es: 12 }, // 87
  { nis: '240117', name: 'Fajar Nur Hidayat', gender: 'L', pg: 25, bs: 0, jd: 0, es: 20 }, // 45 (Remedial)
  { nis: '240118', name: 'Gita Savitri Dewi', gender: 'P', pg: 25, bs: 25, jd: 25, es: 24 },
  { nis: '240119', name: 'Hafidz Zaidan', gender: 'L', pg: 25, bs: 25, jd: 25, es: 19 },
  { nis: '240120', name: 'Hana Farida', gender: 'P', pg: 25, bs: 25, jd: 25, es: 25 },
  { nis: '240121', name: 'Ilham Fauzan', gender: 'L', pg: 25, bs: 25, jd: 25, es: 16 },
  { nis: '240122', name: 'Indah Permatasari', gender: 'P', pg: 25, bs: 25, jd: 25, es: 21 },
  { nis: '240123', name: 'Kevin Maulana', gender: 'L', pg: 0, bs: 25, jd: 25, es: 10 }, // 60 (Remedial)
  { nis: '240124', name: 'Lutfi Hakim', gender: 'L', pg: 25, bs: 25, jd: 25, es: 18 },
  { nis: '240125', name: 'Maya Indah Sari', gender: 'P', pg: 25, bs: 25, jd: 25, es: 25 },
  { nis: '240126', name: 'Muhammad Farhan', gender: 'L', pg: 25, bs: 25, jd: 25, es: 17 },
  { nis: '240127', name: 'Nabila Zahra', gender: 'P', pg: 25, bs: 25, jd: 25, es: 24 },
  { nis: '240128', name: 'Nurul Azizah', gender: 'P', pg: 25, bs: 25, jd: 25, es: 22 },
  { nis: '240129', name: 'Raditya Nugraha', gender: 'L', pg: 25, bs: 25, jd: 25, es: 15 },
  { nis: '240130', name: 'Rahmat Hidayat', gender: 'L', pg: 25, bs: 0, jd: 25, es: 18 }, // 68 (Remedial)
  { nis: '240131', name: 'Rina Kartika', gender: 'P', pg: 25, bs: 25, jd: 25, es: 25 },
  { nis: '240132', name: 'Rizki Firmansyah', gender: 'L', pg: 25, bs: 25, jd: 25, es: 12 }, // 87
  { nis: '240133', name: 'Siti Nur Haliza', gender: 'P', pg: 25, bs: 25, jd: 25, es: 24 },
  { nis: '240134', name: 'Tegar Wicaksono', gender: 'L', pg: 25, bs: 25, jd: 0, es: 15 }, // 65 (Remedial)
  { nis: '240135', name: 'Zahra Amelia Putri', gender: 'P', pg: 25, bs: 25, jd: 25, es: 25 }
];

function ensureClassroomAndStudentColumns(db: Database) {
  try {
    // Migration: add columns if they do not exist yet
    try { db.run("ALTER TABLE users ADD COLUMN nis TEXT;"); } catch {}
    try { db.run("ALTER TABLE users ADD COLUMN gender TEXT;"); } catch {}
    try { db.run("ALTER TABLE users ADD COLUMN nip TEXT;"); } catch {}
    try { db.run("ALTER TABLE users ADD COLUMN school_name TEXT;"); } catch {}

    // Safeguard: Retain existing users and their exact stored names, NIPs, and school names
    // Ensure classroom cls-x-a
    db.run(`
      INSERT OR IGNORE INTO classrooms (id, name, code, teacher_id, academic_year, description)
      VALUES ('cls-x-a', 'Kelas X-A Biologi', 'BIO-XA-2026', 'usr-teacher-01', '2026/2027', 'Kelas Biologi Fase E SMA/MA Reguler');
      UPDATE classrooms SET academic_year = '2026/2027' WHERE id = 'cls-x-a';
      UPDATE curricula SET name = 'Kurikulum Merdeka 2026/2027' WHERE id = 'curr-merdeka-e';
      INSERT OR IGNORE INTO classroom_members (id, classroom_id, user_id) VALUES ('cm-usr-stu-09', 'cls-x-a', 'usr-stu-09');
      DELETE FROM classroom_members WHERE classroom_id = 'cls-x-a' AND user_id IN ('usr-student-01', 'usr-student-02');
    `);

    // Check count of students in cls-x-a
    const stmt = db.prepare("SELECT COUNT(*) as count FROM classroom_members WHERE classroom_id = 'cls-x-a';");
    stmt.step();
    const count = (stmt.getAsObject() as any).count || 0;
    stmt.free();

    if (count < 35) {
      seed35StudentsInternal(db);
    }
  } catch (err) {
    console.error('Error in ensureClassroomAndStudentColumns', err);
  }
}

export function seed35StudentsInternal(db: Database) {
  const defaultPass = bcrypt.hashSync('Biologi2026!', 8);
  const quizId = 'quiz-bio-4tipe';

  INITIAL_35_STUDENTS.forEach((st, idx) => {
    const studentId = `usr-stu-${String(idx + 1).padStart(2, '0')}`;
    const email = `siswa.${st.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@sekolah.id`;

    // 1. Insert user only if not exists (preserves existing student name, NIS, etc.)
    db.run(`
      INSERT INTO users (id, email, password_hash, full_name, role, avatar, xp, level, nis, gender)
      VALUES (?, ?, ?, ?, 'student', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING;
    `, [
      studentId,
      email,
      defaultPass,
      st.name,
      st.gender === 'P' ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      st.pg + st.bs + st.jd + st.es >= 75 ? 400 + idx * 10 : 200 + idx * 5,
      st.pg + st.bs + st.jd + st.es >= 75 ? 3 : 2,
      st.nis,
      st.gender
    ]);

    // 2. Insert into classroom_members
    db.run(`
      INSERT OR IGNORE INTO classroom_members (id, classroom_id, user_id)
      VALUES (?, 'cls-x-a', ?);
    `, [`cm-${studentId}`, studentId]);

    // 3. Insert or update quiz attempt for quiz-bio-4tipe
    const totalScore = st.pg + st.bs + st.jd + st.es;
    const attemptId = `att-4t-${studentId}`;

    db.run(`
      INSERT OR REPLACE INTO quiz_attempts (
        id, quiz_id, student_id, attempt_number, status, start_time, end_time, time_limit_at,
        questions_snapshot_json, score, max_score, percentage, feedback, evaluated_at
      ) VALUES (
        ?, ?, ?, 1, 'evaluated',
        datetime('now', '-2 days'), datetime('now', '-2 days', '+24 minutes'), datetime('now', '-2 days', '+30 minutes'),
        '[]', ?, 100, ?, ?, datetime('now', '-2 days', '+30 minutes')
      );
    `, [
      attemptId,
      quizId,
      studentId,
      totalScore,
      totalScore,
      totalScore >= 75 ? 'Memenuhi Kriteria Ketuntasan Minimal (Tuntas).' : 'Belum mencapai KKM 75. Direkomendasikan mengikuti remedial.'
    ]);

    // 4. Insert student answers for each of the 4 question types
    // qst-01: PG (25)
    db.run(`
      INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
      VALUES (?, ?, 'qst-01', ?, ?, ?, ?);
    `, [
      `ans-${attemptId}-01`,
      attemptId,
      st.pg === 25 ? '{"selectedOptionId":"opt-B"}' : '{"selectedOptionId":"opt-A"}',
      st.pg === 25 ? 1 : 0,
      st.pg,
      st.pg === 25 ? 'Analisis pilihan ganda sangat tepat.' : 'Jawaban keliru pada identifikasi kapsid virus.'
    ]);

    // qst-02: True/False (25)
    db.run(`
      INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
      VALUES (?, ?, 'qst-02', ?, ?, ?, ?);
    `, [
      `ans-${attemptId}-02`,
      attemptId,
      st.bs === 25 ? '{"isTrue":false}' : '{"isTrue":true}',
      st.bs === 25 ? 1 : 0,
      st.bs,
      st.bs === 25 ? 'Pemahaman benar/salah akurat.' : 'Keliru mengidentifikasi sifat obligat parasit.'
    ]);

    // qst-05: Matching (25)
    db.run(`
      INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
      VALUES (?, ?, 'qst-05', ?, ?, ?, ?);
    `, [
      `ans-${attemptId}-05`,
      attemptId,
      st.jd === 25 ? '{"matches":{"pair-1":"Daur Litik","pair-2":"Daur Lisogenik","pair-3":"Kapsid Protein"}}' : '{"matches":{"pair-1":"Daur Lisogenik"}}',
      st.jd === 25 ? 1 : 0,
      st.jd,
      st.jd === 25 ? 'Semua pasangan premis terjodohkan dengan tepat.' : 'Terdapat ketidaktepatan pemasangan premis daur virus.'
    ]);

    // qst-07: Essay (25)
    db.run(`
      INSERT OR REPLACE INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
      VALUES (?, ?, 'qst-07', ?, ?, ?, ?);
    `, [
      `ans-${attemptId}-07`,
      attemptId,
      JSON.stringify({ text: `Virus tidak memiliki ribosom dan sitoplasma sehingga mutlak memerlukan sel inang untuk replikasi asam nukleat (${st.name}).` }),
      st.es >= 20 ? 1 : 0,
      st.es,
      `Nilai uraian ${st.es}/25. Argumentasi ilmiah ${st.es >= 20 ? 'sangat mendalam dan terstruktur.' : 'cukup baik namun perlu memperdalam terminologi ribosom dan sintesis protein.'}`
    ]);
  });

  persistDb(db);
}

export function persistDb(db?: Database) {
  const currentDb = db || dbInstance;
  if (!currentDb) return;
  try {
    const data = currentDb.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
    fs.writeFileSync(BACKUP_DB_FILE, Buffer.from(data));
    backupSavedUsers(currentDb);
  } catch (err) {
    console.error('Error persisting database:', err);
  }
}

export function backupSavedUsers(db?: Database) {
  const currentDb = db || dbInstance;
  if (!currentDb) return;
  try {
    const stmt = currentDb.prepare("SELECT id, email, password_hash, full_name, role, avatar, xp, level, nis, gender, nip, school_name, created_at, updated_at FROM users;");
    const users: any[] = [];
    while (stmt.step()) {
      users.push(stmt.getAsObject());
    }
    stmt.free();

    const cmStmt = currentDb.prepare("SELECT id, classroom_id, user_id FROM classroom_members;");
    const members: any[] = [];
    while (cmStmt.step()) {
      members.push(cmStmt.getAsObject());
    }
    cmStmt.free();

    fs.writeFileSync(USERS_BACKUP_FILE, JSON.stringify({ users, members, updatedAt: new Date().toISOString() }, null, 2));
  } catch (err) {
    console.error('Error backing up saved users:', err);
  }
}

export function restoreSavedUsersFromBackup(db: Database) {
  try {
    if (!fs.existsSync(USERS_BACKUP_FILE)) return;
    const raw = fs.readFileSync(USERS_BACKUP_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data.users)) {
      for (const u of data.users) {
        db.run(`
          INSERT INTO users (id, email, password_hash, full_name, role, avatar, xp, level, nis, gender, nip, school_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            full_name = excluded.full_name,
            email = excluded.email,
            role = excluded.role,
            nip = excluded.nip,
            school_name = excluded.school_name,
            nis = excluded.nis,
            gender = excluded.gender;
        `, [u.id, u.email, u.password_hash, u.full_name, u.role, u.avatar, u.xp, u.level, u.nis, u.gender, u.nip, u.school_name]);
      }
    }
    if (Array.isArray(data.members)) {
      for (const m of data.members) {
        db.run(`INSERT OR IGNORE INTO classroom_members (id, classroom_id, user_id) VALUES (?, ?, ?);`, [m.id, m.classroom_id, m.user_id]);
      }
    }
  } catch (e) {
    console.error('Error restoring saved users from backup:', e);
  }
}

export function query<T = any>(sqlStr: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sqlStr);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sqlStr: string, params: any[] = []): T | null {
  const res = query<T>(sqlStr, params);
  return res.length > 0 ? res[0] : null;
}

let inTransaction = false;

export function run(sqlStr: string, params: any[] = []): { changes: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sqlStr, params);
  if (!inTransaction) {
    persistDb();
  }
  return { changes: dbInstance.getRowsModified() };
}

export function transaction<T>(fn: () => T): T {
  if (!dbInstance) throw new Error('Database not initialized');
  inTransaction = true;
  try {
    dbInstance.run('BEGIN TRANSACTION;');
    const result = fn();
    dbInstance.run('COMMIT;');
    inTransaction = false;
    persistDb();
    return result;
  } catch (error) {
    inTransaction = false;
    try {
      dbInstance.run('ROLLBACK;');
    } catch {
      // Ignored
    }
    throw error;
  }
}

function initSchema(db: Database) {
  db.run(`
    -- Tabel Pengguna & Hak Akses
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin', 'reviewer')),
      avatar TEXT,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Kelas Pembelajaran
    CREATE TABLE IF NOT EXISTS classrooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      teacher_id TEXT NOT NULL REFERENCES users(id),
      academic_year TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Keanggotaan Kelas
    CREATE TABLE IF NOT EXISTS classroom_members (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(classroom_id, user_id)
    );

    -- Kurikulum & Topik Biologi Kelas X
    CREATE TABLE IF NOT EXISTS curricula (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phase TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      curriculum_id TEXT NOT NULL REFERENCES curricula(id),
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      order_num INTEGER NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      prerequisites TEXT
    );

    CREATE TABLE IF NOT EXISTS learning_objectives (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      code TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      cognitive_level TEXT NOT NULL CHECK(cognitive_level IN ('C1','C2','C3','C4','C5','C6'))
    );

    CREATE TABLE IF NOT EXISTS learning_materials (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      key_terms TEXT NOT NULL,
      deep_dive TEXT NOT NULL,
      contextual_example TEXT NOT NULL,
      common_misconceptions TEXT NOT NULL,
      reflection_questions TEXT NOT NULL,
      source_reference TEXT NOT NULL,
      verified_status INTEGER DEFAULT 1,
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Bank Soal Terstandar
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id),
      objective_id TEXT NOT NULL REFERENCES learning_objectives(id),
      question_type TEXT NOT NULL CHECK(question_type IN ('single_choice', 'true_false', 'complex_multiple', 'matching', 'ordering', 'short_answer', 'essay')),
      cognitive_level TEXT NOT NULL CHECK(cognitive_level IN ('C1','C2','C3','C4','C5','C6')),
      difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
      stimulus TEXT,
      question_text TEXT NOT NULL,
      options_json TEXT, -- array of options for choice, matching, or ordering
      answer_key_json TEXT NOT NULL, -- answer data for deterministic evaluation
      explanation TEXT NOT NULL,
      distractor_rationale_json TEXT,
      rubric_json TEXT, -- rubric for essay grading
      source_ref TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('draft', 'pending_review', 'approved', 'archived')),
      author_id TEXT REFERENCES users(id),
      reviewer_id TEXT REFERENCES users(id),
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Kuis & Asesmen
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      classroom_id TEXT REFERENCES classrooms(id),
      teacher_id TEXT NOT NULL REFERENCES users(id),
      topic_id TEXT REFERENCES topics(id),
      title TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      max_attempts INTEGER NOT NULL DEFAULT 1,
      passing_score INTEGER NOT NULL DEFAULT 75,
      shuffle_questions INTEGER DEFAULT 1,
      shuffle_options INTEGER DEFAULT 1,
      show_discussion_after INTEGER DEFAULT 1,
      allow_retake INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft', 'scheduled', 'published', 'closed', 'archived')),
      start_time DATETIME,
      end_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      order_num INTEGER NOT NULL,
      points INTEGER NOT NULL DEFAULT 10,
      UNIQUE(quiz_id, question_id)
    );

    -- Attempt & Pengerjaan Siswa
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id),
      student_id TEXT NOT NULL REFERENCES users(id),
      attempt_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'submitted', 'evaluated', 'expired')),
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME,
      time_limit_at DATETIME NOT NULL,
      questions_snapshot_json TEXT NOT NULL,
      score REAL DEFAULT 0,
      max_score REAL DEFAULT 100,
      percentage REAL DEFAULT 0,
      feedback TEXT,
      evaluated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id),
      answer_data_json TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      points_earned REAL DEFAULT 0,
      teacher_feedback TEXT,
      ai_evaluation_draft_json TEXT,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(attempt_id, question_id)
    );

    -- Gamifikasi & Riwayat XP
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      badge_icon TEXT NOT NULL,
      xp_reward INTEGER NOT NULL DEFAULT 50,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL REFERENCES achievements(id),
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS xp_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      xp_amount INTEGER NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Log Keamanan & Perubahan Nilai
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- AI Observability & Quota Tracking
    CREATE TABLE IF NOT EXISTS ai_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action_type TEXT NOT NULL,
      prompt_length INTEGER,
      response_length INTEGER,
      tokens_used INTEGER,
      latency_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedInitialData(db: Database) {
  const salt = bcrypt.genSaltSync(10);
  const defaultPass = bcrypt.hashSync('Biologi2026!', salt);

  // Users: Guru, Siswa 1, Siswa 2, Admin, Reviewer
  const users = [
    {
      id: 'usr-teacher-01',
      email: 'epibiologi24@gmail.com',
      password_hash: defaultPass,
      full_name: 'Evi Dwiyanti, S.Pd',
      role: 'teacher',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      xp: 1200,
      level: 5,
    },
    {
      id: 'usr-student-01',
      email: 'siswa.andi@sekolah.id',
      password_hash: defaultPass,
      full_name: 'SITI AISYAH',
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      xp: 450,
      level: 3,
    },
    {
      id: 'usr-student-02',
      email: 'siswa.bunga@sekolah.id',
      password_hash: defaultPass,
      full_name: 'Bunga Citra Lestari',
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      xp: 680,
      level: 4,
    },
    {
      id: 'usr-admin-01',
      email: 'admin.biologi@sekolah.id',
      password_hash: defaultPass,
      full_name: 'Evi Dwiyanti, S.Pd (Admin)',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      xp: 3000,
      level: 10,
    },
    {
      id: 'usr-reviewer-01',
      email: 'reviewer.yasri@sekolah.id',
      password_hash: defaultPass,
      full_name: 'Muhammad Yasri, S.Pd., M.Pd (Wakasek Kurikulum)',
      role: 'reviewer',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      xp: 2200,
      level: 8,
    },
  ];

  for (const u of users) {
    db.run(
      `INSERT INTO users (id, email, password_hash, full_name, role, avatar, xp, level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [u.id, u.email, u.password_hash, u.full_name, u.role, u.avatar, u.xp, u.level]
    );
  }

  // Kurikulum Merdeka Fase E
  db.run(`
    INSERT INTO curricula (id, name, phase, description, is_active)
    VALUES ('curr-merdeka-e', 'Kurikulum Merdeka 2026/2027', 'Fase E (Kelas X)', 'Capaian Pembelajaran Sains Biologi: Menjelaskan fenomena biologi, merancang dan melakukan penyelidikan ilmiah, serta mengevaluasi isu sosio-saintifik keanekaragaman hayati dan bioteknologi.', 1);
  `);

  // Classroom
  db.run(`
    INSERT INTO classrooms (id, name, code, teacher_id, academic_year, description)
    VALUES ('cls-x-a', 'Kelas X-MIPA 1 (Biologi)', 'BIOX1-2026', 'usr-teacher-01', '2026/2027', 'Kelas Reguler Biologi Kelas X Semester Ganjil - SMA Negeri 1 Laboratorium');
  `);

  // Members
  db.run(`INSERT INTO classroom_members (id, classroom_id, user_id) VALUES ('cm-01', 'cls-x-a', 'usr-student-01');`);
  db.run(`INSERT INTO classroom_members (id, classroom_id, user_id) VALUES ('cm-02', 'cls-x-a', 'usr-student-02');`);

  // Topik-Topik Resmi Biologi Kelas X
  const topics = [
    {
      id: 'top-01',
      curriculum_id: 'curr-merdeka-e',
      code: 'BIO.X.1',
      title: 'Ruang Lingkup Biologi & Kerja Ilmiah',
      order_num: 1,
      description: 'Hakikat ilmu biologi, objek dan tingkat organisasi kehidupan, metode ilmiah, keselamatan kerja laboratorium, dan variabel eksperimen.',
      image_url: '/src/assets/images/biology_laboratory_safety_1792650717609.jpg',
      prerequisites: 'Keterampilan proses sains SMP/MTs (pengamatan dasar)',
    },
    {
      id: 'top-02',
      curriculum_id: 'curr-merdeka-e',
      code: 'BIO.X.2',
      title: 'Keanekaragaman Hayati Indonesia',
      order_num: 2,
      description: 'Tingkat keanekaragaman gen, jenis, dan ekosistem; persebaran fauna garis Wallace dan Weber; serta ancaman dan pelestarian in-situ/ex-situ.',
      image_url: '/src/assets/images/topic_biodiversity_ecosystem_1792650717710.jpg',
      prerequisites: 'BIO.X.1',
    },
    {
      id: 'top-03',
      curriculum_id: 'curr-merdeka-e',
      code: 'BIO.X.3',
      title: 'Virus & Peranannya dalam Kehidupan',
      order_num: 3,
      description: 'Karakteristik aseluler virus, struktur kapsid dan asam nukleat, daur litik dan lisogenik, peranan virus yang merugikan serta pemanfaatannya (vektor terapi gen, vaksin).',
      image_url: '/src/assets/images/topic_microbiology_virus_bacteria_1792650718955.jpg',
      prerequisites: 'BIO.X.1, Struktur Dasar Sel',
    },
    {
      id: 'top-04',
      curriculum_id: 'curr-merdeka-e',
      code: 'BIO.X.4',
      title: 'Bakteri & Mikroorganisme Prokariotik',
      order_num: 4,
      description: 'Perbedaan Archaebacteria dan Eubacteria, struktur dinding peptidoglikan (Gram positif/negatif), reproduksi paraseksual (transformasi, transduksi, konjugasi), serta peran dalam daur biogeokimia.',
      image_url: '/src/assets/images/topic_microbiology_virus_bacteria_1792650718955.jpg',
      prerequisites: 'BIO.X.3',
    },
    {
      id: 'top-05',
      curriculum_id: 'curr-merdeka-e',
      code: 'BIO.X.5',
      title: 'Ekosistem, Interaksi & Aliran Energi',
      order_num: 5,
      description: 'Komponen biotik dan abiotik, interaksi simbiotik dan trofik, rantai dan jaring-jaring makanan, piramida ekologi (energi, biomassa, jumlah), dan produktivitas primer.',
      image_url: '/src/assets/images/hero_biology_exploration_1792650716855.jpg',
      prerequisites: 'BIO.X.2',
    },
    {
      id: 'top-06',
      curriculum_id: 'curr-merdeka-e',
      code: 'BIO.X.6',
      title: 'Perubahan Lingkungan & Konservasi',
      order_num: 6,
      description: 'Pencemaran air, udara, dan tanah; efek rumah kaca dan pemanasan global; akumulasi bahan beracun (biomagnifikasi); serta etika konservasi lingkungan.',
      image_url: '/src/assets/images/topic_biodiversity_ecosystem_1792650717710.jpg',
      prerequisites: 'BIO.X.5',
    },
  ];

  for (const t of topics) {
    db.run(
      `INSERT INTO topics (id, curriculum_id, code, title, order_num, description, image_url, prerequisites)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [t.id, t.curriculum_id, t.code, t.title, t.order_num, t.description, t.image_url, t.prerequisites]
    );
  }

  // Tujuan Pembelajaran (Learning Objectives) dengan tingkat C1-C6
  const objectives = [
    { id: 'obj-01', topic_id: 'top-01', code: 'TP-1.1', desc: 'Mengidentifikasi objek kajian biologi dari tingkat molekul hingga biosfer.', level: 'C1' },
    { id: 'obj-02', topic_id: 'top-01', code: 'TP-1.2', desc: 'Menganalisis variabel kontrol, bebas, dan terikat dalam rancangan percobaan biologi.', level: 'C4' },
    { id: 'obj-03', topic_id: 'top-02', code: 'TP-2.1', desc: 'Membedakan keanekaragaman tingkat gen, jenis, dan ekosistem melalui contoh flora/fauna Indonesia.', level: 'C2' },
    { id: 'obj-04', topic_id: 'top-02', code: 'TP-2.2', desc: 'Mengevaluasi efektivitas metode pelestarian in-situ dan ex-situ terhadap satwa endemik langka.', level: 'C5' },
    { id: 'obj-05', topic_id: 'top-03', code: 'TP-3.1', desc: 'Menjelaskan tahapan daur litik dan lisogenik pada replikasi bakteriofag.', level: 'C2' },
    { id: 'obj-06', topic_id: 'top-03', code: 'TP-3.2', desc: 'Menganalisis mekanisme kerja vaksin mRNA dalam merangsang respon imun adaptif terhadap antigen virus.', level: 'C4' },
    { id: 'obj-07', topic_id: 'top-04', code: 'TP-4.1', desc: 'Membandingkan struktur dinding sel bakteri Gram positif dan Gram negatif berdasarkan komposisi peptidoglikan.', level: 'C3' },
    { id: 'obj-08', topic_id: 'top-05', code: 'TP-5.1', desc: 'Menganalisis hukum termodinamika pada transfer energi 10% antar tingkat trofik.', level: 'C4' },
    { id: 'obj-09', topic_id: 'top-06', code: 'TP-6.1', desc: 'Mengevaluasi dampak fenomena biomagnifikasi mikroplastik dan pestisida DDT pada konsumen puncak.', level: 'C5' },
  ];

  for (const o of objectives) {
    db.run(
      `INSERT INTO learning_objectives (id, topic_id, code, description, cognitive_level)
       VALUES (?, ?, ?, ?, ?);`,
      [o.id, o.topic_id, o.code, o.desc, o.level]
    );
  }

  // Materi Pembelajaran Terverifikasi
  db.run(`
    INSERT INTO learning_materials (
      id, topic_id, title, summary, key_terms, deep_dive, contextual_example, common_misconceptions, reflection_questions, source_reference, verified_status, created_by
    ) VALUES (
      'mat-01',
      'top-03',
      'Karakteristik & Replikasi Virus (Daur Litik dan Lisogenik)',
      'Virus merupakan entitas aseluler (bukan sel) berukuran submikroskopis yang hanya dapat bereplikasi di dalam sel inang hidup (parasit intraseluler obligat). Materi genetik virus berupa DNA atau RNA yang diselubungi kapsid protein.',
      'Aseluler, Kapsid, Kapsomer, Bakteriofag, Daur Litik, Daur Lisogenik, Profag, Reverse Transcriptase',
      'Struktur virus terdiri atas asam nukleat (genom) tunggal atau ganda, kapsid pelindung, serta terkadang sampul lipid yang diturunkan dari membran sel inang. Pada daur litik: virus menempel (adsorpsi), menginjeksikan genom (penetrasi), mensintesis komponen viral dan menghancurkan DNA inang (sintesis/replikasi), merakit partikel virion baru (perakitan), dan melisiskan sel inang untuk melepaskan virion. Pada daur lisogenik: DNA virus terintegrasi ke dalam kromosom sel inang membentuk profag tanpa merusak sel inang seketika, dan ikut bereplikasi saat sel inang membelah.',
      'Contoh nyata: Virus HIV menginfeksi limfosit T CD4+, serta Bakteriofag T4 yang menginfeksi Escherichia coli di saluran pencernaan.',
      'Miskonsepsi Umum: 1) Anggapan bahwa virus adalah sel mikroorganisme seperti bakteri. Faktanya virus tidak memiliki sitoplasma, ribosom, atau metabolisme mandiri. 2) Penggunaan antibiotik untuk membunuh virus. Faktanya antibiotik hanya merusak target struktural seluler bakteri (seperti peptidoglikan atau ribosom 70S) dan tidak berdampak pada virus.',
      '1. Mengapa virus dikategorikan sebagai benda peralihan antara tak hidup dan hidup? 2. Kondisi lingkungan apa yang dapat memicu profag dalam daur lisogenik beralih ke daur litik?',
      'Campbell Biology 12th Edition (Urry et al., 2020), Bab 19; Buku Guru Biologi SMA/MA Kelas X, Kemendikbudristek BSKAP 2022.',
      1,
      'usr-teacher-01'
    );
  `);

  db.run(`
    INSERT INTO learning_materials (
      id, topic_id, title, summary, key_terms, deep_dive, contextual_example, common_misconceptions, reflection_questions, source_reference, verified_status, created_by
    ) VALUES (
      'mat-02',
      'top-02',
      'Keanekaragaman Hayati Indonesia: Garis Wallace & Weber',
      'Indonesia memiliki kekayaan megabiodiversitas dunia berkat letak geografis di zona tropis antara dua benua (Asia dan Australia), terbagi menjadi wilayah Oriental (Asiatis), Peralihan (Wallacea), dan Australis.',
      'Megabiodiversitas, Garis Wallace, Garis Weber, Endemisme, In-situ, Ex-situ, Cagar Biosfer',
      'Garis Wallace memisahkan fauna tipe Asiatis (Sumatera, Jawa, Kalimantan) dengan fauna wilayah Peralihan (Sulawesi, Nusa Tenggara). Fauna Asiatis didominasi mamalia besar berplasenta (gajah, harimau, badak, orangutan) dan kera. Garis Weber memisahkan zona Peralihan dengan Australis (Papua, Maluku) yang bercirikan mamalia berkantung (marsupialia seperti kuskus dan kanguru pohon) serta burung berbulu indah (Cenderawasih). Di zona Peralihan Sulawesi ditemukan satwa endemik purba seperti Anoa, Babirusa, dan Burung Maleo.',
      'Taman Nasional Komodo di NTT (konservasi in-situ) dan Kebun Raya Bogor (konservasi ex-situ tumbuhan langka).',
      'Miskonsepsi Umum: Menyamakan konservasi in-situ dan ex-situ. In-situ adalah pelestarian di habitat aslinya (Taman Nasional, Suaka Margasatwa), sedangkan ex-situ adalah perlindungan di luar habitat alami akibat habitat aslinya terancam (Taman Safari, Kebun Binatang, Bank Plasma Nutfah).',
      'Bagaimana isolasi geografis di pulau-pulau Nusantara memicu terjadinya spesiasi dan tingkat endemisme yang tinggi?',
      'Buku Siswa Biologi Kelas X, Pusat Perbukuan Balitbang Kemendikbud 2021; Whitmore, T. C. (1984), Tropical Rain Forests of the Far East.',
      1,
      'usr-teacher-01'
    );
  `);

  db.run(`
    INSERT INTO learning_materials (
      id, topic_id, title, summary, key_terms, deep_dive, contextual_example, common_misconceptions, reflection_questions, source_reference, verified_status, created_by
    ) VALUES (
      'mat-03',
      'top-05',
      'Ekosistem & Efisiensi Aliran Energi Trofik',
      'Energi matahari memasuki ekosistem melalui fotosintesis oleh produsen primer dan ditransfer melintasi tingkat trofik dengan kehilangan energi sekitar 90% pada setiap tingkatan sebagai panas respirasi dan ekskresi.',
      'Tingkat Trofik, Efisiensi Ekologi, Hukum Termodinamika II, Biomassa, Piramida Energi, Dekomposer',
      'Sesuai Hukum Termodinamika II, setiap transformasi energi meningkatkan entropi dan tidak pernah 100% efisien. Hukum 10% Lindeman menyatakan bahwa rata-rata hanya ~10% energi kimia dari suatu tingkat trofik yang diubah menjadi biomassa pada tingkat trofik berikutnya. Inilah alasan mengapa rantai makanan di alam umumnya terbatas pada 4 sampai 5 tingkat trofik saja, karena energi yang tersisa pada tingkat puncak tidak lagi cukup untuk menopang populasi predator tingkat berikutnya.',
      'Rantai makanan di ekosistem sawah: Padi (10.000 kJ) -> Belalang (1.000 kJ) -> Katak (100 kJ) -> Ular (10 kJ) -> Elang (1 kJ).',
      'Miskonsepsi: Piramida energi bisa terbalik. Faktanya piramida energi SELALU tegak karena energi tidak dapat bertambah saat mengalir ke tingkat atas. Piramida yang bisa terbalik hanyalah piramida jumlah atau piramida biomassa di ekosistem perairan.',
      'Mengapa pola makan berbasis nabati (menjadi konsumen primer) secara termodinamika jauh lebih efisien dalam mendukung ketahanan pangan populasi manusia daripada pola makan karnivora?',
      'Smith & Smith (2015), Elements of Ecology 9th Edition; Campbell Biology (2020) Bab 55: Ecosystems and Restoration Ecology.',
      1,
      'usr-teacher-01'
    );
  `);

  // Bank Soal Terverifikasi (Berbagai Format: PG, Benar/Salah, Multi-choice, Menjodohkan, Mengurutkan, Isian, Uraian)
  const questions = [
    {
      id: 'qst-01',
      topic_id: 'top-03',
      objective_id: 'obj-05',
      question_type: 'single_choice',
      cognitive_level: 'C2',
      difficulty: 'medium',
      stimulus: 'Pada siklus replikasi virus bakteriofag, terdapat dua jalur utama: daur litik dan daur lisogenik.',
      question_text: 'Peristiwa yang menjadi pembeda utama antara daur lisogenik dengan daur litik pada replikasi bakteriofag adalah...',
      options_json: JSON.stringify([
        { id: 'opt-A', text: 'Asam nukleat virus diinjeksikan ke sitoplasma sel inang' },
        { id: 'opt-B', text: 'Genom virus menyatu dengan kromosom bakteri membentuk profag tanpa merusak sel inang' },
        { id: 'opt-C', text: 'Sel inang segera mengalami lisis setelah proses perakitan virion baru' },
        { id: 'opt-D', text: 'Kapsid virus mengikat reseptor protein spesifik pada dinding bakteri' },
        { id: 'opt-E', text: 'Virus memanfaatkan ribosom bakteri untuk membentuk enzim lisozim aktif' }
      ]),
      answer_key_json: JSON.stringify({ correctOptionId: 'opt-B' }),
      explanation: 'Pada daur lisogenik, DNA virus tidak langsung mengambil alih metabolisme sel inang, melainkan menyisip ke dalam kromosom bakteri inang membentuk struktur stabil yang disebut profag. Sel bakteri tetap hidup dan membelah secara normal bersama genom virus.',
      distractor_rationale_json: JSON.stringify({
        'opt-A': 'Injeksi asam nukleat terjadi pada kedua daur (litik dan lisogenik).',
        'opt-C': 'Lisis sel inang segera adalah karakteristik daur litik, bukan lisogenik.',
        'opt-D': 'Adsorpsi ke reseptor terjadi pada tahap awal kedua daur.',
        'opt-E': 'Sintesis enzim lisozim terjadi menjelang pembebasan virion pada daur litik.'
      }),
      source_ref: 'Campbell Biology 12th Ed, Bab 19 Replikasi Bakteriofag.',
      status: 'approved',
      author_id: 'usr-teacher-01',
      reviewer_id: 'usr-reviewer-01',
      version: 1
    },
    {
      id: 'qst-02',
      topic_id: 'top-03',
      objective_id: 'obj-06',
      question_type: 'true_false',
      cognitive_level: 'C2',
      difficulty: 'easy',
      stimulus: 'Penggunaan antibiotik seperti amoksisilin dan sefiksim kerap disalahgunakan oleh masyarakat saat terkena flu atau selesma.',
      question_text: 'Antibiotik efektif untuk membunuh partikel virus Influenza karena antibiotik mampu menghancurkan kapsid protein virus.',
      options_json: JSON.stringify([
        { id: 'opt-T', text: 'Benar' },
        { id: 'opt-F', text: 'Salah' }
      ]),
      answer_key_json: JSON.stringify({ isTrue: false }),
      explanation: 'Pernyataan ini SALAH. Antibiotik dirancang secara spesifik untuk menghambat jalur biokimia seluler bakteri (seperti sintesis dinding peptidoglikan atau ribosom 70S bakteri). Virus tidak memiliki dinding sel peptidoglikan maupun metabolisme sel mandiri, sehingga antibiotik tidak memiliki target kerja pada virus.',
      distractor_rationale_json: JSON.stringify({
        'opt-T': 'Miskonsepsi medis yang berbahaya yang menyebabkan resistensi antibiotik bakteri.'
      }),
      source_ref: 'WHO Guidelines on Antimicrobial Resistance; Campbell Biology Bab 19 & 27.',
      status: 'approved',
      author_id: 'usr-teacher-01',
      reviewer_id: 'usr-reviewer-01',
      version: 1
    },
    {
      id: 'qst-03',
      topic_id: 'top-02',
      objective_id: 'obj-03',
      question_type: 'complex_multiple',
      cognitive_level: 'C4',
      difficulty: 'hard',
      stimulus: 'Indonesia terbagi menjadi tiga zona fauna oleh Garis Wallace dan Garis Weber: Asiatis (Sunda), Peralihan (Wallacea), dan Australis (Sahul).',
      question_text: 'Manakah dari pernyataan berikut yang TEPAT mengenai karakteristik dan fauna zona Peralihan (Wallacea)? (Pilihlah semua yang benar)',
      options_json: JSON.stringify([
        { id: 'opt-1', text: 'Zona Wallacea mencakup kepulauan Sulawesi, Maluku, dan Nusa Tenggara' },
        { id: 'opt-2', text: 'Fauna zona ini memiliki tingkat endemisme yang sangat tinggi akibat isolasi pulau yang panjang' },
        { id: 'opt-3', text: 'Anoa (Bubalus depressicornis) dan Babirusa (Babyrousa celebensis) adalah contoh fauna khas zona ini' },
        { id: 'opt-4', text: 'Didominasi secara mutlak oleh mamalia berkantung besar seperti Kanguru pohon' }
      ]),
      answer_key_json: JSON.stringify({ correctOptionIds: ['opt-1', 'opt-2', 'opt-3'] }),
      explanation: 'Pernyataan 1, 2, dan 3 benar. Zona Wallacea (Sulawesi & Nusa Tenggara) merupakan zona percampuran unik dengan satwa purba endemik seperti Anoa dan Babirusa. Pernyataan 4 salah karena mamalia berkantung merupakan ciri khas utama zona Australis (Papua/Sahul), bukan Peralihan.',
      distractor_rationale_json: JSON.stringify({
        'opt-4': 'Mamalia berkantung (marsupialia) adalah ciri khas fauna Australis di timur Garis Weber.'
      }),
      source_ref: 'Biogeografi Kepulauan Wallacea (Alfred Russel Wallace, The Malay Archipelago 1869).',
      status: 'approved',
      author_id: 'usr-teacher-01',
      reviewer_id: 'usr-reviewer-01',
      version: 1
    },
    {
      id: 'qst-04',
      topic_id: 'top-01',
      objective_id: 'obj-02',
      question_type: 'ordering',
      cognitive_level: 'C3',
      difficulty: 'medium',
      stimulus: 'Seorang siswa melakukan penyelidikan ilmiah untuk menguji pengaruh intensitas cahaya terhadap laju fotosintesis tanaman Hydrilla verticillata.',
      question_text: 'Urutkan tahapan metode ilmiah yang benar dari langkah pertama hingga langkah akhir:',
      options_json: JSON.stringify([
        { id: 'step-1', text: 'Merumuskan hipotesis yang dapat diuji secara empiris' },
        { id: 'step-2', text: 'Mengidentifikasi masalah dan melakukan observasi awal' },
        { id: 'step-3', text: 'Merancang dan melaksanakan eksperimen dengan variabel kontrol' },
        { id: 'step-4', text: 'Mengumpulkan, menganalisis data, dan menarik kesimpulan' },
        { id: 'step-5', text: 'Mempublikasikan hasil laporan ilmiah' }
      ]),
      answer_key_json: JSON.stringify({ correctOrder: ['step-2', 'step-1', 'step-3', 'step-4', 'step-5'] }),
      explanation: 'Urutan baku kerja ilmiah: (1) Observasi & identifikasi masalah, (2) Perumusan hipotesis, (3) Perancangan eksperimen terukur, (4) Analisis data kuantitatif & kesimpulan, (5) Publikasi/komunikasi hasil.',
      source_ref: 'Metodologi Penelitian Sains Biologi SMA Fase E, Kemendikbudristek 2022.',
      status: 'approved',
      author_id: 'usr-teacher-01',
      reviewer_id: 'usr-reviewer-01',
      version: 1
    },
    {
      id: 'qst-05',
      topic_id: 'top-02',
      objective_id: 'obj-04',
      question_type: 'matching',
      cognitive_level: 'C2',
      difficulty: 'medium',
      stimulus: 'Upaya pelestarian keanekaragaman hayati dikelompokkan menjadi metode in-situ (dalam habitat asli) dan ex-situ (di luar habitat asli).',
      question_text: 'Jodohkan kawasan konservasi berikut dengan metode pelestariannya yang sesuai:',
      options_json: JSON.stringify({
        pairs: [
          { id: 'p1', premise: 'Taman Nasional Ujung Kulon (Badak Jawa)', expectedChoice: 'In-situ' },
          { id: 'p2', premise: 'Kebun Raya Bogor (Koleksi Tumbuhan)', expectedChoice: 'Ex-situ' },
          { id: 'p3', premise: 'Suaka Margasatwa Danau Sentarum', expectedChoice: 'In-situ' },
          { id: 'p4', premise: 'Pusat Penangkaran Satwa Taman Safari', expectedChoice: 'Ex-situ' }
        ],
        choices: ['In-situ', 'Ex-situ']
      }),
      answer_key_json: JSON.stringify({
        matches: {
          'p1': 'In-situ',
          'p2': 'Ex-situ',
          'p3': 'In-situ',
          'p4': 'Ex-situ'
        }
      }),
      explanation: 'In-situ melestarikan spesies di habitat aslinya (Taman Nasional, Suaka Margasatwa, Cagar Alam). Ex-situ memindahkan organisme ke fasilitas buatan di luar habitat alami untuk perlindungan atau pembudidayaan intensif (Kebun Raya, Penangkaran, Kebun Binatang).',
      source_ref: 'Undang-Undang RI No. 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati.',
      status: 'approved',
      author_id: 'usr-teacher-01',
      reviewer_id: 'usr-reviewer-01',
      version: 1
    },
    {
      id: 'qst-06',
      topic_id: 'top-05',
      objective_id: 'obj-08',
      question_type: 'short_answer',
      cognitive_level: 'C3',
      difficulty: 'medium',
      stimulus: 'Dalam suatu rantai makanan padang rumput: Rumput (produsen) menghasilkan energi sebesar 40.000 kkal.',
      question_text: 'Berdasarkan Hukum 10% Lindeman (efisiensi transfer energi antar tingkat trofik), berapakah perkiraan energi (dalam kkal) yang dapat diserap oleh konsumen tingkat II (karnivora sekunder)? (Tuliskan hanya angka)',
      options_json: null,
      answer_key_json: JSON.stringify({ acceptedAnswers: ['400', '400 kkal', '400kkal'] }),
      explanation: 'Tingkat trofik 1 (Rumput): 40.000 kkal -> Tingkat trofik 2 (Konsumen I / Herbivora): 10% x 40.000 = 4.000 kkal -> Tingkat trofik 3 (Konsumen II / Karnivora): 10% x 4.000 = 400 kkal.',
      source_ref: 'Campbell Biology Bab 55 (Energy Transfer Efficiency).',
      status: 'approved',
      author_id: 'usr-teacher-01',
      reviewer_id: 'usr-reviewer-01',
      version: 1
    },
    {
      id: 'qst-07',
      topic_id: 'top-03',
      objective_id: 'obj-06',
      question_type: 'essay',
      cognitive_level: 'C5',
      difficulty: 'hard',
      stimulus: 'Pandemi COVID-19 mendorong percepatan teknologi vaksin berbasis mRNA (seperti Pfizer-BioNTech dan Moderna) dibandingkan vaksin virus inaktif konvensional.',
      question_text: 'Jelaskan mekanisme bagaimana vaksin mRNA bekerja di dalam sel tubuh manusia hingga memicu pembentukan antibodi spesifik tanpa menyebabkan infeksi virus aktif! Sertakan mengapa vaksin mRNA aman dari integrasi materi genetik ke DNA manusia.',
      options_json: null,
      answer_key_json: JSON.stringify({
        keyPoints: [
          'Vaksin mRNA menginstruksikan ribosom sitoplasma untuk mensintesis protein spike (antigen)',
          'Protein spike diekspresikan di permukaan sel dan dikenali sel penyaji antigen (APC)',
          'Sel T helper dan sel B teraktivasi menghasilkan sel plasma yang memproduksi antibodi spesifik dan sel memori',
          'mRNA tidak pernah masuk ke dalam inti sel (nukleus) tempat DNA manusia berada',
          'Molekul mRNA secara alami didegradasi oleh enzim seluler dalam hitungan hari'
        ]
      }),
      rubric_json: JSON.stringify({
        maxScore: 20,
        criteria: [
          { point: 5, description: 'Menjelaskan transkripsi/translasi mRNA menjadi protein spike antigen di ribosom' },
          { point: 5, description: 'Menjelaskan respon sistem imun (limfosit B, antibodi spesifik, sel memori)' },
          { point: 5, description: 'Menjelaskan mengapa tidak menginfeksi (hanya protein spike, bukan virion utuh)' },
          { point: 5, description: 'Menjelaskan alasan biologis tidak mengubah DNA (lokasi sitoplasma vs nukleus & degradasi alami)' }
        ]
      }),
      explanation: 'Jawaban yang lengkap harus memuat aspek imunologi sintesis antigen protein spike, aktivasi sel B dan sel memori, serta klarifikasi ilmiah bahwa mRNA tidak dapat berintegrasi ke DNA genomik karena keterbatasan kompartemen sitoplasma dan ketiadaan enzim reverse transcriptase.',
      source_ref: 'Nature Reviews Immunology (2021) - mRNA vaccine biology; Campbell Biology Bab 43 Sistem Imun.',
      status: 'approved',
      author_id: 'usr-teacher-01',
      reviewer_id: 'usr-reviewer-01',
      version: 1
    }
  ];

  for (const q of questions) {
    db.run(
      `INSERT INTO questions (
        id, topic_id, objective_id, question_type, cognitive_level, difficulty, stimulus, question_text,
        options_json, answer_key_json, explanation, distractor_rationale_json, rubric_json, source_ref, status, author_id, reviewer_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        q.id, q.topic_id, q.objective_id, q.question_type, q.cognitive_level, q.difficulty, q.stimulus, q.question_text,
        q.options_json, q.answer_key_json, q.explanation, q.distractor_rationale_json || null, q.rubric_json || null, q.source_ref, q.status, q.author_id, q.reviewer_id, q.version
      ]
    );
  }

  // Kuis Resmi: "Asesmen Formatif Biologi X: Virus & Keanekaragaman Hayati"
  db.run(`
    INSERT INTO quizzes (
      id, classroom_id, teacher_id, topic_id, title, description, duration_minutes, max_attempts, passing_score,
      shuffle_questions, shuffle_options, show_discussion_after, allow_retake, status
    ) VALUES (
      'quiz-bio-01',
      'cls-x-a',
      'usr-teacher-01',
      'top-03',
      'Asesmen Formatif: Replikasi Virus & Keanekaragaman Hayati',
      'Evaluasi pemahaman konsep daur replikasi virus, peran virus, dan konservasi keanekaragaman hayati Indonesia sesuai Capaian Pembelajaran Fase E.',
      45,
      2,
      75,
      1,
      1,
      1,
      1,
      'published'
    );
  `);

  // Pasangkan 7 soal ke kuis
  const quizQuestions = [
    { id: 'qq-01', quiz_id: 'quiz-bio-01', question_id: 'qst-01', order_num: 1, points: 15 },
    { id: 'qq-02', quiz_id: 'quiz-bio-01', question_id: 'qst-02', order_num: 2, points: 10 },
    { id: 'qq-03', quiz_id: 'quiz-bio-01', question_id: 'qst-03', order_num: 3, points: 15 },
    { id: 'qq-04', quiz_id: 'quiz-bio-01', question_id: 'qst-04', order_num: 4, points: 15 },
    { id: 'qq-05', quiz_id: 'quiz-bio-01', question_id: 'qst-05', order_num: 5, points: 15 },
    { id: 'qq-06', quiz_id: 'quiz-bio-01', question_id: 'qst-06', order_num: 6, points: 10 },
    { id: 'qq-07', quiz_id: 'quiz-bio-01', question_id: 'qst-07', order_num: 7, points: 20 }, // Total = 100 points
  ];

  for (const qq of quizQuestions) {
    db.run(
      `INSERT INTO quiz_questions (id, quiz_id, question_id, order_num, points)
       VALUES (?, ?, ?, ?, ?);`,
      [qq.id, qq.quiz_id, qq.question_id, qq.order_num, qq.points]
    );
  }

  // Pencapaian (Achievements / Gamification)
  const achievements = [
    { id: 'ach-01', code: 'FIRST_QUIZ', title: 'Penyelidik Pertama', description: 'Menyelesaikan kuis biologi pertama Anda.', badge_icon: 'Microscope', xp_reward: 100, category: 'quiz' },
    { id: 'ach-02', code: 'PERFECT_SCORE', title: 'Pakar Taksonomi', description: 'Memperoleh nilai 100 pada asesmen biologi.', badge_icon: 'Award', xp_reward: 250, category: 'academic' },
    { id: 'ach-03', code: 'STREAK_3', title: 'Ritme Biologis', description: 'Belajar dan mengakses materi 3 hari berturut-turut.', badge_icon: 'Flame', xp_reward: 150, category: 'habit' },
    { id: 'ach-04', code: 'AI_EXPLORER', title: 'Dialog Saintifik', description: 'Berdiskusi dan menanyakan 5 konsep biologi pada AI Tutor.', badge_icon: 'Brain', xp_reward: 100, category: 'ai' },
    { id: 'ach-05', code: 'ESSAY_EXCELLENCE', title: 'Argumen Biosains', description: 'Mendapatkan nilai sempurna pada evaluasi jawaban uraian.', badge_icon: 'FileText', xp_reward: 200, category: 'academic' }
  ];

  for (const a of achievements) {
    db.run(
      `INSERT INTO achievements (id, code, title, description, badge_icon, xp_reward, category)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [a.id, a.code, a.title, a.description, a.badge_icon, a.xp_reward, a.category]
    );
  }

  // Berikan achievement awal pada siswa 2
  db.run(`INSERT INTO user_achievements (id, user_id, achievement_id) VALUES ('uach-01', 'usr-student-02', 'ach-01');`);

  // Seeding 1 attempt yang sudah selesai untuk Siswa Bunga agar statistik kelas guru langsung memiliki data riil
  const completedAttemptId = 'att-sample-bunga-01';
  db.run(`
    INSERT INTO quiz_attempts (
      id, quiz_id, student_id, attempt_number, status, start_time, end_time, time_limit_at,
      questions_snapshot_json, score, max_score, percentage, feedback, evaluated_at
    ) VALUES (
      '${completedAttemptId}',
      'quiz-bio-01',
      'usr-student-02',
      1,
      'evaluated',
      datetime('now', '-2 hours'),
      datetime('now', '-1 hours'),
      datetime('now', '-1 hours'),
      '[]',
      85,
      100,
      85.0,
      'Pemahaman sangat baik pada konsep virus dan taksonomi Wallacea. Perlu penguatan pada efisiensi aliran energi trofik.',
      datetime('now', '-1 hours')
    );
  `);

  // Catat riwayat jawaban siswa Bunga
  db.run(`
    INSERT INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
    VALUES ('sa-01', '${completedAttemptId}', 'qst-01', '{"selectedOptionId":"opt-B"}', 1, 15, 'Tepat! Penggabungan profag adalah kunci daur lisogenik.');
  `);
  db.run(`
    INSERT INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
    VALUES ('sa-02', '${completedAttemptId}', 'qst-02', '{"isTrue":false}', 1, 10, 'Benar, antibiotik tidak mempan terhadap virus.');
  `);
  db.run(`
    INSERT INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
    VALUES ('sa-03', '${completedAttemptId}', 'qst-03', '{"selectedOptionIds":["opt-1","opt-2","opt-3"]}', 1, 15, 'Analisis wilayah Wallacea sangat akurat.');
  `);
  db.run(`
    INSERT INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
    VALUES ('sa-04', '${completedAttemptId}', 'qst-04', '{"orderedIds":["step-2","step-1","step-3","step-4","step-5"]}', 1, 15, 'Sempurna.');
  `);
  db.run(`
    INSERT INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
    VALUES ('sa-05', '${completedAttemptId}', 'qst-05', '{"matches":{"p1":"In-situ","p2":"Ex-situ","p3":"In-situ","p4":"Ex-situ"}}', 1, 15, 'Pemahaman in-situ dan ex-situ tepat.');
  `);
  db.run(`
    INSERT INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
    VALUES ('sa-06', '${completedAttemptId}', 'qst-06', '{"text":"4000"}', 0, 0, 'Perhatikan bahwa karnivora sekunder berada di tingkat trofik 3 (Rumput 40.000 -> Herbivora 4.000 -> Karnivora 400 kkal).');
  `);
  db.run(`
    INSERT INTO student_answers (id, attempt_id, question_id, answer_data_json, is_correct, points_earned, teacher_feedback)
    VALUES ('sa-07', '${completedAttemptId}', 'qst-07', '{"text":"Vaksin mRNA membawa instruksi translasi protein spike virus di ribosom manusia. Sel imun mengenali spike dan memproduksi antibodi. Vaksin aman karena mRNA tidak bisa masuk inti sel nukleus manusia."}', 1, 15, 'Penjelasan sangat sistematis dan sesuai kaidah biologi molekuler.');
  `);

  console.log('Biology database initialized & seeded successfully with real curriculum data.');
}

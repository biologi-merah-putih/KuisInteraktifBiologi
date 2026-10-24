import { useState, useEffect } from "react";

type Role = "guru" | "siswa";
type Kelas = "X" | "XI" | "XII";
type TabGuru = "dashboard" | "bank" | "nilai";
type TabSiswa = "dashboard" | "kuis";

interface Soal {
  id: string;
  kelas: Kelas;
  bab: string;
  pertanyaan: string;
  opsi: string[];
  jawaban: number;
  penjelasan: string;
}

interface Nilai {
  id: string;
  nama: string;
  kelas: Kelas;
  skor: number;
  total: number;
  tanggal: string;
}

const BANK_LENGKAP: Soal[] = [
  // KELAS X - 6 SOAL
  { id: "x1", kelas: "X", bab: "Sel", pertanyaan: "Organel yang disebut sebagai 'the powerhouse of the cell' adalah?", opsi: ["Ribosom", "Mitokondria", "Nukleus", "Kloroplas"], jawaban: 1, penjelasan: "Mitokondria penghasil energi ATP" },
  { id: "x2", kelas: "X", bab: "Sel", pertanyaan: "Perbedaan utama sel prokariotik dan eukariotik terletak pada?", opsi: ["Dinding sel", "Membran inti", "Ribosom", "Sitoplasma"], jawaban: 1, penjelasan: "Prokariotik tidak punya membran inti" },
  { id: "x3", kelas: "X", bab: "Keanekaragaman Hayati", pertanyaan: "Tingkatan keanekaragaman hayati dari yang terkecil adalah?", opsi: ["Ekosistem - Jenis - Gen", "Gen - Jenis - Ekosistem", "Jenis - Gen - Ekosistem", "Gen - Ekosistem - Jenis"], jawaban: 1, penjelasan: "Gen terkecil, lalu jenis, lalu ekosistem" },
  { id: "x4", kelas: "X", bab: "Ekologi", pertanyaan: "Simbiosis mutualisme contohnya adalah?", opsi: ["Benalu dan inang", "Kerbau dan burung jalak", "Ikan remora dan hiu", "Anggrek dan pohon"], jawaban: 1, penjelasan: "Kerbau dapat kutu hilang, jalak dapat makan" },
  { id: "x5", kelas: "X", bab: "Pencemaran", pertanyaan: "Eutrofikasi disebabkan oleh kelebihan?", opsi: ["CO2", "Fosfat dan Nitrat", "Oksigen", "Logam berat"], jawaban: 1, penjelasan: "Limbah pupuk menyebabkan alga blooming" },
  { id: "x6", kelas: "X", bab: "Fotosintesis", pertanyaan: "Hasil akhir fotosintesis adalah glukosa dan?", opsi: ["Karbon dioksida", "Air", "Oksigen", "Nitrogen"], jawaban: 2, penjelasan: "6CO2+6H2O -> C6H12O6+6O2" },

  // KELAS XI - 6 SOAL
  { id: "xi1", kelas: "XI", bab: "Sistem Gerak", pertanyaan: "Sendi yang memungkinkan gerakan ke segala arah adalah?", opsi: ["Sendi engsel", "Sendi peluru", "Sendi putar", "Sendi pelana"], jawaban: 1, penjelasan: "Contoh: sendi bahu dan panggul" },
  { id: "xi2", kelas: "XI", bab: "Sistem Peredaran Darah", pertanyaan: "Sel darah yang berfungsi untuk pembekuan darah adalah?", opsi: ["Eritrosit", "Leukosit", "Trombosit", "Limfosit"], jawaban: 2, penjelasan: "Trombosit = keping darah" },
  { id: "xi3", kelas: "XI", bab: "Sistem Pencernaan", pertanyaan: "Enzim yang mengubah amilum menjadi maltosa di mulut adalah?", opsi: ["Pepsin", "Ptialin", "Tripsin", "Lipase"], jawaban: 1, penjelasan: "Ptialin/amylase saliva" },
  { id: "xi4", kelas: "XI", bab: "Sistem Pernapasan", pertanyaan: "Pertukaran O2 dan CO2 terjadi di?", opsi: ["Bronkus", "Alveolus", "Trakea", "Laring"], jawaban: 1, penjelasan: "Alveolus tempat difusi gas" },
  { id: "xi5", kelas: "XI", bab: "Sistem Ekskresi", pertanyaan: "Filtrasi darah terjadi di bagian ginjal?", opsi: ["Tubulus", "Glomerulus", "Kapsula Bowman", "Lengkung Henle"], jawaban: 1, penjelasan: "Glomerulus menyaring darah" },
  { id: "xi6", kelas: "XI", bab: "Sistem Saraf", pertanyaan: "Neurotransmitter untuk kontraksi otot adalah?", opsi: ["Dopamin", "Asetilkolin", "Serotonin", "Adrenalin"], jawaban: 1, penjelasan: "Asetilkolin di neuromuscular junction" },

  // KELAS XII - 6 SOAL
  { id: "xii1", kelas: "XII", bab: "Pertumbuhan", pertanyaan: "Hormon pertumbuhan pada tumbuhan yang memacu pemanjangan adalah?", opsi: ["Sitokinin", "Auksin", "Giberelin", "Etilen"], jawaban: 1, penjelasan: "Auksin untuk dominansi apikal" },
  { id: "xii2", kelas: "XII", bab: "Genetika", pertanyaan: "Perbandingan fenotipe F2 pada persilangan monohibrid intermediet adalah?", opsi: ["3:1", "1:2:1", "9:3:3:1", "1:1"], jawaban: 1, penjelasan: "Merah:Mer muda:Putih = 1:2:1" },
  { id: "xii3", kelas: "XII", bab: "Evolusi", pertanyaan: "Teori evolusi Darwin menekankan pada?", opsi: ["Use and disuse", "Seleksi alam", "Mutasi", "Bencana alam"], jawaban: 1, penjelasan: "Survival of the fittest" },
  { id: "xii4", kelas: "XII", bab: "Bioteknologi", pertanyaan: "Teknik untuk menggandakan DNA secara in vitro adalah?", opsi: ["Kloning", "PCR", "Elektroforesis", "Transformasi"], jawaban: 1, penjelasan: "Polymerase Chain Reaction" },
  { id: "xii5", kelas: "XII", bab: "Metabolisme", pertanyaan: "Tahap glikolisis menghasilkan?", opsi: ["2 ATP, 2 NADH", "34 ATP", "2 ATP saja", "NADPH"], jawaban: 0, penjelasan: "Netto glikolisis 2 ATP" },
  { id: "xii6", kelas: "XII", bab: "Mutasi", pertanyaan: "Mutasi yang mengubah satu basa nitrogen disebut?", opsi: ["Delesi", "Translokasi", "Substitusi", "Duplikasi"], jawaban: 2, penjelasan: "Point mutation / substitusi" },
];

export default function App() {
  const [role, setRole] = useState<Role>("guru");
  const [tabGuru, setTabGuru] = useState<TabGuru>("dashboard");
  const [tabSiswa, setTabSiswa] = useState<TabSiswa>("dashboard");
  const [bank, setBank] = useState<Soal[]>(() => {
    const saved = localStorage.getItem("bank_biologi");
    return saved ? JSON.parse(saved) : BANK_LENGKAP;
  });
  const [filterKelas, setFilterKelas] = useState<Kelas | "Semua">("Semua");
  const [nilai, setNilai] = useState<Nilai[]>(() => {
    const saved = localStorage.getItem("nilai_biologi");
    return saved ? JSON.parse(saved) : [];
  });
  const [kuisAktif, setKuisAktif] = useState<Soal[]>([]);
  const [idxKuis, setIdxKuis] = useState(0);
  const [skorKuis, setSkorKuis] = useState(0);
  const [namaSiswa, setNamaSiswa] = useState("");
  const [jawabanTerpilih, setJawabanTerpilih] = useState<number | null>(null);
  const [showPenjelasan, setShowPenjelasan] = useState(false);

  // Form tambah soal
  const [formSoal, setFormSoal] = useState({ kelas: "X" as Kelas, bab: "", pertanyaan: "", opsi: ["", "", "", ""], jawaban: 0, penjelasan: "" });

  useEffect(() => { localStorage.setItem("bank_biologi", JSON.stringify(bank)); }, [bank]);
  useEffect(() => { localStorage.setItem("nilai_biologi", JSON.stringify(nilai)); }, [nilai]);

  const filteredBank = filterKelas === "Semua" ? bank : bank.filter(s => s.kelas === filterKelas);

  const mulaiKuis = (kelas: Kelas) => {
    if (!namaSiswa.trim()) { alert("Isi nama dulu ya!"); return; }
    const soalKelas = bank.filter(s => s.kelas === kelas);
    if (soalKelas.length === 0) { alert("Soal kelas " + kelas + " belum ada"); return; }
    const shuffled = [...soalKelas].sort(() => Math.random() - 0.5).slice(0, 10);
    setKuisAktif(shuffled);
    setIdxKuis(0);
    setSkorKuis(0);
    setTabSiswa("kuis");
    setJawabanTerpilih(null);
    setShowPenjelasan(false);
  };

  const jawabKuis = (pilih: number) => {
    if (showPenjelasan) return;
    setJawabanTerpilih(pilih);
    setShowPenjelasan(true);
    if (pilih === kuisAktif[idxKuis].jawaban) setSkorKuis(s => s + 1);

    setTimeout(() => {
      if (idxKuis + 1 < kuisAktif.length) {
        setIdxKuis(i => i + 1);
        setJawabanTerpilih(null);
        setShowPenjelasan(false);
      } else {
        const skorAkhir = pilih === kuisAktif[idxKuis].jawaban ? skorKuis + 1 : skorKuis;
        const dataNilai: Nilai = {
          id: Date.now().toString(),
          nama: namaSiswa,
          kelas: kuisAktif[0].kelas,
          skor: skorAkhir,
          total: kuisAktif.length,
          tanggal: new Date().toLocaleString("id-ID")
        };
        setNilai(n => [dataNilai, ...n]);
        alert(`Selesai! ${namaSiswa}, Skor: ${skorAkhir}/${kuisAktif.length} (${Math.round(skorAkhir/kuisAktif.length*100)}%)`);
        setTabSiswa("dashboard");
      }
    }, 2000);
  };

  const tambahSoal = () => {
    if (!formSoal.pertanyaan || formSoal.opsi.some(o => !o)) { alert("Lengkapi semua!"); return; }
    const baru: Soal = { id: Date.now().toString(), kelas: formSoal.kelas, bab: formSoal.bab || "Umum", pertanyaan: formSoal.pertanyaan, opsi: formSoal.opsi, jawaban: formSoal.jawaban, penjelasan: formSoal.penjelasan || "Pembahasan tersedia" };
    setBank([baru, ...bank]);
    setFormSoal({ kelas: "X", bab: "", pertanyaan: "", opsi: ["", "", "", ""], jawaban: 0, penjelasan: "" });
    alert("Soal berhasil ditambah!");
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');`}</style>
      <header style={{ background: "linear-gradient(90deg,#DC2626 0%, #FFFFFF 50%, #DC2626 100%)", borderBottom: "4px solid #DC2626", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#DC2626", color: "white", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>B</div>
          <div>
            <div style={{ fontWeight: 800, color: "#1f2937" }}>BioXLab</div>
            <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>Kuis Interaktif Biologi X-XII Merah Putih</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, background: "white", padding: 4, borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <button onClick={() => setRole("guru")} style={{ background: role === "guru" ? "#DC2626" : "transparent", color: role === "guru" ? "white" : "#374151", padding: "8px 14px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" }}>👩‍🏫 Guru</button>
          <button onClick={() => setRole("siswa")} style={{ background: role === "siswa" ? "#16a34a" : "transparent", color: role === "siswa" ? "white" : "#374151", padding: "8px 14px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" }}>🎓 Siswa</button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        {role === "guru" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {(["dashboard", "bank", "nilai"] as TabGuru[]).map(t => (
                <button key={t} onClick={() => setTabGuru(t)} style={{ padding: "10px 18px", borderRadius: 10, border: tabGuru === t ? "2px solid #DC2626" : "1px solid #e5e7eb", background: tabGuru === t ? "#fef2f2" : "white", fontWeight: 600, cursor: "pointer" }}>
                  {t === "dashboard" ? "📊 Dashboard" : t === "bank" ? `📚 Bank Soal (${bank.length})` : `📝 Nilai (${nilai.length})`}
                </button>
              ))}
              <select value={filterKelas} onChange={e => setFilterKelas(e.target.value as any)} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", marginLeft: "auto" }}>
                <option value="Semua">Semua Kelas</option><option value="X">Kelas X</option><option value="XI">Kelas XI</option><option value="XII">Kelas XII</option>
              </select>
            </div>

            {tabGuru === "dashboard" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16 }}>
                <div style={{ background: "white", padding: 20, borderRadius: 16, borderLeft: "5px solid #DC2626" }}><h3>Total Soal</h3><p style={{ fontSize: 32, fontWeight: 800 }}>{bank.length}</p><p>X: {bank.filter(s=>s.kelas==="X").length} | XI: {bank.filter(s=>s.kelas==="XI").length} | XII: {bank.filter(s=>s.kelas==="XII").length}</p></div>
                <div style={{ background: "white", padding: 20, borderRadius: 16, borderLeft: "5px solid #16a34a" }}><h3>Siswa Mengerjakan</h3><p style={{ fontSize: 32, fontWeight: 800 }}>{nilai.length}</p><p>Nilai tersimpan lokal (offline)</p></div>
                <div style={{ background: "linear-gradient(135deg,#DC2626,#991b1b)", color: "white", padding: 20, borderRadius: 16 }}><h3>✅ Status</h3><p><b>100% Offline - No 404</b></p><p style={{ fontSize: 12, opacity: 0.9 }}>Siap presentasi ke dosen, tanpa API, tanpa error</p></div>
              </div>
            )}

            {tabGuru === "bank" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ background: "white", padding: 20, borderRadius: 16 }}>
                  <h3 style={{ marginBottom: 12 }}>➕ Tambah Soal Baru</h3>
                  <select value={formSoal.kelas} onChange={e => setFormSoal({ ...formSoal, kelas: e.target.value as Kelas })} style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "1px solid #ddd" }}><option value="X">Kelas X</option><option value="XI">Kelas XI</option><option value="XII">Kelas XII</option></select>
                  <input placeholder="Bab (misal: Sel)" value={formSoal.bab} onChange={e => setFormSoal({ ...formSoal, bab: e.target.value })} style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "1px solid #ddd" }} />
                  <textarea placeholder="Pertanyaan" value={formSoal.pertanyaan} onChange={e => setFormSoal({ ...formSoal, pertanyaan: e.target.value })} style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "1px solid #ddd", minHeight: 80 }} />
                  {formSoal.opsi.map((o, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}><span style={{ padding: 10 }}>{String.fromCharCode(65 + i)}.</span><input value={o} onChange={e => { const n = [...formSoal.opsi]; n[i] = e.target.value; setFormSoal({ ...formSoal, opsi: n }); }} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ddd" }} /><input type="radio" checked={formSoal.jawaban === i} onChange={() => setFormSoal({ ...formSoal, jawaban: i })} /></div>
                  ))}
                  <input placeholder="Penjelasan jawaban" value={formSoal.penjelasan} onChange={e => setFormSoal({ ...formSoal, penjelasan: e.target.value })} style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "1px solid #ddd" }} />
                  <button onClick={tambahSoal} style={{ width: "100%", background: "#DC2626", color: "white", padding: 12, borderRadius: 10, border: "none", fontWeight: 700, cursor: "pointer" }}>Simpan Soal</button>
                </div>
                <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
                  {filteredBank.map((s, i) => (
                    <div key={s.id} style={{ background: "white", padding: 14, borderRadius: 12, marginBottom: 10, border: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ background: s.kelas === "X" ? "#fef3c7" : s.kelas === "XI" ? "#dcfce7" : "#fee2e2", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{s.kelas} - {s.bab}</span><button onClick={() => setBank(bank.filter(x => x.id !== s.id))} style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>🗑️</button></div>
                      <div style={{ fontWeight: 600, margin: "8px 0" }}>{i + 1}. {s.pertanyaan}</div>
                      {s.opsi.map((o, idx) => <div key={idx} style={{ fontSize: 13, padding: 4, background: idx === s.jawaban ? "#dcfce7" : "transparent", borderRadius: 4 }}>{String.fromCharCode(65 + idx)}. {o} {idx === s.jawaban ? "✅" : ""}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tabGuru === "nilai" && (
              <div style={{ background: "white", padding: 20, borderRadius: 16 }}>
                <h3>📝 Daftar Nilai Siswa</h3>
                {nilai.length === 0 ? <p>Belum ada yang mengerjakan</p> : (
                  <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
                    <thead><tr style={{ background: "#f9fafb" }}><th style={{ padding: 10, textAlign: "left" }}>Nama</th><th>Kelas</th><th>Skor</th><th>Tanggal</th></tr></thead>
                    <tbody>{nilai.map(n => <tr key={n.id} style={{ borderBottom: "1px solid #eee" }}><td style={{ padding: 10 }}>{n.nama}</td><td>{n.kelas}</td><td><b>{n.skor}/{n.total}</b> ({Math.round(n.skor / n.total * 100)}%)</td><td style={{ fontSize: 12 }}>{n.tanggal}</td></tr>)}</tbody>
                  </table>
                )}
                {nilai.length > 0 && <button onClick={() => { if (confirm("Hapus semua nilai?")) setNilai([]); }} style={{ marginTop: 12, background: "#fee2e2", color: "#DC2626", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer" }}>Hapus Semua</button>}
              </div>
            )}
          </>
        )}

        {role === "siswa" && (
          <>
            {tabSiswa === "dashboard" && (
              <div>
                <div style={{ background: "white", padding: 20, borderRadius: 16, marginBottom: 16, textAlign: "center", border: "2px solid #DC2626" }}>
                  <h2 style={{ color: "#DC2626" }}>🎓 Selamat Datang di Kuis Biologi!</h2>
                  <input value={namaSiswa} onChange={e => setNamaSiswa(e.target.value)} placeholder="Tulis Nama Lengkap Kamu..." style={{ padding: "12px 16px", borderRadius: 10, border: "2px solid #DC2626", width: "100%", maxWidth: 400, marginTop: 12, fontSize: 16 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
                  {(["X", "XI", "XII"] as Kelas[]).map(k => (
                    <div key={k} style={{ background: "white", padding: 20, borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                      <h3>Kelas {k}</h3><p style={{ fontSize: 13, color: "#6b7280" }}>{bank.filter(s => s.kelas === k).length} Soal Tersedia</p>
                      <div style={{ marginTop: 10 }}>{bank.filter(s => s.kelas === k).slice(0, 2).map(s => <div key={s.id} style={{ fontSize: 12, background: "#f9fafb", padding: 6, borderRadius: 6, marginBottom: 4 }}>• {s.bab}: {s.pertanyaan.slice(0, 50)}...</div>)}</div>
                      <button onClick={() => mulaiKuis(k)} style={{ width: "100%", marginTop: 12, background: k === "X" ? "#f59e0b" : k === "XI" ? "#16a34a" : "#DC2626", color: "white", padding: 12, borderRadius: 10, border: "none", fontWeight: 700, cursor: "pointer" }}>Mulai Kuis Kelas {k} 🚀</button>
                    </div>
                  ))}
                </div>
                {nilai.filter(n => n.nama === namaSiswa).length > 0 && (
                  <div style={{ background: "white", padding: 16, borderRadius: 16, marginTop: 20 }}>
                    <h4>Riwayat Kamu ({namaSiswa})</h4>
                    {nilai.filter(n => n.nama === namaSiswa).map(n => <div key={n.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>{n.tanggal} - Kelas {n.kelas}: <b>{n.skor}/{n.total}</b></div>)}
                  </div>
                )}
              </div>
            )}

            {tabSiswa === "kuis" && kuisAktif.length > 0 && (
              <div style={{ background: "white", padding: 24, borderRadius: 20, maxWidth: 700, margin: "0 auto", borderTop: "6px solid #DC2626" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><span style={{ background: "#fef2f2", padding: "6px 12px", borderRadius: 20, fontWeight: 700, color: "#DC2626" }}>Soal {idxKuis + 1}/{kuisAktif.length}</span><span style={{ background: "#dcfce7", padding: "6px 12px", borderRadius: 20, fontWeight: 700 }}>Skor: {skorKuis}</span></div>
                <div style={{ background: "#f8fafc", padding: 4, borderRadius: 10, marginBottom: 16 }}><div style={{ height: 8, background: "#DC2626", width: `${((idxKuis + 1) / kuisAktif.length) * 100}%`, borderRadius: 10, transition: "0.3s" }}></div></div>
                <h2 style={{ marginBottom: 20 }}>{kuisAktif[idxKuis].pertanyaan}</h2>
                <div style={{ display: "grid", gap: 10 }}>
                  {kuisAktif[idxKuis].opsi.map((o, i) => {
                    const isSelected = jawabanTerpilih === i;
                    const isBenar = i === kuisAktif[idxKuis].jawaban;
                    let bg = "white";
                    if (showPenjelasan) {
                      if (isBenar) bg = "#dcfce7";
                      else if (isSelected && !isBenar) bg = "#fee2e2";
                    } else if (isSelected) bg = "#fef3c7";
                    return (
                      <button key={i} onClick={() => !showPenjelasan && jawabKuis(i)} style={{ textAlign: "left", padding: "14px 16px", borderRadius: 12, border: `2px solid ${isSelected ? "#DC2626" : "#e5e7eb"}`, background: bg, cursor: showPenjelasan ? "default" : "pointer", fontWeight: 500 }}>
                        <b>{String.fromCharCode(65 + i)}.</b> {o} {showPenjelasan && isBenar && " ✅"} {showPenjelasan && isSelected && !isBenar && " ❌"}
                      </button>
                    );
                  })}
                </div>
                {showPenjelasan && <div style={{ marginTop: 16, padding: 14, background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}><b>💡 Pembahasan:</b> {kuisAktif[idxKuis].penjelasan}</div>}
              </div>
            )}
          </>
        )}
      </main>
      <footer style={{ textAlign: "center", padding: 20, fontSize: 12, color: "#9ca3af" }}>BioXLab - Kuis Interaktif Biologi Kelas X-XII | Merah Putih 🇮🇩 | 100% Offline | Siap UAS</footer>
    </div>
  );
}

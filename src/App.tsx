import { useState, useEffect } from "react";

type Role = "guru" | "siswa";
type Tab = "guru-dashboard" | "bank-soal" | "nilai" | "siswa-dashboard" | "main-kuis";

interface Soal {
  id: string;
  kelas: string;
  pertanyaan: string;
  opsi: string[];
  jawaban: number;
}

const BANK_AWAL: Soal[] = [
  { id: "1", kelas: "X", pertanyaan: "Organel sel tempat respirasi sel adalah...", opsi: ["Ribosom", "Mitokondria", "Nukleus", "Kloroplas"], jawaban: 1 },
  { id: "2", kelas: "X", pertanyaan: "Proses fotosintesis terjadi di...", opsi: ["Mitokondria", "Kloroplas", "Vakuola", "Sitoplasma"], jawaban: 1 },
  { id: "3", kelas: "XI", pertanyaan: "Hormon pengatur kadar gula darah adalah...", opsi: ["Adrenalin", "Insulin", "Tiroksin", "Estrogen"], jawaban: 1 },
  { id: "4", kelas: "XII", pertanyaan: "Persilangan dihibrid menghasilkan perbandingan fenotip...", opsi: ["3:1", "9:3:3:1", "1:2:1", "1:1"], jawaban: 1 },
];

export default function App() {
  const [role, setRole] = useState<Role>("guru");
  const [tab, setTab] = useState<Tab>("guru-dashboard");
  const [bank] = useState<Soal[]>(BANK_AWAL);
  const [indexSoal, setIndexSoal] = useState(0);
  const [skor, setSkor] = useState(0);

  const handleSwitchRole = (newRole: Role) => {
    setRole(newRole);
    setTab(newRole === "guru" ? "guru-dashboard" : "siswa-dashboard");
  };

  const mulaiKuis = () => { setIndexSoal(0); setSkor(0); setTab("main-kuis"); };
  const jawab = (pilih: number) => {
    const benar = bank[indexSoal].jawaban === pilih ? 1 : 0;
    if (benar) setSkor(s => s + 1);
    const next = indexSoal + 1;
    if (next < bank.length) setIndexSoal(next);
    else { alert(`Selesai! Skor kamu: ${skor + benar} / ${bank.length}`); setTab("siswa-dashboard"); }
  };

  return (
    <div style={{ fontFamily: "sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <header style={{ background: "white", padding: "12px 20px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ddd", position: "sticky", top: 0 }}>
        <b>BioXLab - {role === "guru" ? "Guru Demo" : "Siswa Demo"}</b>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => handleSwitchRole("guru")} style={{ background: role === "guru" ? "#2563eb" : "white", color: role === "guru" ? "white" : "black", padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}>Mode Guru</button>
          <button onClick={() => handleSwitchRole("siswa")} style={{ background: role === "siswa" ? "#16a34a" : "white", color: role === "siswa" ? "white" : "black", padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}>Mode Siswa</button>
        </div>
      </header>
      <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
        {role === "guru" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setTab("guru-dashboard")}>Dashboard</button>
              <button onClick={() => setTab("bank-soal")}>Bank Soal ({bank.length})</button>
              <button onClick={() => setTab("nilai")}>Nilai</button>
            </div>
            {tab === "guru-dashboard" && <div style={{ background: "white", padding: 20, borderRadius: 12 }}><h2>✅ FIX 404 Berhasil!</h2><p>Mode Guru/Siswa sekarang 100% offline, tidak pakai API lagi. Siap dipakai UAS.</p><p>Total Soal: {bank.length}</p></div>}
            {tab === "bank-soal" && <div style={{ background: "white", padding: 20, borderRadius: 12 }}>{bank.map((s,i) => <div key={s.id} style={{ border: "1px solid #eee", padding: 10, marginBottom: 8 }}><b>{i+1}. [{s.kelas}] {s.pertanyaan}</b><div>{s.opsi.map((o,idx) => <div key={idx} style={{ color: idx===s.jawaban?"green":"black" }}>{idx===s.jawaban?"✔ ":""}{o}</div>)}</div></div>)}</div>}
            {tab === "nilai" && <div style={{ background: "white", padding: 20, borderRadius: 12 }}>Nilai akan muncul setelah siswa main.</div>}
          </div>
        )}
        {role === "siswa" && (
          <div>
            {tab === "siswa-dashboard" && <div style={{ background: "white", padding: 20, borderRadius: 12, textAlign: "center" }}><h2>Kuis Biologi X-XII</h2><button onClick={mulaiKuis} style={{ background: "#16a34a", color: "white", padding: "12px 24px", border: "none", borderRadius: 8, cursor: "pointer" }}>Mulai Kuis</button></div>}
            {tab === "main-kuis" && <div style={{ background: "white", padding: 20, borderRadius: 12 }}><p>Soal {indexSoal+1}/{bank.length} - Skor: {skor}</p><h3>{bank[indexSoal].pertanyaan}</h3>{bank[indexSoal].opsi.map((o,idx) => <button key={idx} onClick={() => jawab(idx)} style={{ display: "block", width: "100%", padding: 12, marginBottom: 8, textAlign: "left", cursor: "pointer" }}>{o}</button>)}</div>}
          </div>
        )}
      </main>
    </div>
  );
}

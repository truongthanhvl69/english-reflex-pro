"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { ArrowLeft, Bot, Check, ChevronDown, FileAudio, FileUp, GraduationCap, LayoutDashboard, MoreHorizontal, Pencil, Plus, Search, Send, Settings, Sparkles, Trash2, Users, X } from "lucide-react";
import { sentences } from "@/data/sentences";

const sections = ["Tổng quan", "Khóa học", "Danh mục", "Bài học", "Câu luyện", "Từ vựng", "Audio", "Người dùng", "Xếp hạng"];

export function AdminConsole() {
  const [section, setSection] = useState("Câu luyện");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(sentences.slice(0, 18));
  const [modal, setModal] = useState(false);
  const [imported, setImported] = useState(0);
  const filtered = useMemo(() => rows.filter((row) => `${row.english} ${row.vietnamese}`.toLowerCase().includes(query.toLowerCase())), [query, rows]);

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const text = await file.text();
    setImported(Math.max(0, text.trim().split(/\r?\n/).length - 1));
  };

  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span><GraduationCap size={21} /></span><div><strong>Reflex Admin</strong><small>CONTENT STUDIO</small></div></div><nav>{sections.map((item, index) => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}>{index === 0 ? <LayoutDashboard size={17} /> : index === 7 ? <Users size={17} /> : <ChevronDown size={17} />} {item}</button>)}</nav><div className="admin-sidebar-bottom"><button><Settings size={17} /> Cài đặt hệ thống</button><a href="/"><ArrowLeft size={17} /> Về app học</a></div></aside>
    <main className="admin-main"><header className="admin-top"><div><span>CMS / {section}</span><h1>{section}</h1></div><div className="admin-user"><span>MN</span><div><strong>Minh Nguyễn</strong><small>Administrator</small></div><ChevronDown size={16} /></div></header>
      <section className="admin-toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm nội dung..." /></div><select><option>Tất cả trình độ</option><option>A1</option><option>A2</option></select><select><option>Tất cả trạng thái</option><option>Đã xuất bản</option><option>Bản nháp</option></select><div className="admin-actions"><label className="button button-secondary"><FileUp size={16} /> Import CSV<input hidden type="file" accept=".csv,.xlsx" onChange={importCsv} /></label><button className="button button-primary" onClick={() => setModal(true)}><Plus size={17} /> Thêm câu</button></div></section>
      {imported > 0 && <div className="import-notice"><Check size={17} /> Đã đọc {imported} dòng từ file. Bạn có thể kiểm tra trước khi publish.<button onClick={() => setImported(0)}><X size={16} /></button></div>}
      <section className="admin-summary"><div><span>TỔNG CÂU</span><strong>2,480</strong><small>+100 tháng này</small></div><div><span>ĐÃ XUẤT BẢN</span><strong>2,216</strong><small>89.3% thư viện</small></div><div><span>THIẾU AUDIO</span><strong>64</strong><small className="warn">Cần xử lý</small></div><div><span>BẢN NHÁP</span><strong>200</strong><small>Chờ duyệt</small></div></section>
      <section className="admin-table-card"><div className="admin-table-head"><div><h2>Kho câu luyện</h2><p>{filtered.length} / 2,480 câu đang hiển thị</p></div><button className="button button-secondary"><Bot size={16} /> AI điền dữ liệu thiếu</button></div><div className="admin-table"><div className="admin-row header"><span><input type="checkbox" /></span><span>CÂU TIẾNG ANH</span><span>TRÌNH ĐỘ</span><span>BÀI HỌC</span><span>AUDIO</span><span>TRẠNG THÁI</span><span /></div>{filtered.map((row, index) => <div className="admin-row" key={row.id}><span><input type="checkbox" /></span><div><strong>{row.english}</strong><small>{row.vietnamese}</small></div><span><i className={`level-${row.level.toLowerCase()}`}>{row.level}</i></span><span>{row.lesson}</span><span>{index % 4 === 0 ? <i className="missing"><FileAudio size={14} /> Thiếu</i> : <i className="ready"><Check size={14} /> Có sẵn</i>}</span><span><i className={index % 6 === 0 ? "draft" : "published"}>{index % 6 === 0 ? "Bản nháp" : "Đã xuất bản"}</i></span><span className="row-actions"><button><Pencil size={15} /></button><button onClick={() => setRows((items) => items.filter((item) => item.id !== row.id))}><Trash2 size={15} /></button><button><MoreHorizontal size={16} /></button></span></div>)}</div><div className="table-pagination"><span>Hiển thị 1–{filtered.length} trong 2,480</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>…</button><button>124</button><button>›</button></div></div></section>
    </main>
    {modal && <div className="admin-modal-backdrop"><div className="admin-modal"><div className="modal-head"><div><Sparkles size={19} /><div><h2>Thêm câu luyện mới</h2><p>AI có thể tự tạo IPA, word bank và ghi chú.</p></div></div><button onClick={() => setModal(false)}><X size={19} /></button></div><div className="modal-form"><label>Câu tiếng Anh<textarea placeholder="E.g. I am Vietnamese." /></label><label>Nghĩa tiếng Việt<textarea placeholder="Ví dụ: Tôi là người Việt Nam." /></label><div><label>Trình độ<select><option>A1</option><option>A2</option><option>B1</option></select></label><label>Bài học<select><option>A1 - Bài 01</option><option>A1 - Bài 02</option></select></label></div><button className="ai-generate"><Bot size={17} /> Tự điền IPA, đáp án thay thế và word bank bằng AI</button></div><div className="modal-actions"><button className="button button-secondary" onClick={() => setModal(false)}>Lưu bản nháp</button><button className="button button-primary" onClick={() => setModal(false)}><Send size={16} /> Lưu & xuất bản</button></div></div></div>}
  </div>;
}

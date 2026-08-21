# 🎓 Website Đăng ký & Theo dõi Lịch học (Google Sheets 2-Way Sync)

Ứng dụng Web Đăng ký & Theo dõi Lịch học hiện đại, linh hoạt dành cho **Học viên Cấp tốc** và **Học viên Dài hạn**, hỗ trợ **đăng ký chọn nhiều ca học cùng lúc (Multi-select)** và **đồng bộ 2 chiều thời gian thực với Google Sheet** (Sheet ID: `1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA`) thông qua Vercel Serverless API & Environment Variables.

---

## 🌟 Tính năng Nổi bật

1. **Phân loại Học viên & Tần suất Học linh hoạt**:
   - **Học viên Cấp tốc**: Cho phép chọn đăng ký **4 - 5 buổi/tuần** từ Dropdown.
   - **Học viên Dài hạn**: Cho phép chọn đăng ký **2 - 3 buổi/tuần** từ Dropdown.
2. **Đăng ký Chọn Nhiều Ca Học Cùng Lúc (Multi-select Slots Grid)**:
   - Giao diện Ma trận Lịch học (Thứ 2 &rarr; Chủ Nhật, Ca Sáng / Chiều / Tối / Tối Muộn).
   - Chọn đồng thời nhiều ca học dễ dàng bằng 1 cú click.
   - Tự động hiển thị danh sách Tag các ca đã chọn và bộ đếm validation realtime.
3. **Đồng bộ 2 Chiều với Google Sheet thời gian thực**:
   - **Ghi dữ liệu (Web &rarr; Sheet)**: Học viên nộp đăng ký &rarr; Tự động append hàng mới lên Google Sheet target ID `1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA`.
   - **Đọc dữ liệu (Sheet &rarr; Web)**: Admin phê duyệt/đổi trạng thái trên Sheet &rarr; Web tự động đọc và hiển thị thời khóa biểu chính xác.
4. **Giao diện Modern Dark/Light Mode**:
   - Thiết kế Glassmorphism sang trọng, màu sắc Indigo & Violet sống động, responsive mượt mà trên Điện thoại và Máy tính.

---

## 📂 Cấu trúc Dự án

```text
dangkytheodoilichhoc/
├── api/
│   ├── register.js          # Vercel Serverless Function: Gửi đăng ký mới lên Google Sheet
│   └── schedule.js          # Vercel Serverless Function: Lấy thời khóa biểu từ Google Sheet
├── index.html               # Giao diện Web SPA chính (Form Đăng ký & Tra cứu Lịch)
├── css/
│   ├── main.css             # Design Tokens & CSS Reset & Global Layout
│   └── components.css       # Style cho Multi-select grid, Dropdown, Modal, Toast
├── js/
│   ├── config.js            # Cấu hình API, Ca học & State hệ thống
│   ├── form.js              # Logic chọn nhiều ca học, validation & submit form
│   ├── schedule.js          # Logic tra cứu & hiển thị lịch từ Google Sheet
│   └── app.js               # Router, chuyển Tab & Theme switcher
├── google-apps-script.js    # Code Google Apps Script dán vào Google Sheet (2-Way Webhook)
├── .env.example             # Mẫu cấu hình Vercel Environment Variables
├── vercel.json              # File cấu hình Routing Vercel
├── package.json             # File thông tin gói dự án
└── README.md                # Hướng dẫn chi tiết
```

---

## 🚀 Hướng dẫn Đẩy Code lên GitHub & Deploy Vercel

### Bước 1: Khởi tạo và PUSH Code lên GitHub Repo của bạn
Mở Terminal tại thư mục dự án và chạy các lệnh:

```bash
git init
git add .
git commit -m "Initial commit: Website dang ky lich hoc 2-way Google Sheet"
git branch -M main
git remote add origin https://github.com/trangtan25-svg/dangkytheodoilichhoc.git
git push -u origin main
```

---

### Bước 2: Cấu hình Google Apps Script (Webhook 2 Chiều)

1. Mở file Google Sheet với ID: `1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA`  
   (Hoặc URL: `https://docs.google.com/spreadsheets/d/1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA/edit`)
2. Vào **Tiện ích mở rộng (Extensions)** &rarr; **Apps Script**.
3. Mở file `google-apps-script.js` trong thư mục code dự án này, copy toàn bộ nội dung và dán vào Apps Script.
4. Bấm **Lưu (Ctrl + S)**.
5. Bấm nút **Triển khai (Deploy)** ở góc trên bên phải &rarr; **Thực thi dưới dạng ứng dụng web (New deployment -> Web App)**:
   - **Mô tả**: *Dang ky lich hoc Webhook*
   - **Thực thi dưới dạng (Execute as)**: *Tôi (Me)*
   - **Ai có quyền truy cập (Who has access)**: *Bất kỳ ai (Anyone)*
6. Bấm **Triển khai**. Copy đường dẫn **Web App URL** nhận được (có dạng `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Bước 3: Deploy lên Vercel & Cấu hình Environment Variables

1. Đăng nhập [Vercel.com](https://vercel.com) và chọn **Add New... &rarr; Project**.
2. Chọn Repository **`trangtan25-svg/dangkytheodoilichhoc`** vừa đẩy lên GitHub.
3. Kéo xuống mục **Environment Variables** và thêm các biến môi trường sau:

| Name | Value | Mô tả |
| :--- | :--- | :--- |
| `GOOGLE_SHEET_ID` | `1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA` | ID của Google Sheet target |
| `GOOGLE_SCRIPT_URL` | `https://script.google.com/macros/s/.../exec` | URL Web App lấy ở Bước 2 |

4. Bấm nút **Deploy**! Vercel sẽ tự động build và cấp cho bạn một đường dẫn trang web chính thức (ví dụ: `https://dangkytheodoilichhoc.vercel.app`).

---

## 🛠️ Chạy ứng dụng tại máy cục bộ (Local Testing)

Bạn chỉ cần mở trực tiếp file `index.html` trong trình duyệt hoặc sử dụng extension Live Server trong VS Code để xem và trải nghiệm ứng dụng ngay tức thì!

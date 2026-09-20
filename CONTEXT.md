# Domain context

## Access control glossary

- **User** — บัญชีบุคคลที่เข้าสู่ workspace และมี role หนึ่งค่า
- **Role** — กลุ่มสิทธิ์มาตรฐานของผู้ใช้: Admin, Manager หรือ Member
- **Permission** — ความสามารถเชิงระบบหนึ่งรายการ เช่น จัดการ project หรือบันทึกเวลา
- **Role-permission assignment** — การกำหนดว่า role หนึ่งเปิดหรือปิด permission ใดใน RBAC matrix
- **Ownership scope** — ขอบเขตจากเจ้าของ resource เช่น Manager จัดการได้เฉพาะ project ที่ตนเป็น owner
- **Department scope** — ขอบเขตจากแผนก ใช้จำกัดการ assign งานระหว่างสมาชิก

Role-permission assignment เป็นด่านแรกของ authorization ส่วน ownership และ department scope เป็นกติกาธุรกิจที่ต้องตรวจต่อ ไม่ถือว่าการเปิด permission ทำให้ข้ามสองขอบเขตนี้ได้

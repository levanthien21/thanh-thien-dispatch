import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const users = await prisma.user.findMany();
    
    if (users.length === 0) {
      console.log("KHONG_CO_TAI_KHOAN");
      return;
    }

    // Tìm tài khoản ADMIN đầu tiên
    const admin = users.find(u => u.role === 'ADMIN') || users[0];
    
    // Tạo mật khẩu mới: Admin@123
    const newPassword = 'Admin@123';
    const hash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: hash }
    });

    console.log("THANH_CONG");
    console.log(`So_dien_thoai: ${admin.phone}`);
    console.log(`Mat_khau_moi: ${newPassword}`);

  } catch (error) {
    console.error("Loi:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();

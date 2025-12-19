import { superAdminEmail, superAdminPassword } from '../config';
import { userRoles } from '../modules/user/user.constant';
import { User } from '../modules/user/user.model';

const superAdmin = {
  name: 'Super Admin',
  bio: 'I am the super administrator',
  email: superAdminEmail,
  password: superAdminPassword,
  role: userRoles.super_admin,
  status: 'active',
  isDeleted: false,
};

const seedSuperAdmin = async () => {
  const existingUser = await User.findOne({
    email: superAdmin.email,
    role: superAdmin.role,
  });
  if (!existingUser) {
    await User.create(superAdmin);
  }
};

export default seedSuperAdmin;

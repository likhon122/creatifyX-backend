import bcrypt from 'bcryptjs';

const isPasswordMatched = async (
  planedPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(planedPassword, hashedPassword);
};
export default isPasswordMatched;

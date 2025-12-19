import jwt, { SignOptions } from 'jsonwebtoken';

const createJwtToken = (
  jwtPayload: { userId: string; role: string },
  jwtSecret: string,
  expiresIn: string
) => {
  const options = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };

  const token = jwt.sign(jwtPayload, jwtSecret, options);
  return `Bearer ${token}`;
};

export default createJwtToken;

import jwt from 'jsonwebtoken';

const verifyJwtToken = (token: string, secretKey: string) => {
  try {
    // Remove the "Bearer " prefix if it exists
    const tokenWithoutBearer = token.startsWith('Bearer ')
      ? token.slice(7)
      : token;
    const decoded = jwt.verify(tokenWithoutBearer, secretKey);
    return decoded as jwt.JwtPayload;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return null;
  }
};
export default verifyJwtToken;

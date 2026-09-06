import jwt from 'jsonwebtoken';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../utils/appError.js';
import { Types } from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_super_secret_key_change_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_super_secret_key_change_in_production';
const ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '15m';
const REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';

export interface ITokenPayload {
  userId: string;
  role: string;
}

export const generateAccessToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRATION as any });
};

export const generateRefreshToken = async (
  userId: string,
  role: string,
  parentToken?: string
): Promise<string> => {
  const token = jwt.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRATION as any });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days


  await RefreshToken.create({
    userId: new Types.ObjectId(userId),
    token,
    parentToken,
    expiresAt,
  });

  return token;
};

export const verifyAccessToken = (token: string): ITokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as ITokenPayload;
  } catch (error) {
    throw new AppError('Invalid or expired access token.', 401);
  }
};

export const rotateRefreshToken = async (
  oldTokenString: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const payload = jwt.verify(oldTokenString, JWT_REFRESH_SECRET) as ITokenPayload;
    const tokenRecord = await RefreshToken.findOne({ token: oldTokenString });

    // Detection of token reuse (breach)
    if (!tokenRecord || tokenRecord.isRevoked) {
      if (tokenRecord) {
        await RefreshToken.updateMany({ userId: tokenRecord.userId }, { isRevoked: true });
      } else {
        await RefreshToken.updateMany(
          { userId: new Types.ObjectId(payload.userId) },
          { isRevoked: true }
        );
      }
      throw new AppError(
        'Security Alert: Refresh token reuse detected. Revoking all sessions for this user.',
        401
      );
    }

    // Revoke the old token
    tokenRecord.isRevoked = true;
    await tokenRecord.save();

    // Generate new Access and Refresh tokens
    const accessToken = generateAccessToken({ userId: payload.userId, role: payload.role });
    const refreshToken = await generateRefreshToken(payload.userId, payload.role, oldTokenString);

    return { accessToken, refreshToken };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired session refresh token.', 401);
  }
};

export const revokeRefreshToken = async (tokenString: string): Promise<void> => {
  await RefreshToken.updateOne({ token: tokenString }, { isRevoked: true });
};

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await RefreshToken.updateMany({ userId: new Types.ObjectId(userId) }, { isRevoked: true });
};

import { Response } from 'express';

export const sendSuccess = (res: Response, data: any, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

export const sendPaginatedSuccess = (
  res: Response,
  data: any[],
  page: number,
  limit: number,
  totalItems: number,
  message = 'Success'
) => {
  const totalPages = Math.ceil(totalItems / limit);
  return res.status(200).json({
    status: 'success',
    message,
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

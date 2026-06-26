import { Response } from 'express'

export const sendSuccess = (res: Response, data: any, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() })
}

export const sendError = (res: Response, message: string, statusCode = 400, errors?: any) => {
  return res.status(statusCode).json({ success: false, message, errors, timestamp: new Date().toISOString() })
}

export const sendPaginated = (res: Response, data: any[], total: number, page: number, limit: number, message = 'Success') => {
  return res.json({
    success: true, message, data,
    pagination: { total, page, limit, pages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    timestamp: new Date().toISOString(),
  })
}

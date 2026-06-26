import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'

let io: Server

export const setupSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [process.env.FRONTEND_URL ?? 'http://localhost:8081', process.env.ADMIN_URL ?? 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      socket.data.userId = decoded.userId
      socket.data.role = decoded.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId
    logger.info(`Socket connected: ${socket.id} (user: ${userId})`)

    socket.join(`user:${userId}`)
    if (socket.data.role === 'admin') socket.join('admin')

    socket.on('join:application', (appId: string) => socket.join(`app:${appId}`))
    socket.on('leave:application', (appId: string) => socket.leave(`app:${appId}`))

    socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`))
  })

  return io
}

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

// Emit helpers
export const emitToUser = (userId: string, event: string, data: any) => getIO().to(`user:${userId}`).emit(event, data)
export const emitToAdmin = (event: string, data: any) => getIO().to('admin').emit(event, data)
export const emitToApp = (appId: string, event: string, data: any) => getIO().to(`app:${appId}`).emit(event, data)
export const emitBroadcast = (event: string, data: any) => getIO().emit(event, data)

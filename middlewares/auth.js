import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY

const prisma = new PrismaClient()

export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization
    if (!token) {
      return res.status(401).json({ message: "Access token required." })
    }

    const decoded = jwt.verify(token, JWT_SECRET_KEY)

    const user = await prisma.users.findUnique({
      where: {
        id: decoded.id,
      },
    })
    if (!user) {
      return res.status(401).json({ error: "Invalid token." })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

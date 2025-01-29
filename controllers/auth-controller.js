import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(422).json({
        message: "Please provide all the fields (name, email, password)",
      })
    }
    const hashedPassword = await bcrypt.hash(password, 10)

    if (await prisma.users.findUnique({ where: { email } })) {
      return res.status(409).json({ error: "User email already registered." })
    }

    const newUser = await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    return res.status(201).json({
      message: "User registered successfully.",
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res
        .status(422)
        .json({ message: "Please provide all the fields (email, password)" })
    }

    const user = await prisma.users.findUnique({
      where: {
        email,
      },
    })
    if (!user) {
      // Use 401 as 404 can give clues to attacker
      return res.status(401).json({ message: "Email or password is invalid." })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ message: "Email or password is invalid." })
    }

    // Generate JWT
    const payload = { id: user.id, email: user.email }
    const accessToken = jwt.sign(payload, JWT_SECRET_KEY, {
      subject: "Token to access API",
      expiresIn: "1h",
    })

    return res.status(200).json({
      message: "User logged in successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

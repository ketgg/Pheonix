import { PrismaClient } from "@prisma/client"
import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator"
import { Status } from "@prisma/client"

const config = {
  dictionaries: [adjectives, animals],
  separator: " ",
  style: "capital",
}

const prisma = new PrismaClient()

// Gets all the gadgets from the database
export const getGadgets = async (req, res) => {
  try {
    const { status } = req.query // For status filter /gadgets?status="..."

    let queryObj = {}
    if (status) {
      if (!Object.values(Status).includes(status)) {
        return res.status(400).json({
          error:
            "Invalid status. Must be one of: " +
            Object.values(Status).join(", "),
        })
      } else {
        queryObj.status = status
      }
    }

    const allGadgets = await prisma.gadgets.findMany({ where: queryObj })

    const gadgetsWithProbability = allGadgets.map((gadget) => {
      const successProbability = Math.floor(Math.random() * 100) + 1
      return {
        ...gadget,
        successProbability: `${successProbability}%`,
      }
    })

    return res.status(200).json({
      message: status
        ? `Gadgets with status '${status}' fetched successfully.`
        : "All gadgets fetched successfully.",
      count: gadgetsWithProbability.length,
      gadgets: gadgetsWithProbability,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

// Creates a new gadget with unique random name, and status as "Available"
export const createGadget = async (req, res) => {
  try {
    const newGadgetName = uniqueNamesGenerator(config)
    const newGadget = await prisma.gadgets.create({
      data: {
        name: newGadgetName,
        status: "Available",
      },
    })
    return res
      .status(201)
      .json({ message: "Gadget created successfully.", newGadget })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

// Update the information(name, status) associated with the gadget
export const updateGadget = async (req, res) => {
  try {
    const { id } = req.params
    const { name, status } = req.body

    const gadget = await prisma.gadgets.findUnique({ where: { id } })
    if (!gadget) {
      return res.status(404).json({ error: "Gadget not found." })
    }
    if (gadget.status === Status.Destroyed) {
      return res
        .status(400)
        .json({ error: "Gadget is destroyed! It can't be updated." })
    }

    if (!name && !status) {
      return res.status(422).json({
        error: "Please provide at least one field (name or status) to update.",
      })
    }

    if (status && !Object.values(Status).includes(status)) {
      return res.status(400).json({ error: "Invalid status value." })
    }

    if (name) {
      const existingGadget = await prisma.gadgets.findUnique({
        where: { name },
      })
      if (existingGadget) {
        return res.status(409).json({ error: "Gadget name must be unique." })
      }
    }

    const data = {}

    if (name) data.name = name
    if (status) {
      data.status = status
      // Set decommissionedAt if status is Decommissioned
      if (status === Status.Decommissioned) {
        data.decommissionedAt = new Date()
      } else if (
        gadget.status === Status.Decommissioned &&
        status !== Status.Decommissioned
      ) {
        // Reset decommissionedAt to null
        data.decommissionedAt = null
      }
    }

    const updatedGadget = await prisma.gadgets.update({
      where: { id },
      data,
    })

    return res
      .status(200)
      .json({ message: "Gadget updated successfully.", gadget: updatedGadget })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

// Delete to gadget i.e., set the status to "Decommisioned"
export const deleteGadget = async (req, res) => {
  const { id } = req.params
  try {
    const gadget = await prisma.gadgets.findUnique({ where: { id } })
    if (!gadget) {
      return res.status(404).json({ error: "Gadget not found." })
    }
    if (gadget.status === Status.Destroyed) {
      return res.status(400).json({
        error: "Gadget is already destroyed! It can't be decommissioned.",
      })
    }
    if (gadget.status === Status.Decommissioned) {
      return res
        .status(400)
        .json({ error: "Gadget is already decommissioned." })
    }

    const decommissionedGadget = await prisma.gadgets.update({
      where: { id },
      data: {
        status: Status.Decommissioned,
        decommissionedAt: new Date(),
      },
    })

    return res.status(200).json({
      message: "Gadget decommissioned successfully.",
      gadget: decommissionedGadget,
    })
  } catch (error) {
    return res.status(500).json({ error: error })
  }
}

// Simulate storing of confirmation codes for self-destruction
const pendingDestructions = new Map()

export const initGadgetDestruction = async (req, res) => {
  const { id } = req.params
  try {
    const gadget = await prisma.gadgets.findUnique({ where: { id } })
    if (!gadget) {
      return res.status(404).json({ error: "Gadget not found." })
    }
    if (gadget.status === Status.Destroyed) {
      return res.status(400).json({ error: "Gadget is already destroyed." })
    }

    // Random 6-digit confirmation code
    const confirmationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString()
    // Store the confirmation code mapped to the id of the gadget
    pendingDestructions.set(id, {
      code: confirmationCode,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0, // We will allow maximum 3 attempts
    })
    // For simulation we are sending the code in response
    return res.status(200).json({
      message:
        "Gadget destruction has been initiated. Please confirm your code.",
      confirmationCode,
      expiresIn: "5 minutes",
    })
  } catch (error) {
    return res.status(500).json({ error: error })
  }
}

// For confirming the gadget destruction using the code that was sent above
export const confirmGadgetDestruction = async (req, res) => {
  const { id } = req.params
  const { confirmationCode } = req.body
  try {
    // Check if destruction has been initiated or not
    const destruction = pendingDestructions.get(id)
    if (!destruction) {
      return res.status(404).json({
        error:
          "No pending destruction request found or the request has expired.",
      })
    }

    if (!confirmationCode) {
      return res.status(400).json({
        error: "Please provide the confirmation code.",
      })
    }

    if (Date.now() > destruction.expires) {
      pendingDestructions.delete(id)
      return res.status(400).json({
        error:
          "Confirmation code has expired. Please initiate a new destruction request.",
      })
    }

    // Check number of attempts
    destruction.attempts += 1
    if (destruction.attempts > 3) {
      pendingDestructions.delete(id)
      return res.status(400).json({
        error:
          "Too many failed attempts. Please initiate a new destruction request.",
      })
    }

    // Verify code
    if (destruction.code !== confirmationCode) {
      return res.status(400).json({
        error: "Invalid confirmation code.",
        remainingAttempts: 3 - destruction.attempts,
      })
    }

    // Code is valid, delete the gadget
    const gadget = await prisma.gadgets.findUnique({ where: { id } })
    if (!gadget) {
      return res.status(404).json({ error: "Gadget not found." })
    }
    // Set the status to destroyed
    const destroyedGadget = await prisma.gadgets.update({
      where: { id },
      data: {
        status: Status.Destroyed,
        destroyedAt: new Date(),
      },
    })
    pendingDestructions.delete(id)

    return res.status(200).json({
      message: "Gadget has been successfully destroyed.",
      destroyedGadget,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

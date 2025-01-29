import { Router } from "express"
import {
  getGadgets,
  createGadget,
  updateGadget,
  deleteGadget,
  initGadgetDestruction,
  confirmGadgetDestruction,
} from "../controllers/gadgets-controller.js"
import { authenticateToken } from "../middlewares/auth.js"

const router = Router()

router.get("/", getGadgets)

router.post("/", authenticateToken, createGadget)
router.patch("/:id", authenticateToken, updateGadget)
router.delete("/:id", authenticateToken, deleteGadget)

router.post("/:id/self-destruct", authenticateToken, initGadgetDestruction)
router.post(
  "/:id/confirm-destruct",
  authenticateToken,
  confirmGadgetDestruction
)

export const GadgetsRouter = router

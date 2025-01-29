import { Router } from "express"
import {
  getGadgets,
  createGadget,
  updateGadget,
  deleteGadget,
  initGadgetDestruction,
  confirmGadgetDestruction,
} from "../controllers/gadgets-controller.js"

const router = Router()

router.get("/", getGadgets)
router.post("/", createGadget)
router.patch("/:id", updateGadget)
router.delete("/:id", deleteGadget)

router.post("/:id/self-destruct", initGadgetDestruction)
router.post("/:id/confirm-destruct", confirmGadgetDestruction)

export const GadgetsRouter = router

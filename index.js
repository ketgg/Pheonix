import express from "express"
import { GadgetsRouter } from "./routes/gadgets-route.js"

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.use("/gadgets", GadgetsRouter)

app.listen(3000, () => console.log("Server started at PORT:", PORT))

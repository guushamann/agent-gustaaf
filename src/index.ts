import "./env";
import express from "express";
const app = express();
app.use(express.json());
const port = 3000;

import { setupTransport } from "./transport";
import { setupAdmin } from "./admin";
import { requireApiKey } from "./auth";

setupAdmin(app);
app.use("/api", requireApiKey);
setupTransport(app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

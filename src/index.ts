import "./env";
import express from "express";
const app = express();
app.use(express.json());
const port = 3000;

import { setupTransport } from "./transport";

setupTransport(app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

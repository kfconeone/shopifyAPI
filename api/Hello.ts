import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");

const serviceAccount: admin.ServiceAccount = {
  projectId: process.env.project_id,
  clientEmail: process.env.client_email,
  privateKey: process.env.private_key,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default async (request: VercelRequest, response: VercelResponse) => {
  const db = admin.firestore();
  try {
    console.log(request.body);
    for (let i = 0; i < 3; i++) {
      await db
        .collection("products")
        .doc("gg" + i)
        .set({ name: "gg" + i });
    }
  } catch (e) {
    console.log(e);
  }

  response.status(200).send("Hello World!");
};

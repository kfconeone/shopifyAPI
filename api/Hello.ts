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
  const product = await db
    .collection("products")
    .doc("gidshopifyProductVariant40048940384298")
    .get();
  console.log(product.data());

  response.status(200).send("Hello World!");
};

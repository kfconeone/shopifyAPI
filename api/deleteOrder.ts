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
  // console.log(request);
  const db = admin.firestore();
  await db
    .collection("orders")
    .doc(
      request.body["admin_graphql_api_id"].replace(/\:/g, "").replace(/\//g, "")
    )
    .delete();

  response.status(200).send("Hello World!");
};

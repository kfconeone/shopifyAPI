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
  if (request.method == "OPTIONS") {
    response.status(200);
  } else {
    console.log(request.body);
    let result = await getAllDownlines(request.body.parentSuffix);
    response.status(200).send(result);
  }
};

async function getAllDownlines(parentSuffix: string) {
  const db = admin.firestore();
  let q = await db.collection("members").where("verifiedStatus", "==", 1).get();
  let downlines: any[] = [];

  q.forEach((doc) => {
    if (doc.data().ancestors.includes(parentSuffix)) downlines.push(doc.data());
  });

  return downlines;
}

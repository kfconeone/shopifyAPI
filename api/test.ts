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
  if (request.method == "OPTIONS") {
    response.status(200).send("OPTIONS");
  } else {
    console.log(request.body);
    let result = await getAllMembers(request.body.parentSuffix);
    response.status(200).send(result);
  }
};

async function getAllMembers(parentSuffix: string) {
  const db = admin.firestore();
  let allMembers: any = {};
  let allMembersQuery = await db.collection("members").get();
  allMembersQuery.forEach((doc: any) => {
    allMembers[doc.data().urlsuffix] = doc.data();
  });

  return allMembers;
}

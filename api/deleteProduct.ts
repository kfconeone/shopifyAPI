import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");
import moment = require("moment");

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

  console.log(request.body);

  const db = admin.firestore();

  let q = await db
    .collection("products")
    .where("pid", "==", `gid://shopify/Product/${request.body.id}`)
    .get();

  let deleteIds: string[] = [];
  q.forEach((doc) => {
    deleteIds.push(doc.id);
  });

  let promises = [];
  for (let i in deleteIds) {
    promises.push(db.collection("products").doc(deleteIds[i]).delete());
  }

  promises.push(
    db.collection("systems").doc("products").set({
      lastUpdatedDatetime: moment().valueOf(),
    })
  );

  await Promise.all(promises);

  response.status(200).send("Hello World!");
};

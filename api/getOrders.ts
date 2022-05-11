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
  console.log(request);

  console.log(request.body);
  let result = await getOrdersByDateRanges(
    request.body.startDate,
    request.body.endDate,
    request.body.urlsuffixs
  );
  response.status(200).json(result);
};

async function getOrdersByDateRanges(
  startDate: number,
  endDate: number,
  urlsuffixs: string[]
) {
  const db = admin.firestore();

  let result: any = [];
  let q = await db
    .collection("orders")
    .where("createdAt", ">=", startDate)
    .where("createdAt", "<=", endDate)
    .get();

  let orders: any = [];
  q.forEach((doc) => {
    orders.push(doc.data());
  });

  orders = orders.filter((o: any) => {
    return urlsuffixs.includes(o.urlsuffix);
  });

  return result;
}

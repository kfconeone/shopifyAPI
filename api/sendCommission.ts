import type { VercelRequest, VercelResponse } from "@vercel/node";
import moment from "moment";

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
  if (request.method === "OPTIONS") {
    response.status(200).send("Hello World!");
    return;
  }
  let data = request.body;
  console.log("data:", data);
  try {
    await sendCom(data.amount, data.receiver, data.sender);
  } catch (error) {
    console.log(error);
  }
  response.status(200).send("Hello World!");
};

async function sendCom(amount: any, receiver: any, sender: any) {
  const db = admin.firestore();
  if (amount < 1) {
    console.log("amount is less than 1");
    return;
  }

  let senderQuery = await db.collection("members").where("account", "==", sender).get();
  if (senderQuery.empty) {
    console.log("sender not found");
    return;
  }
  let senderRole = "";
  senderQuery.forEach((doc: any) => {
    senderRole = doc.data().role;
  });
  if (senderRole !== "sub" && senderRole !== "admin") {
    console.log("sender not sub or admin");
    console.log("sender is :", senderRole);
    return;
  }
  console.log("sender is :", senderRole);

  let receiverQuery = await db.collection("members").where("urlsuffix", "==", receiver).get();
  if (receiverQuery.empty) {
    console.log("receiver not found");
    return;
  }
  let receiverData: any = {};
  receiverQuery.docs.forEach((d) => {
    receiverData = { docId: d.id, ...d.data() };
  });
  console.log("receiverData:", receiverData);

  receiverData.totalCommission - receiverData.receivedCommission - amount >= 0 ? console.log("ok") : console.log("not ok");

  if (receiverData.totalCommission - receiverData.receivedCommission - amount >= 0) {
    try {
      let beforeReceiverCommission = receiverData.receivedCommission;
      let updatetime = moment().valueOf();
      let sendCommission = {
        beforeReceiverCommission: beforeReceiverCommission,
        amount: amount,
        datetime: updatetime,
        receiver: receiver,
        sender: sender,
      };
      db.collection("members")
        .doc(receiverData.docId)
        .update({ receivedCommission: beforeReceiverCommission + amount });
      db.collection("records").add(sendCommission);
    } catch (error) {
      console.log(error);
    }
  } else {
    console.log("餘額不足");
    return;
  }
}

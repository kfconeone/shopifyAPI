import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");
import moment = require("moment");
import _ from "lodash";

const serviceAccount: admin.ServiceAccount = {
  projectId: process.env.project_id,
  clientEmail: process.env.client_email,
  privateKey: process.env.private_key,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

export default async (request: VercelRequest, response: VercelResponse) => {
  try {
    // console.log(request);
    if (request.method === "OPTIONS") {
      response.status(200).send("Hello World!");
      return;
    }
    let currentMember: any = {};

    let q = await db.collection("members").where("urlsuffix", "==", request.body.urlsuffix).get();

    q.forEach((doc: any) => {
      currentMember = doc.data();
      currentMember["docId"] = doc.id;
    });

    let currentDatetime = moment();

    let startDate = currentMember.lastCommissionDatetime == undefined ? 0 : currentMember.lastCommissionDatetime;
    let endDate = currentDatetime.add(-5, "minutes").valueOf();

    let totalCommission = currentMember.totalCommission == undefined ? 0 : currentMember.totalCommission;
    let receivedCommission = currentMember.receivedCommission == undefined ? 0 : currentMember.receivedCommission;

    console.log(1);
    if (moment(endDate).diff(startDate, "minutes") > 0) {
      let totalOrderSumByDateRanges = await getAllMyOrderSumByDateRange(startDate, endDate, request.body.urlsuffix);

      totalCommission += totalOrderSumByDateRanges;

      await db.collection("members").doc(currentMember.docId).update({
        lastCommissionDatetime: endDate,
        totalCommission: totalCommission,
        receivedCommission: receivedCommission,
      });
    }
    response.status(200).send({
      lastCommissionDatetime: endDate,
      totalCommission: totalCommission,
      receivedCommission: receivedCommission,
    });
  } catch (error) {
    response.status(200).send({ status: "100" });
    console.log(error);
    return;
  }
};

async function getAllMyOrderSumByDateRange(startDate: number, endDate: number, urlsuffix: string) {
  let db = admin.firestore();
  let q = await db.collection("orders").where("createdAt", ">=", startDate).where("createdAt", "<=", endDate).get();

  let orders: any[] = [];
  q.forEach((doc) => {
    orders.push(doc.data());
  });

  orders = orders
    .filter((o) => {
      return Object.keys(o.totalCommissions).includes(urlsuffix) && o.fullyPaid;
    })
    .map((o) => o.totalCommissions[urlsuffix]);

  return _.sum(orders);
}

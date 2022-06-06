import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin = require("firebase-admin");
import _ from "lodash";

const serviceAccount: admin.ServiceAccount = {
  projectId: process.env.project_id,
  clientEmail: process.env.client_email,
  privateKey: process.env.private_key,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default async (request: VercelRequest, response: VercelResponse) => {
  console.log(request.body);

  try {
    if (request.method === "POST") {
      let allowColumns: string[] = [
        "isAgentProduct",
        "instaId",
        "isInGroup",
        "kolname",
        "lastLoginDatetime",
        "lineid",
        "nickname",
        "password",
        "phonenumber",
        "verifiedStatus",
        "commissionPercentage",
        "docId",
      ];

      if (_.without(Object.keys(request.body), ...allowColumns).length > 0) {
        response
          .status(200)
          .send({ status: "001", message: "存在不可修改的欄位" });
        return;
      } else {
        let db = admin.firestore();
        db.collection("members").doc(request.body.docId).update(request.body);
        response.status(200).send({ status: "000" });
      }
    } else {
      response.status(200).send("");
    }
  } catch (error) {
    console.log(error);
  }
};

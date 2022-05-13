//退款模板
// {
//   id: 834000617514,
//   order_id: 4247336419370, //這個是我們要的訂單編號, 在firestore的document id 為gidshopifyOrder4247336419370
//   created_at: '2022-04-18T09:55:43+08:00',
//   note: '',
//   user_id: 73879257130,
//   processed_at: '2022-04-18T09:55:43+08:00',
//   restock: false,
//   duties: [],
//   total_duties_set: {
//     shop_money: { amount: '0.00', currency_code: 'TWD' },
//     presentment_money: { amount: '0.00', currency_code: 'TWD' }
//   },
//   admin_graphql_api_id: 'gid://shopify/Refund/834000617514',
//   refund_line_items: [],
//   transactions: [
//     {
//       id: 5275310850090,
//       order_id: 4247336419370,
//       kind: 'refund',
//       gateway: 'bogus',
//       status: 'success',
//       message: 'Bogus Gateway: Forced success',
//       created_at: '2022-04-18T09:55:43+08:00',
//       test: true,
//       authorization: null,
//       location_id: null,
//       user_id: 73879257130,
//       parent_id: 5271264133162,
//       processed_at: '2022-04-18T09:55:43+08:00',
//       device_id: null,
//       error_code: null,
//       source_name: '1830279',
//       payment_details: [Object],
//       receipt: [Object],
//       amount: '300.00',
//       currency: 'TWD',
//       admin_graphql_api_id: 'gid://shopify/OrderTransaction/5275310850090'
//     }
//   ],
//   order_adjustments: [
//     {
//       id: 191202033706,
//       order_id: 4247336419370,
//       refund_id: 834000617514,
//       amount: '-300.00',
//       tax_amount: '0.00',
//       kind: 'refund_discrepancy',
//       reason: 'Refund discrepancy',
//       amount_set: [Object],
//       tax_amount_set: [Object]
//     }
//   ]
// }

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
  let orderId = `gidshopifyOrder${request.body.order_id}`;
  const db = admin.firestore();

  let promises = [];
  promises.push(
    db.collection("orders").doc(orderId).update({
      fullyPaid: false,
    })
  );

  promises.push(
    db.collection("systems").doc("orders").set({
      lastUpdateDatetime: moment().valueOf(),
    })
  );

  await Promise.all(promises);

  response.status(200);
};
